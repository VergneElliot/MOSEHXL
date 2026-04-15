import { IPrintingService, PrintingConfig } from './types';
import { EpsonServerDirectPrintService } from './EpsonServerDirectPrintService';
import { DigitalReceiptService } from '../receipts/DigitalReceiptService';

export class PrintingServiceFactory {
  private static instances: Map<string, IPrintingService> = new Map();

  static async create(config: PrintingConfig): Promise<IPrintingService> {
    const configKey = JSON.stringify(config);

    if (this.instances.has(configKey)) {
      return this.instances.get(configKey)!;
    }

    let service: IPrintingService;

    switch (config.provider) {
      case 'epson-server-direct':
        service = new EpsonServerDirectPrintService(config);
        break;
      case 'digital':
        service = new DigitalReceiptService(config);
        break;
      default:
        if (!config.establishmentId || config.establishmentId <= 0) {
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
    const establishmentId = parseInt(process.env.PRINTING_DEV_ESTABLISHMENT_ID || '1', 10);
    return this.create({
      provider: 'epson-server-direct',
      establishmentId,
    });
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
