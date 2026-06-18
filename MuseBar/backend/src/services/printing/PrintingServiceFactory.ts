import type { Pool } from 'pg';

import { IPrintingService, PrintingConfig } from './types';
import { EpsonServerDirectPrintService } from './EpsonServerDirectPrintService';
import { NetworkEscPosPrintService } from './NetworkEscPosPrintService';
import { BridgePrintService } from './BridgePrintService';
import { DigitalReceiptService } from '../receipts/DigitalReceiptService';

export interface PrintingServiceFactoryDeps {
  pool?: Pool;
}

export class PrintingServiceFactory {
  private static instances: Map<string, IPrintingService> = new Map();

  static async create(config: PrintingConfig, deps: PrintingServiceFactoryDeps = {}): Promise<IPrintingService> {
    const configKey = JSON.stringify(config);

    if (this.instances.has(configKey)) {
      return this.instances.get(configKey)!;
    }

    let service: IPrintingService;

    switch (config.provider) {
      case 'epson-server-direct':
        service = new EpsonServerDirectPrintService(config);
        break;
      case 'network-escpos':
        service = new NetworkEscPosPrintService(config);
        break;
      case 'bridge':
        if (!deps.pool) {
          throw new Error('Pool dependency is required for bridge printing');
        }
        service = new BridgePrintService(config, deps.pool);
        break;
      case 'digital':
        service = new DigitalReceiptService(config);
        break;
      default:
        if (!config.establishmentId) {
          throw new Error(
            `Unknown printing provider "${String((config as PrintingConfig).provider)}" and no valid establishmentId for default`
          );
        }
        service = new EpsonServerDirectPrintService({
          ...config,
          provider: 'epson-server-direct',
        });
    }

    await service.initialize();

    this.instances.set(configKey, service);

    return service;
  }

  /**
   * Dev / tooling helper. Prefer create() with a real establishmentId from request context.
   */
  static async getDefaultService(): Promise<IPrintingService> {
    const establishmentId = process.env.PRINTING_DEV_ESTABLISHMENT_ID || '';
    return this.create({
      provider: 'epson-server-direct',
      establishmentId,
    });
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
