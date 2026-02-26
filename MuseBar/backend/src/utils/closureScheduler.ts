import { pool } from '../app';
import { LegalJournalModel } from '../models/legalJournal';
import { AuditTrailModel } from '../models/auditTrail';
import moment from 'moment-timezone';

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

  // Check if closure should be executed
  static async checkAndExecuteClosure() {
    try {
      const settings = await this.getClosureSettings();

      if (!settings.auto_closure_enabled) {
        return;
      }

      // All date logic uses Paris time — the system is France-only.
      const nowParis = moment.tz(new Date(), settings.timezone);
      const todayParis = nowParis.format('YYYY-MM-DD'); // Paris calendar date

      // Check if today's business day has already been closed.
      // DATE(period_start) is evaluated in Paris time via the pool timezone setting.
      const closureQuery = `
        SELECT id FROM closure_bulletins
        WHERE closure_type = 'DAILY'
        AND DATE(period_start AT TIME ZONE 'Europe/Paris') = $1
        AND is_closed = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const closureResult = await pool.query(closureQuery, [todayParis]);

      if (closureResult.rows.length > 0) {
        return;
      }

      const shouldClose = await this.shouldExecuteClosure(settings, nowParis);

      if (shouldClose) {
        await this.executeAutomaticClosure(nowParis.toDate());
      }

    } catch (error) {
      throw error;
    }
  }

  // Get closure settings from database
  static async getClosureSettings() {
    const query = 'SELECT setting_key, setting_value FROM closure_settings';
    const result = await pool.query(query);
    
    const settings: { [key: string]: string } = {};
    result.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    return {
      auto_closure_enabled: settings.auto_closure_enabled === 'true',
      daily_closure_time: settings.daily_closure_time || '02:00',
      timezone: settings.timezone || 'Europe/Paris',
      grace_period_minutes: parseInt(settings.closure_grace_period_minutes || '30')
    };
  }

  // Determine if closure should be executed.
  // nowParis must be a moment-timezone object in Europe/Paris.
  static async shouldExecuteClosure(settings: any, nowParis: moment.Moment) {
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

  // Execute automatic closure
  static async executeAutomaticClosure(now: Date) {
    try {
      // Fetch closure settings
      const settings = await this.getClosureSettings();
      const closureTime = settings.daily_closure_time || '02:00';
      const timezone = settings.timezone || 'Europe/Paris';

      // Determine which business day to close
      // If closure time is in the AM and now is after closure time, close previous day
      const nowTz = moment.tz(now, timezone);
      const closureHour = parseInt(closureTime.split(':')[0], 10);
      let businessDay = nowTz.clone();
      if (closureHour < 12 && nowTz.hour() < closureHour) {
        // Before closure time, close previous day
        businessDay = businessDay.subtract(1, 'day');
      }
      businessDay.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

      // Create closure bulletin for the correct business day
      const closureBulletin = await LegalJournalModel.createDailyClosure(businessDay.toDate());
      
      // Log the automatic closure
      await AuditTrailModel.logAction({
        action_type: 'AUTO_CLOSURE_EXECUTED',
        resource_type: 'CLOSURE_BULLETIN',
        resource_id: closureBulletin.id.toString(),
        action_details: {
          closure_type: 'DAILY',
          period_start: businessDay.toISOString(),
          transaction_count: closureBulletin.total_transactions,
          total_amount: closureBulletin.total_amount,
          closure_time: now.toISOString(),
          trigger: 'AUTOMATIC'
        },
        ip_address: 'system',
        user_agent: 'ClosureScheduler'
      });

      // Automatic closure completed successfully
      
      return closureBulletin;
      
    } catch (error) {
      // Failed to execute automatic closure
      
      await AuditTrailModel.logAction({
        action_type: 'AUTO_CLOSURE_FAILED',
        action_details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
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