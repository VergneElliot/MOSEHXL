/**
 * Thermal Print Service - Main Service Class
 * Main orchestrator for the modular thermal printing system
 */

import { PrintQueue } from './printQueue';
import { PrintTemplates } from './printTemplates';
import { PrintCommands } from './printCommands';
import { ReceiptData, ClosureBulletinData, PrinterConfig, PrinterStatus, PrintQueueStats } from './types';

/**
 * Default printer configuration
 */
const DEFAULT_CONFIG: PrinterConfig = {
  device: process.platform === 'win32' ? 'POS-58' : '/dev/usb/lp0',
  baudRate: 9600,
  paperWidth: 58, // mm
  characterWidth: 32,
  timeout: 30000, // 30 seconds
  retryAttempts: 3
};

/**
 * Thermal Print Service - Main Service Class
 * Backward compatible interface that delegates to the new modular system
 */
export class ThermalPrintService {
  private static instance: ThermalPrintService;
  private printQueue: PrintQueue;
  private config: PrinterConfig;
  
  private constructor(config: PrinterConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.printQueue = PrintQueue.getInstance(config);
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(config?: PrinterConfig): ThermalPrintService {
    if (!ThermalPrintService.instance) {
      ThermalPrintService.instance = new ThermalPrintService(config);
    }
    return ThermalPrintService.instance;
  }
  
  /**
   * Print receipt (backward compatible method)
   */
  async printReceipt(data: ReceiptData): Promise<boolean> {
    try {
      const jobId = this.printQueue.addReceiptJob(data, 'normal');
      
      // Wait for job completion (simplified for backward compatibility)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Print job timeout'));
        }, this.config.timeout);
        
        const checkJob = () => {
          const job = this.printQueue.getJob(jobId);
          if (!job) {
            clearTimeout(timeout);
            reject(new Error('Job not found'));
            return;
          }
          
          switch (job.status) {
            case 'completed':
              clearTimeout(timeout);
              resolve(true);
              break;
            case 'failed':
              clearTimeout(timeout);
              reject(new Error('Print job failed'));
              break;
            case 'pending':
            case 'processing':
              setTimeout(checkJob, 1000); // Check again in 1 second
              break;
          }
        };
        
        checkJob();
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
      return false;
    }
  }
  
  /**
   * Print closure bulletin (backward compatible method)
   */
  async printClosureBulletin(data: ClosureBulletinData): Promise<boolean> {
    try {
      const jobId = this.printQueue.addClosureJob(data, 'high');
      
      // Wait for job completion (simplified for backward compatibility)
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Print job timeout'));
        }, this.config.timeout);
        
        const checkJob = () => {
          const job = this.printQueue.getJob(jobId);
          if (!job) {
            clearTimeout(timeout);
            reject(new Error('Job not found'));
            return;
          }
          
          switch (job.status) {
            case 'completed':
              clearTimeout(timeout);
              resolve(true);
              break;
            case 'failed':
              clearTimeout(timeout);
              reject(new Error('Print job failed'));
              break;
            case 'pending':
            case 'processing':
              setTimeout(checkJob, 1000); // Check again in 1 second
              break;
          }
        };
        
        checkJob();
      });
    } catch (error) {
      console.error('Error printing closure bulletin:', error);
      return false;
    }
  }
  
  /**
   * Generate receipt content (backward compatible method)
   */
  static generateReceiptContent(data: ReceiptData): string {
    return PrintTemplates.generateReceipt(data);
  }
  
  /**
   * Generate closure bulletin content (backward compatible method)
   */
  static generateClosureBulletinContent(data: ClosureBulletinData): string {
    return PrintTemplates.generateClosureBulletin(data);
  }
  
  /**
   * Test printer connection
   */
  async testPrinter(): Promise<boolean> {
    try {
      const testContent = PrintTemplates.generateTestPrint();
      const jobId = this.printQueue.addReceiptJob({
        order_id: 0,
        sequence_number: 0,
        total_amount: 0,
        total_tax: 0,
        payment_method: 'cash',
        created_at: new Date().toISOString(),
        business_info: {
          name: 'Test Print',
          address: 'Test Address',
          phone: '0000000000',
          email: 'test@test.com'
        },
        receipt_type: 'summary'
      }, 'high');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 10000); // 10 second timeout for test
        
        const checkJob = () => {
          const job = this.printQueue.getJob(jobId);
          if (!job) {
            clearTimeout(timeout);
            resolve(false);
            return;
          }
          
          switch (job.status) {
            case 'completed':
              clearTimeout(timeout);
              resolve(true);
              break;
            case 'failed':
              clearTimeout(timeout);
              resolve(false);
              break;
            case 'pending':
            case 'processing':
              setTimeout(checkJob, 500);
              break;
          }
        };
        
        checkJob();
      });
    } catch (error) {
      console.error('Error testing printer:', error);
      return false;
    }
  }
  
  /**
   * Get printer status
   */
  getPrinterStatus(): PrinterStatus {
    // Basic status - in a real implementation, this would query the actual printer
    return {
      isConnected: true, // Assume connected if no errors
      isReady: !this.printQueue.isProcessing(),
      paperStatus: 'ok', // Would need actual hardware query
      lastPrint: undefined // Would track from actual print jobs
    };
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats(): PrintQueueStats {
    return this.printQueue.getQueueStats();
  }
  
  /**
   * Get printer configuration
   */
  getConfig(): PrinterConfig {
    return { ...this.config };
  }
  
  /**
   * Update printer configuration
   */
  updateConfig(newConfig: Partial<PrinterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.printQueue.updateConfig(this.config);
  }
  
  /**
   * Add receipt to print queue
   */
  queueReceipt(data: ReceiptData, priority: 'low' | 'normal' | 'high' = 'normal'): string {
    return this.printQueue.addReceiptJob(data, priority);
  }
  
  /**
   * Add closure bulletin to print queue
   */
  queueClosureBulletin(data: ClosureBulletinData, priority: 'low' | 'normal' | 'high' = 'high'): string {
    return this.printQueue.addClosureJob(data, priority);
  }
  
  /**
   * Cancel print job
   */
  cancelJob(jobId: string): boolean {
    return this.printQueue.cancelJob(jobId);
  }
  
  /**
   * Retry failed job
   */
  retryJob(jobId: string): boolean {
    return this.printQueue.retryJob(jobId);
  }
  
  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    this.printQueue.clearCompletedJobs();
  }
  
  /**
   * Pause print queue
   */
  pauseQueue(): void {
    this.printQueue.pauseQueue();
  }
  
  /**
   * Resume print queue
   */
  resumeQueue(): void {
    this.printQueue.resumeQueue();
  }
  
  /**
   * Get all print jobs
   */
  getAllJobs(): any[] {
    return this.printQueue.getAllJobs();
  }
  
  /**
   * Listen to queue events
   */
  onQueueEvent(event: string, callback: (...args: any[]) => void): void {
    this.printQueue.on(event, callback);
  }
  
  /**
   * Remove queue event listener
   */
  offQueueEvent(event: string, callback: (...args: any[]) => void): void {
    this.printQueue.off(event, callback);
  }
}

