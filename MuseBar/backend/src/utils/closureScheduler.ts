import { pool } from '../app';
import { DEFAULT_APP_TIMEZONE } from '../config/timezone';
import { LegalJournalModel } from '../models/legalJournal';
import { AuditTrailModel } from '../models/auditTrail';
import moment from 'moment-timezone';
import { runWithTenantContext } from '../db/tenantContext';

export class ClosureScheduler {
  private static interval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  // Start the scheduler
  static async start() {
    if (this.isRunning) {
      // Closure scheduler already running
      return;
    }

    this.isRunning = true;
    // Starting automatic closure scheduler

    // Check every 5 minutes
    this.interval = setInterval(async () => {
      try {
        await this.checkAndExecuteClosure();
      } catch (error) {
        // Error in closure scheduler
        await AuditTrailModel.logAction({
          action_type: 'AUTO_CLOSURE_ERROR',
          action_details: { error: error instanceof Error ? error.message : 'Unknown error' },
          ip_address: 'system',
          user_agent: 'ClosureScheduler'
        });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Closure scheduler started
  }

  // Stop the scheduler
  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    // Closure scheduler stopped
  }

  // Check if closure should be executed (runs per-establishment for multi-tenancy).
  static async checkAndExecuteClosure() {
    try {
      const now = new Date();
      const establishmentsResult = await pool.query('SELECT id FROM establishments');
      const establishmentIds: string[] = establishmentsResult.rows.map((r: { id: string }) => r.id);

      for (const establishmentId of establishmentIds) {
        await runWithTenantContext({ establishmentId }, async () => {
          const settings = await this.getClosureSettings(establishmentId);
          if (!settings.auto_closure_enabled) return;

          const nowTz = moment.tz(now, settings.timezone);
          const shouldClose = await this.shouldExecuteClosure(settings, nowTz);
          if (!shouldClose) return;

          await this.executeAutomaticClosureForEstablishment(establishmentId, now);
        });
      }
    } catch (error) {
      throw error;
    }
  }

  // Get closure settings from database.
  // Supports both legacy global settings and per-establishment settings.
  static async getClosureSettings(establishmentId: string) {
    let result;
    try {
      result = await pool.query(
        'SELECT setting_key, setting_value FROM closure_settings WHERE establishment_id = $1',
        [establishmentId]
      );
    } catch {
      // Legacy closure_settings without establishment_id column.
      result = await pool.query('SELECT setting_key, setting_value FROM closure_settings');
    }
    
    const settings: { [key: string]: string } = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    return {
      auto_closure_enabled: settings.auto_closure_enabled === 'true',
      daily_closure_time: settings.daily_closure_time || '02:00',
      timezone: settings.timezone || DEFAULT_APP_TIMEZONE,
      grace_period_minutes: parseInt(settings.closure_grace_period_minutes || '30')
    };
  }

  // Determine if closure should be executed.
  // nowParis must be a moment-timezone object in Europe/Paris.
  static async shouldExecuteClosure(
    settings: { daily_closure_time: string; grace_period_minutes: number },
    nowParis: moment.Moment
  ) {
    const [hours, minutes] = settings.daily_closure_time.split(':').map(Number);

    // Build the target closure time for today in Paris — safe across DST transitions.
    const targetParis = nowParis.clone().set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

    if (nowParis.isSameOrAfter(targetParis)) {
      const timeDiffMs = nowParis.diff(targetParis);
      const gracePeriodMs = settings.grace_period_minutes * 60 * 1000;
      return timeDiffMs <= gracePeriodMs;
    }

    return false;
  }

  // Execute automatic closure for one establishment.
  static async executeAutomaticClosureForEstablishment(establishmentId: string, now: Date) {
    try {
      const settings = await this.getClosureSettings(establishmentId);
      const closureTime = settings.daily_closure_time || '02:00';
      const timezone = settings.timezone || DEFAULT_APP_TIMEZONE;

      const nowTz = moment.tz(now, timezone);
      const closureHour = parseInt(closureTime.split(':')[0], 10);
      let businessDay = nowTz.clone();
      if (closureHour < 12 && nowTz.hour() < closureHour) {
        businessDay = businessDay.subtract(1, 'day');
      }
      businessDay.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
      const businessDayDate = businessDay.toDate();

      let closureBulletin;
      try {
        closureBulletin = await LegalJournalModel.createDailyClosure(businessDayDate, establishmentId, timezone);
      } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
          return null;
        }
        throw err;
      }

      await AuditTrailModel.logAction({
        action_type: 'AUTO_CLOSURE_EXECUTED',
        resource_type: 'CLOSURE_BULLETIN',
        resource_id: closureBulletin.id.toString(),
        action_details: {
          closure_type: 'DAILY',
          establishment_id: establishmentId,
          period_start: businessDay.toISOString(),
          transaction_count: closureBulletin.total_transactions,
          total_amount: closureBulletin.total_amount,
          closure_time: now.toISOString(),
          trigger: 'AUTOMATIC'
        },
        ip_address: 'system',
        user_agent: 'ClosureScheduler'
      });

      return { establishmentId, bulletinId: closureBulletin.id };
      
    } catch (error) {
      // Failed to execute automatic closure
      
      await AuditTrailModel.logAction({
        action_type: 'AUTO_CLOSURE_FAILED',
        action_details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          establishment_id: establishmentId,
          closure_time: now.toISOString()
        },
        ip_address: 'system',
        user_agent: 'ClosureScheduler'
      });
      
      throw error;
    }
  }

  // Get scheduler status
  static getStatus() {
    return {
      is_running: this.isRunning,
      has_interval: this.interval !== null,
      next_check: this.interval ? 'Every 5 minutes' : 'Not scheduled'
    };
  }

  // Manual trigger for testing
  static async triggerManualCheck() {
    // Manual closure check triggered
    await this.checkAndExecuteClosure();
  }
} 