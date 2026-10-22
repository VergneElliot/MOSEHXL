import type { Logger } from '../utils/logger';

let logger: Logger | undefined;

export function initializeEstablishmentLogger(instance: Logger): void {
  logger = instance;
}

export function establishmentLogger(): Logger | undefined {
  return logger;
}
