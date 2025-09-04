/**
 * Queue Processor
 * Handles print job processing logic and queue execution
 */

import { EventEmitter } from 'events';
import { PrintJob, ReceiptData, ClosureBulletinData } from './types';
import { PrintTemplates } from './printTemplates';
import { PrintOperations } from './printOperations';
import { QueueStorage } from './queueStorage';

/**
 * Queue processor for print jobs
 */
export class QueueProcessor extends EventEmitter {
  private storage: QueueStorage;
  private printOps: PrintOperations;
  private processing: boolean = false;
  private processingJob: string | null = null;
  private isPaused: boolean = false;

  constructor(storage: QueueStorage, printOps: PrintOperations) {
    super();
    this.storage = storage;
    this.printOps = printOps;
  }

  /**
   * Start processing the queue
   */
  public async processQueue(): Promise<void> {
    if (this.processing || this.isPaused) {
      return;
    }

    this.processing = true;
    this.emit('processing_started');

    try {
      while (this.storage.hasPendingJobs() && !this.isPaused) {
        const job = this.storage.getNextPendingJob();
        if (!job) break;

        await this.processJob(job);

        // Small delay between jobs to prevent overwhelming the printer
        if (this.storage.hasPendingJobs() && !this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.processing = false;
      this.processingJob = null;
      this.emit('processing_stopped');
    }
  }

  /**
   * Process a single print job
   */
  private async processJob(job: PrintJob): Promise<void> {
    this.processingJob = job.id;
    this.storage.updateJobStatus(job.id, 'processing');
    this.emit('job_started', job);

    try {
      // Generate content based on job type
      let content: string;
      
      if (job.type === 'receipt') {
        content = PrintTemplates.generateReceipt(job.data as ReceiptData);
      } else {
        content = PrintTemplates.generateClosureBulletin(job.data as ClosureBulletinData);
      }

      // Execute the print operation
      await this.printOps.printContent(content, job.id);

      // Mark job as completed
      this.storage.updateJobStatus(job.id, 'completed');
      this.emit('job_completed', job);

    } catch (error) {
      await this.handleJobError(job, error as Error);
    }
  }

  /**
   * Handle job processing errors
   */
  private async handleJobError(job: PrintJob, error: Error): Promise<void> {
    this.storage.incrementJobAttempts(job.id);
    
    if (job.attempts >= job.maxAttempts) {
      // Max attempts reached, mark as failed
      this.storage.updateJobStatus(job.id, 'failed');
      const updatedJob = this.storage.getJob(job.id);
      if (updatedJob) {
        updatedJob.error = error.message;
      }
      this.emit('job_failed', job, error);
    } else {
      // Retry after delay
      this.storage.updateJobStatus(job.id, 'pending');
      this.emit('job_retry', job, error);
      
      setTimeout(() => {
        const retryJob = this.storage.getJob(job.id);
        if (retryJob && retryJob.status === 'pending') {
          this.processQueue(); // Restart processing
        }
      }, this.calculateRetryDelay(job.attempts));
    }
  }

  /**
   * Calculate retry delay based on attempt number
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc. (max 30s)
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Check if processor is currently processing
   */
  public isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Get currently processing job ID
   */
  public getProcessingJobId(): string | null {
    return this.processingJob;
  }

  /**
   * Pause queue processing
   */
  public pauseQueue(): void {
    this.isPaused = true;
    this.emit('queue_paused');
  }

  /**
   * Resume queue processing
   */
  public resumeQueue(): void {
    this.isPaused = false;
    this.emit('queue_resumed');
    
    if (this.storage.hasPendingJobs()) {
      this.processQueue();
    }
  }

  /**
   * Check if queue is paused
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Force stop current processing
   */
  public stop(): void {
    this.isPaused = true;
    this.processing = false;
    this.processingJob = null;
    this.emit('processor_stopped');
  }

  /**
   * Get processor status
   */
  public getStatus(): {
    processing: boolean;
    paused: boolean;
    currentJob: string | null;
    queueStats: any;
  } {
    return {
      processing: this.processing,
      paused: this.isPaused,
      currentJob: this.processingJob,
      queueStats: this.storage.getStats()
    };
  }
}
