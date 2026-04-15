/**
 * In-memory FIFO queues for Epson Server Direct Print jobs per establishment.
 * Not shared across multiple server processes — use Redis or DB if you scale horizontally.
 */

import { randomUUID } from 'crypto';

export interface EpsonQueuedJob {
  id: string;
  xml: string;
}

const queues = new Map<number, EpsonQueuedJob[]>();

export function enqueueEposJob(establishmentId: number, xml: string): string {
  const id = randomUUID();
  const job: EpsonQueuedJob = { id, xml };
  const q = queues.get(establishmentId) ?? [];
  q.push(job);
  queues.set(establishmentId, q);
  return id;
}

export function dequeueEposJob(establishmentId: number): EpsonQueuedJob | undefined {
  const q = queues.get(establishmentId);
  if (!q || q.length === 0) return undefined;
  const job = q.shift();
  if (q.length === 0) queues.delete(establishmentId);
  return job;
}

export function queueLength(establishmentId: number): number {
  return queues.get(establishmentId)?.length ?? 0;
}
