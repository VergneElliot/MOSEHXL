import { 
  IPrintingService, 
  ReceiptData, 
  ClosureBulletinData, 
  PrintResult, 
  PrinterStatus, 
  Printer,
  PrintingConfig 
} from './types';
import { PrintingServiceFactory } from './PrintingServiceFactory';

export class CompositePrintingService implements IPrintingService {
  private services: IPrintingService[] = [];
  private config: PrintingConfig;
  private isInitialized: boolean = false;

  constructor(config: PrintingConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const providers = this.config.providers || [];
    
    // If no providers specified, use default fallback chain
    if (providers.length === 0) {
      providers.push(
        { ...this.config, provider: 'printnode' },
        { ...this.config, provider: 'star-cloudprnt' },
        { ...this.config, provider: 'network' },
        { ...this.config, provider: 'browser' }
      );
    }

    // Initialize each service
    for (const providerConfig of providers) {
      try {
        const service = await this.createService(providerConfig);
        if (service) {
          this.services.push(service);
          console.log(`✅ Initialized ${providerConfig.provider} printing service`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to initialize ${providerConfig.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (this.services.length === 0) {
      // Always have browser printing as ultimate fallback
      const browserService = await this.createService({ provider: 'browser' });
      if (browserService) {
        this.services.push(browserService);
      }
    }

    this.isInitialized = true;
    console.log(`Composite printing service initialized with ${this.services.length} providers`);
  }

  async printReceipt(data: ReceiptData): Promise<PrintResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const errors: string[] = [];
    
    // Try each service in order
    for (let i = 0; i < this.services.length; i++) {
      const service = this.services[i];
      const serviceName = this.getServiceName(service);
      
      try {
        console.log(`🖨️  Attempting to print receipt with ${serviceName}...`);
        const result = await service.printReceipt(data);
        
        if (result.success) {
          console.log(`✅ Successfully printed with ${serviceName}`);
          
          // Log to printing history
          await this.logPrintingHistory('receipt', serviceName, 'success', result);
          
          return {
            ...result,
            provider: `composite->${serviceName}`,
            metadata: {
              ...result.metadata,
              attemptNumber: i + 1,
              totalProviders: this.services.length
            }
          };
        } else {
          errors.push(`${serviceName}: ${result.message}`);
          console.warn(`⚠️  ${serviceName} failed: ${result.message}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${serviceName}: ${errorMessage}`);
        console.error(`❌ ${serviceName} error:`, error);
      }
    }

    // All services failed
    await this.logPrintingHistory('receipt', 'all', 'failed', { errors });
    
    return {
      success: false,
      message: `All printing services failed. Errors: ${errors.join('; ')}`,
      provider: 'composite',
      metadata: {
        errors,
        attemptedProviders: this.services.length
      }
    };
  }

  async printClosureBulletin(data: ClosureBulletinData): Promise<PrintResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const errors: string[] = [];
    
    // Try each service in order
    for (let i = 0; i < this.services.length; i++) {
      const service = this.services[i];
      const serviceName = this.getServiceName(service);
      
      try {
        console.log(`🖨️  Attempting to print closure bulletin with ${serviceName}...`);
        const result = await service.printClosureBulletin(data);
        
        if (result.success) {
          console.log(`✅ Successfully printed with ${serviceName}`);
          
          // Log to printing history
          await this.logPrintingHistory('closure_bulletin', serviceName, 'success', result);
          
          return {
            ...result,
            provider: `composite->${serviceName}`,
            metadata: {
              ...result.metadata,
              attemptNumber: i + 1,
              totalProviders: this.services.length
            }
          };
        } else {
          errors.push(`${serviceName}: ${result.message}`);
          console.warn(`⚠️  ${serviceName} failed: ${result.message}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${serviceName}: ${errorMessage}`);
        console.error(`❌ ${serviceName} error:`, error);
      }
    }

    // All services failed
    await this.logPrintingHistory('closure_bulletin', 'all', 'failed', { errors });
    
    return {
      success: false,
      message: `All printing services failed. Errors: ${errors.join('; ')}`,
      provider: 'composite',
      metadata: {
        errors,
        attemptedProviders: this.services.length
      }
    };
  }

  async checkPrinterStatus(printerId?: string): Promise<PrinterStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check status of all services
    const statuses: PrinterStatus[] = [];
    
    for (const service of this.services) {
      try {
        const status = await service.checkPrinterStatus(printerId);
        statuses.push(status);
        
        // Return first available printer
        if (status.available) {
          return {
            ...status,
            provider: `composite->${status.provider}`
          };
        }
      } catch (error) {
        console.warn(`Error checking printer status:`, error);
      }
    }

    // No available printers
    return {
      available: false,
      status: 'No available printers across all services',
      provider: 'composite',
      printerId: printerId || 'none'
    };
  }

  async listPrinters(): Promise<Printer[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const allPrinters: Printer[] = [];
    
    for (const service of this.services) {
      try {
        const printers = await service.listPrinters();
        allPrinters.push(...printers.map(p => ({
          ...p,
          provider: `composite->${p.provider}`
        })));
      } catch (error) {
        console.warn(`Error listing printers:`, error);
      }
    }

    return allPrinters;
  }

  async testPrint(printerId?: string): Promise<PrintResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const errors: string[] = [];
    
    // Try test print on each service
    for (let i = 0; i < this.services.length; i++) {
      const service = this.services[i];
      const serviceName = this.getServiceName(service);
      
      try {
        console.log(`🖨️  Attempting test print with ${serviceName}...`);
        const result = await service.testPrint(printerId);
        
        if (result.success) {
          console.log(`✅ Test print successful with ${serviceName}`);
          
          return {
            ...result,
            provider: `composite->${serviceName}`,
            metadata: {
              ...result.metadata,
              attemptNumber: i + 1,
              totalProviders: this.services.length
            }
          };
        } else {
          errors.push(`${serviceName}: ${result.message}`);
          console.warn(`⚠️  ${serviceName} test print failed: ${result.message}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${serviceName}: ${errorMessage}`);
        console.error(`❌ ${serviceName} test print error:`, error);
      }
    }

    return {
      success: false,
      message: `All test prints failed. Errors: ${errors.join('; ')}`,
      provider: 'composite',
      metadata: {
        errors,
        attemptedProviders: this.services.length
      }
    };
  }

  private async createService(config: PrintingConfig): Promise<IPrintingService | null> {
    try {
      // Don't create nested composite services
      if (config.provider === 'composite') {
        return null;
      }

      // Use factory but without initialization (we'll do it ourselves)
      const service = new (await import(`./${this.getServiceClassName(config.provider)}`))[this.getServiceClassName(config.provider)](config);
      await service.initialize();
      return service;
    } catch (error) {
      console.error(`Failed to create ${config.provider} service:`, error);
      return null;
    }
  }

  private getServiceClassName(provider: string): string {
    const classNames: { [key: string]: string } = {
      'printnode': 'PrintNodeService',
      'star-cloudprnt': 'StarCloudPRNTService',
      'network': 'NetworkPrintingService',
      'browser': 'BrowserPrintingService'
    };
    
    return classNames[provider] || 'BrowserPrintingService';
  }

  private getServiceName(service: IPrintingService): string {
    const className = service.constructor.name;
    const nameMap: { [key: string]: string } = {
      'PrintNodeService': 'printnode',
      'StarCloudPRNTService': 'star-cloudprnt',
      'NetworkPrintingService': 'network',
      'BrowserPrintingService': 'browser'
    };
    
    return nameMap[className] || className;
  }

  private async logPrintingHistory(
    printType: string, 
    provider: string, 
    status: string, 
    metadata: any
  ): Promise<void> {
    // In production, this would log to database
    // For now, just console log
    console.log(`[Printing History] Type: ${printType}, Provider: ${provider}, Status: ${status}`, metadata);
    
    // TODO: Implement database logging when schema is applied
    /*
    try {
      await pool.query(
        `INSERT INTO printing_history 
         (establishment_id, print_type, provider, status, metadata) 
         VALUES ($1, $2, $3, $4, $5)`,
        [this.config.establishmentId, printType, provider, status, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('Failed to log printing history:', error);
    }
    */
  }
}
