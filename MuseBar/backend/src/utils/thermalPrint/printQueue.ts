/**
 * Print Queue - Job Management and Processing
 * Handles print job queuing, processing, and error handling
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PrintJob, PrinterConfig, PrinterStatus, PrintQueueStats, ReceiptData, ClosureBulletinData } from './types';
import { PrintTemplates } from './printTemplates';

/**
 * Print Queue Manager
 */
export class PrintQueue extends EventEmitter {
  private jobs: Map<string, PrintJob> = new Map();
  private processing: boolean = false;
  private processingJob: string | null = null;
  private printerConfig: PrinterConfig;
  private stats: PrintQueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalJobs: 0
  };
  
  private static instance: PrintQueue;
  
  constructor(config: PrinterConfig) {
    super();
    this.printerConfig = config;
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
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('jobAdded', () => {
      if (!this.processing) {
        this.processQueue();
      }
    });
    
    this.on('jobCompleted', (jobId: string) => {
      this.updateStats();
      this.emit('queueUpdated', this.getQueueStats());
    });
    
    this.on('jobFailed', (jobId: string, error: Error) => {
      console.error(`Print job ${jobId} failed:`, error);
      this.updateStats();
      this.emit('queueUpdated', this.getQueueStats());
    });
  }
  
  /**
   * Add receipt print job
   */
  addReceiptJob(data: ReceiptData, priority: 'low' | 'normal' | 'high' = 'normal'): string {
    const jobId = this.generateJobId();
    
    const job: PrintJob = {
      id: jobId,
      type: 'receipt',
      data,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.printerConfig.retryAttempts,
      status: 'pending'
    };
    
    this.jobs.set(jobId, job);
    this.updateStats();
    this.emit('jobAdded', jobId);
    
    return jobId;
  }
  
  /**
   * Add closure bulletin print job
   */
  addClosureJob(data: ClosureBulletinData, priority: 'low' | 'normal' | 'high' = 'high'): string {
    const jobId = this.generateJobId();
    
    const job: PrintJob = {
      id: jobId,
      type: 'closure',
      data,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: this.printerConfig.retryAttempts,
      status: 'pending'
    };
    
    this.jobs.set(jobId, job);
    this.updateStats();
    this.emit('jobAdded', jobId);
    
    return jobId;
  }
  
  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }
    
    this.processing = true;
    
    try {
      while (this.hasPendingJobs()) {
        const job = this.getNextJob();
        if (!job) break;
        
        this.processingJob = job.id;
        job.status = 'processing';
        this.updateStats();
        
        try {
          await this.processJob(job);
          job.status = 'completed';
          this.emit('jobCompleted', job.id);
        } catch (error) {
          job.attempts++;
          
          if (job.attempts >= job.maxAttempts) {
            job.status = 'failed';
            this.emit('jobFailed', job.id, error as Error);
          } else {
            job.status = 'pending';
            // Re-add to queue for retry
            setTimeout(() => {
              if (job.status === 'pending') {
                this.emit('jobAdded', job.id);
              }
            }, 5000); // 5 second delay before retry
          }
        }
        
        this.processingJob = null;
      }
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Process individual job
   */
  private async processJob(job: PrintJob): Promise<void> {
    let content: string;
    
    // Generate content based on job type
    if (job.type === 'receipt') {
      content = PrintTemplates.generateReceipt(job.data as ReceiptData);
    } else {
      content = PrintTemplates.generateClosureBulletin(job.data as ClosureBulletinData);
    }
    
    // Print the content
    await this.printContent(content, job.id);
    
    this.emit('jobProcessed', job.id, job.type);
  }
  
  /**
   * Print content to thermal printer
   */
  private async printContent(content: string, jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Print job ${jobId} timed out`));
      }, this.printerConfig.timeout);
      
      try {
        if (process.platform === 'win32') {
          this.printWindows(content, resolve, reject, timeout);
        } else {
          this.printUnix(content, resolve, reject, timeout);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  
  /**
   * Print on Windows systems
   */
  private printWindows(content: string, resolve: () => void, reject: (error: Error) => void, timeout: NodeJS.Timeout): void {
    const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
    
    fs.writeFile(tempFile, content, 'binary')
      .then(() => {
        const printProcess = spawn('print', ['/D:' + this.printerConfig.device, tempFile]);
        
        printProcess.on('close', (code) => {
          clearTimeout(timeout);
          fs.unlink(tempFile).catch(() => {});
          
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Print process exited with code ${code}`));
          }
        });
        
        printProcess.on('error', (error) => {
          clearTimeout(timeout);
          fs.unlink(tempFile).catch(() => {});
          reject(error);
        });
      })
      .catch(reject);
  }
  
  /**
   * Print on Unix/Linux systems
   */
  private printUnix(content: string, resolve: () => void, reject: (error: Error) => void, timeout: NodeJS.Timeout): void {
    const printProcess = spawn('lp', ['-d', this.printerConfig.device, '-o', 'raw']);
    
    printProcess.stdin.write(content, 'binary');
    printProcess.stdin.end();
    
    printProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Print process exited with code ${code}`));
      }
    });
    
    printProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  }
  
  /**
   * Get next job to process (priority order)
   */
  private getNextJob(): PrintJob | null {
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => {
        // Sort by priority (high > normal > low) then by creation time
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    
    return pendingJobs[0] || null;
  }
  
  /**
   * Check if there are pending jobs
   */
  private hasPendingJobs(): boolean {
    return Array.from(this.jobs.values()).some(job => job.status === 'pending');
  }
  
  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Update queue statistics
   */
  private updateStats(): void {
    const jobs = Array.from(this.jobs.values());
    
    this.stats = {
      pending: jobs.filter(job => job.status === 'pending').length,
      processing: jobs.filter(job => job.status === 'processing').length,
      completed: jobs.filter(job => job.status === 'completed').length,
      failed: jobs.filter(job => job.status === 'failed').length,
      totalJobs: jobs.length
    };
  }
  
  /**
   * Get job by ID
   */
  getJob(jobId: string): PrintJob | null {
    return this.jobs.get(jobId) || null;
  }
  
  /**
   * Get all jobs
   */
  getAllJobs(): PrintJob[] {
    return Array.from(this.jobs.values());
  }
  
  /**
   * Get jobs by status
   */
  getJobsByStatus(status: PrintJob['status']): PrintJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }
  
  /**
   * Get queue statistics
   */
  getQueueStats(): PrintQueueStats {
    this.updateStats();
    return { ...this.stats };
  }
  
  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'processing') {
      return false;
    }
    
    this.jobs.delete(jobId);
    this.updateStats();
    this.emit('jobCancelled', jobId);
    
    return true;
  }
  
  /**
   * Clear completed and failed jobs
   */
  clearCompletedJobs(): void {
    const jobsToRemove = Array.from(this.jobs.entries())
      .filter(([_, job]) => job.status === 'completed' || job.status === 'failed')
      .map(([id, _]) => id);
    
    jobsToRemove.forEach(id => this.jobs.delete(id));
    this.updateStats();
    this.emit('queueCleared');
  }
  
  /**
   * Retry failed job
   */
  retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }
    
    job.status = 'pending';
    job.attempts = 0;
    this.updateStats();
    this.emit('jobAdded', jobId);
    
    return true;
  }
  
  /**
   * Get printer configuration
   */
  getConfig(): PrinterConfig {
    return { ...this.printerConfig };
  }
  
  /**
   * Update printer configuration
   */
  updateConfig(config: Partial<PrinterConfig>): void {
    this.printerConfig = { ...this.printerConfig, ...config };
    this.emit('configUpdated', this.printerConfig);
  }
  
  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }
  
  /**
   * Get currently processing job ID
   */
  getProcessingJobId(): string | null {
    return this.processingJob;
  }
  
  /**
   * Pause queue processing
   */
  pauseQueue(): void {
    this.processing = true; // Prevents new jobs from being processed
    this.emit('queuePaused');
  }
  
  /**
   * Resume queue processing
   */
  resumeQueue(): void {
    this.processing = false;
    this.emit('queueResumed');
    
    // Start processing if there are pending jobs
    if (this.hasPendingJobs()) {
      this.processQueue();
    }
  }
}

