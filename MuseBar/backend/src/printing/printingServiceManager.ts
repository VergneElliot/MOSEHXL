import type { Pool } from 'pg';

import type { IPrintingService, PrintingConfig } from '../services/printing/types';
import { PrintingServiceFactory } from '../services/printing/PrintingServiceFactory';
import type { Logger } from '../utils/logger';
import { getActivePrintingConfiguration } from './printingConfigRepo';

/**
 * In-process printing service manager.
 * Caches one initialized printing service per establishment id.
 */
export function createPrintingServiceManager(pool: Pool, logger: Logger) {
  const printingServices: Map<string, IPrintingService> = new Map();

  async function getPrintingService(establishmentId: string): Promise<IPrintingService> {
    if (printingServices.has(establishmentId)) {
      return printingServices.get(establishmentId)!;
    }

    try {
      let config: PrintingConfig;
      const active = await getActivePrintingConfiguration(pool, establishmentId);
      if (active) {
        config = {
          provider: active.provider as PrintingConfig['provider'],
          establishmentId,
          ...active.config,
        };
      } else {
        config = { provider: 'epson-server-direct', establishmentId };
      }

      const service = await PrintingServiceFactory.create(config, { pool });
      printingServices.set(establishmentId, service);
      return service;
    } catch (error) {
      logger.error(
        'Error getting printing service',
        error instanceof Error ? error : undefined
      );

      const fallbackService = await PrintingServiceFactory.create(
        {
          provider: 'epson-server-direct',
          establishmentId,
        },
        { pool }
      );
      printingServices.set(establishmentId, fallbackService);
      return fallbackService;
    }
  }

  function clearPrintingService(establishmentId: string) {
    printingServices.delete(establishmentId);
  }

  function clearAll() {
    printingServices.clear();
  }

  return { getPrintingService, clearPrintingService, clearAll };
}

