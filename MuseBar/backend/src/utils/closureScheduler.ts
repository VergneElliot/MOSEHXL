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
      console.log('⏰ Closure scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🕐 Starting automatic closure scheduler...');

    // Check every 5 minutes
    this.interval = setInterval(async () => {
      try {
        await this.checkAndExecuteClosure();
      } catch (error) {
        console.error('❌ Error in closure scheduler:', error);
        await AuditTrailModel.logAction({
          action_type: 'AUTO_CLOSURE_ERROR',
          action_details: { error: error instanceof Error ? error.message : 'Unknown error' },
          ip_address: undefined, // Fixed: use undefined instead of null for TypeScript compatibility
          user_agent: 'ClosureScheduler'
        });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    console.log('✅ Closure scheduler started');
  }

  // Stop the scheduler
  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Closure scheduler stopped');
  }

  // Check if closure should be executed
  static async checkAndExecuteClosure() {
    try {
      // Get closure settings
      const settings = await this.getClosureSettings();
      
      // Check if auto-closure is enabled
      if (!settings.auto_closure_enabled) {
        return;
      }

      const now = new Date();

      // Determine which business day we might need to close
      const businessDay = this.calculateBusinessDayToClose(now, settings.daily_closure_time, settings.timezone);

      // Use configured timezone to compute the business day string
      const businessDayStr = moment.tz(businessDay, settings.timezone || 'Europe/Paris').format('YYYY-MM-DD');

      // Acquire an advisory lock to avoid duplicate closures across multiple instances
      const key1 = 0xC10; // arbitrary namespace for closures
      const key2 = parseInt(moment.tz(businessDay, settings.timezone || 'Europe/Paris').format('YYYYMMDD'), 10);
      const lockResult = await pool.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [key1, key2]);
      const gotLock = lockResult.rows?.[0]?.locked === true;

      if (!gotLock) {
        // Another instance is handling this business day
        return;
      }

      try {
        // Check if this business day has already been closed
        const existingClosureQuery = `
          SELECT 1 FROM closure_bulletins 
          WHERE closure_type = 'DAILY' 
          AND DATE(period_start) = $1
          AND is_closed = TRUE
          LIMIT 1
        `;
        const existingResult = await pool.query(existingClosureQuery, [businessDayStr]);
        if (existingResult.rows.length > 0) {
          return;
        }

        // Check if it's time to close
        const shouldClose = this.shouldExecuteClosure(settings, now, businessDay);
        if (shouldClose) {
          console.log(`🔒 Executing automatic daily closure for business day ${businessDayStr}...`);
          await this.executeAutomaticClosure(now, businessDay);
        }
      } finally {
        await pool.query('SELECT pg_advisory_unlock($1, $2)', [key1, key2]);
      }
      
    } catch (error) {
      console.error('❌ Error checking closure conditions:', error);
      throw error;
    }
  }

  // Calculate which business day should be closed based on current time
  private static calculateBusinessDayToClose(now: Date, closureTime: string, timezone: string): Date {
    const [hours, minutes] = closureTime.split(':').map(Number);
    const nowTz = moment.tz(now, timezone);
    
    // Create closure time for today
    const todayClosureTime = nowTz.clone().set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    
    // If current time is past today's closure time, we should close "yesterday's" business day
    // Example: If it's 2:05 AM on July 30th, we should close business day July 29th
    if (nowTz.isAfter(todayClosureTime)) {
      // We're past closure time, so close the business day that just ended
      return nowTz.clone().subtract(1, 'day').startOf('day').toDate();
    } else {
      // We're before closure time, so close the previous business day
      return nowTz.clone().subtract(2, 'day').startOf('day').toDate();
    }
  }

  // Determine if closure should be executed
  static shouldExecuteClosure(settings: any, now: Date, businessDayToClose: Date): boolean {
    const [hours, minutes] = settings.daily_closure_time.split(':').map(Number);
    const timezone = settings.timezone || 'Europe/Paris';
    const gracePeriodinMinutes = parseInt(settings.grace_period_minutes) || 30; // Default 30 minutes grace period
    
    const nowTz = moment.tz(now, timezone);
    
    // Calculate when the closure should have happened for this business day
    // Business day July 29th should close at July 30th 2:00 AM
    const businessDayEnd = moment.tz(businessDayToClose, timezone)
      .add(1, 'day')
      .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    
    // Check if we're within the grace period after the intended closure time
    const timeSinceClosureTime = nowTz.diff(businessDayEnd, 'minutes');
    
    // Execute if we're past closure time but within grace period
    return timeSinceClosureTime >= 0 && timeSinceClosureTime <= gracePeriodinMinutes;
  }

  // Execute automatic closure
  static async executeAutomaticClosure(now: Date, businessDayToClose?: Date) {
    try {
      // Fetch closure settings
      const settings = await this.getClosureSettings();
      const closureTime = settings.daily_closure_time || '02:00';
      const timezone = settings.timezone || 'Europe/Paris';

      // Use provided business day or calculate it
      const businessDay = businessDayToClose || this.calculateBusinessDayToClose(now, closureTime, timezone);

      console.log(`🔒 Creating closure for business day: ${businessDay.toISOString().split('T')[0]}`);
      
      // Create closure bulletin for the correct business day
      const closureBulletin = await LegalJournalModel.createDailyClosure(businessDay);
      
      // Log the automatic closure
      await AuditTrailModel.logAction({
        action_type: 'AUTO_CLOSURE_EXECUTED',
        resource_type: 'CLOSURE_BULLETIN',
        resource_id: closureBulletin.id.toString(),
        action_details: {
          closure_type: 'DAILY',
          business_day: businessDay.toISOString().split('T')[0],
          period_start: closureBulletin.period_start,
          period_end: closureBulletin.period_end,
          transaction_count: closureBulletin.total_transactions,
          total_amount: closureBulletin.total_amount,
          closure_time: now.toISOString(),
          trigger: 'AUTOMATIC'
        },
        ip_address: undefined, // Fixed: use undefined instead of 'system' for inet compatibility
        user_agent: 'ClosureScheduler'
      });

      console.log(`✅ Automatic closure completed for business day ${businessDay.toISOString().split('T')[0]}`);
      console.log(`   - Period: ${closureBulletin.period_start} to ${closureBulletin.period_end}`);
      console.log(`   - Transactions: ${closureBulletin.total_transactions}`);
      console.log(`   - Total amount: €${closureBulletin.total_amount}`);
      console.log(`   - Bulletin ID: ${closureBulletin.id}`);
      
      return closureBulletin;
      
    } catch (error) {
      console.error('❌ Failed to execute automatic closure:', error);
      await AuditTrailModel.logAction({
        action_type: 'AUTO_CLOSURE_FAILED',
        action_details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          business_day: businessDayToClose ? businessDayToClose.toISOString().split('T')[0] : 'unknown',
          closure_time: now.toISOString()
        },
        ip_address: undefined, // Fixed: use undefined instead of 'system' for inet compatibility
        user_agent: 'ClosureScheduler'
      });
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
    console.log('🔍 Manual closure check triggered');
    await this.checkAndExecuteClosure();
  }
} 