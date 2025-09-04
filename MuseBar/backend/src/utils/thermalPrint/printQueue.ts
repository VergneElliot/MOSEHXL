/**
 * Print Queue - Job Management and Processing
 * REFACTORED: Main print queue that delegates to specialized modules
 * The original 439-line queue has been modularized into:
 * - queueStorage.ts (Storage operations)
 * - queueProcessor.ts (Processing logic)
 * - printOperations.ts (Print execution)
 * - printQueue.ts (Main coordinator)
 */

import { EventEmitter } from 'events';
import { PrintJob, PrinterConfig, PrinterStatus, PrintQueueStats, ReceiptData, ClosureBulletinData } from './types';
import { QueueStorage } from './queueStorage';
import { QueueProcessor } from './queueProcessor';
import { PrintOperations } from './printOperations';

/**
 * Main print queue manager - delegates to specialized modules
 */
export class PrintQueue extends EventEmitter {
  private storage: QueueStorage;
  private processor: QueueProcessor;
  private printOps: PrintOperations;
  private static instance: PrintQueue;
  
  constructor(config: PrinterConfig) {
    super();
    
    // Initialize specialized modules
    this.storage = new QueueStorage();
    this.printOps = new PrintOperations(config);
    this.processor = new QueueProcessor(this.storage, this.printOps);
    
    this.setupEventHandlers();
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(config?: PrinterConfig): PrintQueue {
    if (!PrintQueue.instance) {
      if (!config) {
        throw new Error('PrintQueue config required for first initialization');
      }
      PrintQueue.instance = new PrintQueue(config);
    }
    return PrintQueue.instance;
  }
  
  /**
   * Setup event forwarding from processor
   */
  private setupEventHandlers(): void {
    // Forward processor events
    this.processor.on('processing_started', () => {
      this.emit('processing_started');
    });
    
    this.processor.on('processing_stopped', () => {
      this.emit('processing_stopped');
    });
    
    this.processor.on('job_started', (job: PrintJob) => {
      this.emit('job_started', job);
    });
    
    this.processor.on('job_completed', (job: PrintJob) => {
      this.emit('job_completed', job);
    });
    
    this.processor.on('job_failed', (job: PrintJob, error: Error) => {
      this.emit('job_failed', job, error);
    });
    
    this.processor.on('job_retry', (job: PrintJob, error: Error) => {
      this.emit('job_retry', job, error);
    });
    
    this.processor.on('queue_paused', () => {
      this.emit('queue_paused');
    });
    
    this.processor.on('queue_resumed', () => {
      this.emit('queue_resumed');
    });
  }
  
  /**
   * Add receipt print job
   */
  addReceiptJob(data: ReceiptData, priority: 'low' | 'normal' | 'high' = 'normal'): string {
    const job: PrintJob = {
      id: this.generateJobId(),
      type: 'receipt',
      data,
      priority,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.storage.addJob(job);
    this.emit('job_added', job);
    
    // Start processing if not already running
    if (!this.processor.isProcessing()) {
      this.processor.processQueue();
    }
    
    return job.id;
  }
  
  /**
   * Add closure bulletin print job
   */
  addClosureJob(data: ClosureBulletinData, priority: 'low' | 'normal' | 'high' = 'high'): string {
    const job: PrintJob = {
      id: this.generateJobId(),
      type: 'closure_bulletin',
      data,
      priority,
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.storage.addJob(job);
    this.emit('job_added', job);
    
    // Start processing if not already running
    if (!this.processor.isProcessing()) {
      this.processor.processQueue();
    }
    
    return job.id;
  }
  
  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get job by ID
   */
  getJob(jobId: string): PrintJob | null {
    return this.storage.getJob(jobId);
  }
  
  /**
   * Get all jobs
   */
  getAllJobs(): PrintJob[] {
    return this.storage.getAllJobs();
  }
  
  /**
   * Get jobs by status
   */
  getJobsByStatus(status: PrintJob['status']): PrintJob[] {
    return this.storage.getJobsByStatus(status);
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats(): PrintQueueStats {
    return this.storage.getStats();
  }
  
  /**
   * Cancel a job
   */
  cancelJob(jobId: string): boolean {
    const job = this.storage.getJob(jobId);
    if (!job || job.status === 'completed' || job.status === 'processing') {
      return false;
    }
    
    const removed = this.storage.removeJob(jobId);
    if (removed) {
      this.emit('job_cancelled', job);
    }
    
    return removed;
  }
  
  /**
   * Clear completed jobs
   */
  clearCompletedJobs(): void {
    const removedCount = this.storage.clearCompletedJobs();
    this.emit('jobs_cleared', { count: removedCount, type: 'completed' });
  }
  
  /**
   * Retry a failed job
   */
  retryJob(jobId: string): boolean {
    const success = this.storage.retryJob(jobId);
    if (success) {
      const job = this.storage.getJob(jobId);
      if (job) {
        this.emit('job_retried', job);
        
        // Start processing if not already running
        if (!this.processor.isProcessing()) {
          this.processor.processQueue();
        }
      }
    }
    
    return success;
  }
  
  /**
   * Get printer configuration
   */
  getConfig(): PrinterConfig {
    return this.printOps.getConfig();
  }
  
  /**
   * Update printer configuration
   */
  updateConfig(config: Partial<PrinterConfig>): void {
    this.printOps.updateConfig(config);
  }
  
  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processor.isProcessing();
  }
  
  /**
   * Get currently processing job ID
   */
  getProcessingJobId(): string | null {
    return this.processor.getProcessingJobId();
  }
  
  /**
   * Pause queue processing
   */
  pauseQueue(): void {
    this.processor.pauseQueue();
  }
  
  /**
   * Resume queue processing
   */
  resumeQueue(): void {
    this.processor.resumeQueue();
  }
  
  /**
   * Test printer connectivity
   */
  async testPrinter(): Promise<boolean> {
    return this.printOps.testPrinter();
  }
  
  /**
   * Get printer status
   */
  getStatus(): PrinterStatus {
    const processorStatus = this.processor.getStatus();
    
    return {
      connected: true, // Would need actual printer detection
      isConnected: true,
      online: !processorStatus.paused,
      isReady: !processorStatus.processing,
      processing: processorStatus.processing,
      paperStatus: 'ok' as const,
      error: null,
      lastPrintTime: null, // Could track this
      queueLength: this.storage.getStats().pending
    };
  }
}