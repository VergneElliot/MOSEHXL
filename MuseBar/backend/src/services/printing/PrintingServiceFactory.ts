import { IPrintingService, PrintingConfig } from './types';
import { PrintNodeService } from './PrintNodeService';
import { StarCloudPRNTService } from './StarCloudPRNTService';
import { NetworkPrintingService } from './NetworkPrintingService';
import { BrowserPrintingService } from './BrowserPrintingService';
import { CompositePrintingService } from './CompositePrintingService';
import { DigitalReceiptService } from '../receipts/DigitalReceiptService';

export class PrintingServiceFactory {
  private static instances: Map<string, IPrintingService> = new Map();

  static async create(config: PrintingConfig): Promise<IPrintingService> {
    // Create a unique key for the configuration
    const configKey = JSON.stringify(config);
    
    // Check if we already have an instance for this configuration
    if (this.instances.has(configKey)) {
      return this.instances.get(configKey)!;
    }

    let service: IPrintingService;

    switch (config.provider) {
      case 'printnode':
        service = new PrintNodeService(config);
        break;
      case 'star-cloudprnt':
        service = new StarCloudPRNTService(config);
        break;
      case 'network':
        service = new NetworkPrintingService(config);
        break;
      case 'browser':
        service = new BrowserPrintingService(config);
        break;
      case 'digital':
        service = new DigitalReceiptService(config);
        break;
      case 'composite':
        service = new CompositePrintingService(config);
        break;
      default:
        // Default to composite service with fallback providers
        const compositeConfig: PrintingConfig = {
          ...config,
          provider: 'composite',
          providers: [
            { ...config, provider: 'network' },
            { ...config, provider: 'browser' }
          ]
        };
        service = new CompositePrintingService(compositeConfig);
    }

    // Initialize the service
    await service.initialize();

    // Cache the instance
    this.instances.set(configKey, service);

    return service;
  }

  static async getDefaultService(): Promise<IPrintingService> {
    // Get default configuration from environment or use browser as fallback
    const defaultConfig: PrintingConfig = {
      provider: process.env.PRINTING_PROVIDER as any || 'browser',
      apiKey: process.env.PRINTNODE_API_KEY,
      networkPrinterIp: process.env.NETWORK_PRINTER_IP,
      networkPrinterPort: parseInt(process.env.NETWORK_PRINTER_PORT || '9100'),
      timeout: parseInt(process.env.PRINTING_TIMEOUT || '10000')
    };

    return this.create(defaultConfig);
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
