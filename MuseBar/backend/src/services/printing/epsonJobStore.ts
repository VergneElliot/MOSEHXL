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

const queuesByEstablishment = new Map<string, EpsonQueuedJob[]>();

export function enqueueEposJob(establishmentId: string, xml: string): string {
  const id = randomUUID();
  const job: EpsonQueuedJob = { id, xml };
  const q = queuesByEstablishment.get(establishmentId) ?? [];
  q.push(job);
  queuesByEstablishment.set(establishmentId, q);
  return id;
}

export function dequeueEposJob(establishmentId: string): EpsonQueuedJob | undefined {
  const q = queuesByEstablishment.get(establishmentId);
  if (!q || q.length === 0) return undefined;
  const job = q.shift();
  if (q.length === 0) queuesByEstablishment.delete(establishmentId);
  return job;
}

export function queueLength(establishmentId: string): number {
  return queuesByEstablishment.get(establishmentId)?.length ?? 0;
}
