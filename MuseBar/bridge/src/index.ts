#!/usr/bin/env node
import { loadConfig, type BridgeConfig } from './config';
import { pollJob, ackJob, failJob, type BridgePrintJob } from './cloudClient';
import { printEscPosJob } from './printers/networkEscpos';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message: string, extra?: Record<string, unknown>): void {
  const suffix = extra ? ` ${JSON.stringify(extra)}` : '';
  process.stdout.write(`[${new Date().toISOString()}] ${message}${suffix}\n`);
}

async function processJob(config: BridgeConfig, job: BridgePrintJob): Promise<void> {
  log('Print job received', {
    jobId: job.id,
    documentType: job.document_type,
    kitchenPrinterSlug: job.metadata?.kitchen_printer_slug,
    attempt: job.attempt_count,
  });
  try {
    await printEscPosJob(job, config);
    await ackJob(config, job.id);
    log('Print job ACKed', { jobId: job.id });
  } catch (error) {
    log('Print job failed', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      await failJob(config, job.id, error);
    } catch (reportError) {
      log('Failed to report print failure', {
        jobId: job.id,
        error: reportError instanceof Error ? reportError.message : String(reportError),
      });
    }
  }
}

async function run(): Promise<void> {
  const config = loadConfig();
  log('MuseBar Print Bridge started', {
    apiUrl: config.apiUrl,
    establishmentId: config.establishmentId,
    printer: `${config.printerHost}:${config.printerPort}`,
    routedPrinters: config.printers.length,
    pollIntervalMs: config.pollIntervalMs,
  });

  while (true) {
    try {
      const job = await pollJob(config);
      if (!job) {
        await sleep(config.pollIntervalMs);
        continue;
      }
      await processJob(config, job);
    } catch (error) {
      log('Bridge loop error', {
        error: error instanceof Error ? error.message : String(error),
      });
      await sleep(config.pollIntervalMs);
    }
  }
}

run().catch((error) => {
  process.stderr.write(`Bridge failed to start: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
