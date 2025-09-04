/**
 * Queue Storage
 * Handles print job storage, retrieval, and management operations
 */

import { PrintJob, PrintQueueStats } from './types';

/**
 * Queue storage manager for print jobs
 */
export class QueueStorage {
  private jobs: Map<string, PrintJob> = new Map();
  private stats: PrintQueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    totalJobs: 0
  };

  /**
   * Add a job to storage
   */
  public addJob(job: PrintJob): void {
    this.jobs.set(job.id, job);
    this.updateStats(job.status, 1);
  }

  /**
   * Get a job by ID
   */
  public getJob(jobId: string): PrintJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Update job status
   */
  public updateJobStatus(jobId: string, status: PrintJob['status']): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    const oldStatus = job.status;
    job.status = status;
    job.updatedAt = new Date();

    // Update stats
    this.updateStats(oldStatus, -1);
    this.updateStats(status, 1);

    return true;
  }

  /**
   * Update job attempts
   */
  public incrementJobAttempts(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    job.attempts++;
    job.updatedAt = new Date();
    return true;
  }

  /**
   * Get all jobs
   */
  public getAllJobs(): PrintJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  public getJobsByStatus(status: PrintJob['status']): PrintJob[] {
    return Array.from(this.jobs.values()).filter(job => job.status === status);
  }

  /**
   * Get pending jobs sorted by priority and creation time
   */
  public getPendingJobsSorted(): PrintJob[] {
    return this.getJobsByStatus('pending').sort((a, b) => {
      // Priority order: high -> normal -> low
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      // If same priority, sort by creation time (FIFO)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Check if there are pending jobs
   */
  public hasPendingJobs(): boolean {
    return this.stats.pending > 0;
  }

  /**
   * Get next pending job
   */
  public getNextPendingJob(): PrintJob | null {
    const pendingJobs = this.getPendingJobsSorted();
    return pendingJobs[0] || null;
  }

  /**
   * Remove a job from storage
   */
  public removeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    this.jobs.delete(jobId);
    this.updateStats(job.status, -1);
    return true;
  }

  /**
   * Clear completed jobs
   */
  public clearCompletedJobs(): number {
    const completedJobs = this.getJobsByStatus('completed');
    let removedCount = 0;

    for (const job of completedJobs) {
      if (this.removeJob(job.id)) {
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get queue statistics
   */
  public getStats(): PrintQueueStats {
    return { ...this.stats };
  }

  /**
   * Reset job status to pending (for retry)
   */
  public retryJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'pending';
    job.attempts = 0;
    job.error = undefined;
    job.updatedAt = new Date();

    // Update stats
    this.updateStats('failed', -1);
    this.updateStats('pending', 1);

    return true;
  }

  /**
   * Update statistics for a status change
   */
  private updateStats(status: PrintJob['status'], delta: number): void {
    switch (status) {
      case 'pending':
        this.stats.pending += delta;
        break;
      case 'processing':
        this.stats.processing += delta;
        break;
      case 'completed':
        this.stats.completed += delta;
        break;
      case 'failed':
        this.stats.failed += delta;
        break;
    }

    if (delta > 0) {
      this.stats.totalJobs += delta;
    }
  }

  /**
   * Get total job count
   */
  public getTotalJobCount(): number {
    return this.jobs.size;
  }

  /**
   * Clear all jobs
   */
  public clear(): void {
    this.jobs.clear();
    this.stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalJobs: 0
    };
  }
}
