# Manual Thermal Printer Fix Deployment

Since we don't have direct SSH access to the server, here are the exact commands you need to run on your cloud server at `209.38.223.92` to fix the thermal printer issue.

## Step 1: Connect to Your Server

SSH into your server:
```bash
ssh root@209.38.223.92
```

## Step 2: Backup Current Files

```bash
cd /var/www/MOSEHXL
cp MuseBar/backend/src/utils/thermalPrintService.ts MuseBar/backend/src/utils/thermalPrintService.ts.backup
cp MuseBar/backend/src/routes/legal.ts MuseBar/backend/src/routes/legal.ts.backup
```

## Step 3: Update the Thermal Print Service

Replace the content of `/var/www/MOSEHXL/MuseBar/backend/src/utils/thermalPrintService.ts` with the updated version:

```bash
cat > /var/www/MOSEHXL/MuseBar/backend/src/utils/thermalPrintService.ts << 'EOL'
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface ReceiptData {
  order_id: number;
  sequence_number: number;
  total_amount: number;
  total_tax: number;
  payment_method: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate: number;
  }>;
  business_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  };
  vat_breakdown?: Array<{
    rate: number;
    subtotal_ht: number;
    vat: number;
  }>;
  receipt_type: 'detailed' | 'summary';
  tips?: number;
  change?: number;
  compliance_info?: {
    receipt_hash?: string;
    cash_register_id?: string;
    operator_id?: string;
  };
}

interface ClosureBulletinData {
  id: number;
  closure_type: 'DAILY' | 'MONTHLY' | 'ANNUAL';
  period_start: string;
  period_end: string;
  total_transactions: number;
  total_amount: number;
  total_vat: number;
  vat_breakdown: {
    vat_10: { amount: number; vat: number };
    vat_20: { amount: number; vat: number };
  };
  payment_methods_breakdown: { [key: string]: number };
  first_sequence: number;
  last_sequence: number;
  closure_hash: string;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  tips_total?: number;
  change_total?: number;
  business_info: {
    name: string;
    address: string;
    phone: string;
    email: string;
    siret?: string;
    tax_identification?: string;
  };
}

export class ThermalPrintService {
  private static readonly PRINTER_NAME = 'Oxhoo-TP85v-Network';
  private static readonly TEMP_DIR = os.tmpdir();
  private static readonly IS_WINDOWS = os.platform() === 'win32';
  
  // ESC/POS Commands
  private static readonly ESC = '\x1B';
  private static readonly INIT = '\x1B@';
  private static readonly BOLD_ON = '\x1B\x45\x01';
  private static readonly BOLD_OFF = '\x1B\x45\x00';
  private static readonly CENTER = '\x1B\x61\x01';
  private static readonly LEFT = '\x1B\x61\x00';
  private static readonly CUT = '\x1D\x56\x00';
  private static readonly DOUBLE_HEIGHT = '\x1B\x21\x10';
  private static readonly NORMAL_SIZE = '\x1B\x21\x00';
  
  /**
   * Check if we're running on a server environment (no physical printer)
   */
  private static isServerEnvironment(): boolean {
    const hostname = os.hostname();
    const env = process.env.NODE_ENV || '';
    
    const cloudPatterns = [
      /^digitalocean/i,
      /^aws/i,
      /^ec2/i,
      /^azure/i,
      /^gcp/i,
      /^cloud/i,
      /^server/i,
      /^prod/i,
      /^staging/i
    ];
    
    return cloudPatterns.some(pattern => pattern.test(hostname)) || 
           env === 'production' || 
           env === 'staging';
  }

  /**
   * Generate thermal receipt content in ESC/POS format
   */
  private static generateReceiptContent(data: ReceiptData): string {
    let content = '';
    
    content += this.INIT;
    
    content += this.CENTER + this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += data.business_info.name + '\n';
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    content += data.business_info.address + '\n';
    content += `Tel: ${data.business_info.phone}\n`;
    content += `Email: ${data.business_info.email}\n`;
    
    if (data.business_info.siret) {
      content += `SIRET: ${data.business_info.siret}\n`;
    }
    if (data.business_info.tax_identification) {
      content += `TVA: ${data.business_info.tax_identification}\n`;
    }
    
    content += this.LEFT;
    content += '================================\n';
    
    content += this.BOLD_ON;
    content += `RECU #${data.sequence_number}\n`;
    content += this.BOLD_OFF;
    content += `Commande: ${data.order_id}\n`;
    content += `Date: ${new Date(data.created_at).toLocaleString('fr-FR')}\n`;
    content += `Paiement: ${this.formatPaymentMethod(data.payment_method)}\n`;
    
    content += '================================\n';
    
    if (data.items && data.receipt_type === 'detailed') {
      content += this.BOLD_ON + 'ARTICLES\n' + this.BOLD_OFF;
      
      for (const item of data.items) {
        const itemLine = `${item.product_name} (${item.quantity} x ${item.unit_price.toFixed(2)} €)`;
        const totalLine = `${item.total_price.toFixed(2)} €`;
        content += this.padLine(itemLine, totalLine, 32) + '\n';
      }
      
      content += '================================\n';
    }
    
    if (data.vat_breakdown && data.vat_breakdown.length > 0) {
      content += this.BOLD_ON + 'BREVET D\'IMPÔT SUR LA VALEUR AJOUTÉE (TVA)\n' + this.BOLD_OFF;
      
      for (const vat of data.vat_breakdown) {
        const baseLine = `Base HT (${vat.rate}%): ${vat.subtotal_ht.toFixed(2)} €`;
        const vatLine = `TVA ${vat.rate}%: ${vat.vat.toFixed(2)} €`;
        content += baseLine + '\n';
        content += vatLine + '\n';
      }
      
      content += `TVA Totale: ${data.total_tax.toFixed(2)} €\n`;
      content += `Sous-total HT: ${(data.total_amount - data.total_tax).toFixed(2)} €\n`;
      content += '================================\n';
    }
    
    if (data.tips && data.tips > 0) {
      content += `Pourboire: ${data.tips.toFixed(2)} €\n`;
    }
    if (data.change && data.change > 0) {
      content += `Monnaie: ${data.change.toFixed(2)} €\n`;
    }
    
    content += this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += `TOTAL TTC: ${data.total_amount.toFixed(2)} €\n`;
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    
    if (data.compliance_info) {
      content += '================================\n';
      content += `Hash: ${data.compliance_info.receipt_hash}\n`;
      content += `Caisse: ${data.compliance_info.cash_register_id}\n`;
      content += `Opérateur: ${data.compliance_info.operator_id}\n`;
    }
    
    content += this.CUT;
    
    return content;
  }

  private static generateClosureBulletinContent(data: ClosureBulletinData): string {
    let content = '';
    
    content += this.INIT;
    
    content += this.CENTER + this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += data.business_info.name + '\n';
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    content += data.business_info.address + '\n';
    content += `Tel: ${data.business_info.phone}\n`;
    content += `Email: ${data.business_info.email}\n`;
    
    if (data.business_info.siret) {
      content += `SIRET: ${data.business_info.siret}\n`;
    }
    if (data.business_info.tax_identification) {
      content += `TVA: ${data.business_info.tax_identification}\n`;
    }
    
    content += this.LEFT;
    content += '================================\n';
    
    content += this.BOLD_ON + this.DOUBLE_HEIGHT;
    content += `BULLETIN DE CLÔTURE\n`;
    content += this.NORMAL_SIZE + this.BOLD_OFF;
    content += `Type: ${this.formatClosureType(data.closure_type)}\n`;
    content += `Période: ${new Date(data.period_start).toLocaleDateString('fr-FR')} - ${new Date(data.period_end).toLocaleDateString('fr-FR')}\n`;
    
    content += '================================\n';
    
    content += this.BOLD_ON + 'RÉSUMÉ\n' + this.BOLD_OFF;
    content += `Transactions: ${data.total_transactions}\n`;
    content += `Montant total: ${data.total_amount.toFixed(2)} €\n`;
    content += `TVA totale: ${data.total_vat.toFixed(2)} €\n`;
    
    if (data.tips_total && data.tips_total > 0) {
      content += `Pourboires: ${data.tips_total.toFixed(2)} €\n`;
    }
    if (data.change_total && data.change_total > 0) {
      content += `Monnaie: ${data.change_total.toFixed(2)} €\n`;
    }
    
    content += '================================\n';
    
    content += this.BOLD_ON + 'SÉQUENCES\n' + this.BOLD_OFF;
    content += `Première: ${data.first_sequence}\n`;
    content += `Dernière: ${data.last_sequence}\n`;
    
    content += '================================\n';
    
    if (data.compliance_info) {
      content += `Hash de clôture: ${data.closure_hash}\n`;
      content += `Caisse: ${data.compliance_info.cash_register_id}\n`;
      content += `Opérateur: ${data.compliance_info.operator_id}\n`;
    }
    
    content += this.CUT;
    
    return content;
  }

  private static formatPaymentMethod(method: string): string {
    const methods: { [key: string]: string } = {
      'cash': 'Espèces',
      'card': 'Carte Bancaire',
      'check': 'Chèque',
      'transfer': 'Virement'
    };
    return methods[method] || method;
  }

  private static formatClosureType(type: string): string {
    const types: { [key: string]: string } = {
      'DAILY': 'Quotidien',
      'WEEKLY': 'Hebdomadaire',
      'MONTHLY': 'Mensuel',
      'ANNUAL': 'Annuel'
    };
    return types[type] || type;
  }

  private static padLine(left: string, right: string, width: number): string {
    const padding = width - left.length - right.length;
    if (padding <= 0) {
      return left + ' ' + right;
    }
    return left + ' '.repeat(padding) + right;
  }

  private static wrapText(text: string, width: number): string {
    const words = text.split(' ');
    let result = '';
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          result += currentLine + '\n';
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      result += currentLine.trim();
    }
    
    return result;
  }

  static async printReceipt(receiptData: ReceiptData): Promise<{ success: boolean; message: string; receipt_content?: string }> {
    try {
      if (this.isServerEnvironment()) {
        const content = this.generateReceiptContent(receiptData);
        
        return {
          success: true,
          message: 'Receipt generated successfully (server environment - no physical printer available)',
          receipt_content: content
        };
      }
      
      const content = this.generateReceiptContent(receiptData);
      
      const fileExtension = this.IS_WINDOWS ? '.txt' : '';
      const tempFile = path.join(this.TEMP_DIR, `receipt_${Date.now()}${fileExtension}`);
      await fs.writeFile(tempFile, content, 'utf8');
      
      const result = await this.sendToPrinter(tempFile);
      
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error printing receipt:', error);
      return {
        success: false,
        message: `Error printing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async printClosureBulletin(bulletinData: ClosureBulletinData): Promise<{ success: boolean; message: string; bulletin_content?: string }> {
    try {
      if (this.isServerEnvironment()) {
        const content = this.generateClosureBulletinContent(bulletinData);
        
        return {
          success: true,
          message: 'Closure bulletin generated successfully (server environment - no physical printer available)',
          bulletin_content: content
        };
      }
      
      const content = this.generateClosureBulletinContent(bulletinData);
      
      const fileExtension = this.IS_WINDOWS ? '.txt' : '';
      const tempFile = path.join(this.TEMP_DIR, `closure_bulletin_${Date.now()}${fileExtension}`);
      await fs.writeFile(tempFile, content, 'utf8');
      
      const result = await this.sendToPrinter(tempFile);
      
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error printing closure bulletin:', error);
      return {
        success: false,
        message: `Error printing closure bulletin: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  private static sendToPrinter(filePath: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      let command: string;
      let args: string[];
      
      if (this.IS_WINDOWS) {
        command = 'print';
        args = [filePath];
      } else {
        command = 'lp';
        args = ['-d', this.PRINTER_NAME, filePath];
      }
      
      const printProcess = spawn(command, args);
      
      let stdout = '';
      let stderr = '';
      
      printProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      printProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      printProcess.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            message: 'Receipt printed successfully'
          });
        } else {
          resolve({
            success: false,
            message: `Print failed: ${stderr || stdout || `Exit code ${code}`}`
          });
        }
      });
      
      printProcess.on('error', (error) => {
        resolve({
          success: false,
          message: `Print command failed: ${error.message}`
        });
      });
    });
  }
  
  static async checkPrinterStatus(): Promise<{ available: boolean; status: string }> {
    if (this.isServerEnvironment()) {
      return {
        available: false,
        status: 'No physical printer available in server environment'
      };
    }
    
    return new Promise((resolve) => {
      let command: string;
      let args: string[];
      
      if (this.IS_WINDOWS) {
        command = 'wmic';
        args = ['printer', 'where', `name="${this.PRINTER_NAME}"`, 'get', 'name,printerstatus', '/format:csv'];
      } else {
        command = 'lpstat';
        args = ['-p', this.PRINTER_NAME];
      }
      
      const statusProcess = spawn(command, args);
      
      let output = '';
      
      statusProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      statusProcess.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      statusProcess.on('close', (code) => {
        if (this.IS_WINDOWS) {
          if (code === 0 && output.includes(this.PRINTER_NAME)) {
            resolve({
              available: true,
              status: 'Printer is available'
            });
          } else {
            resolve({
              available: false,
              status: output || 'Printer not found'
            });
          }
        } else {
          if (code === 0 && output.includes('accepting requests')) {
            resolve({
              available: true,
              status: 'Printer is ready'
            });
          } else {
            resolve({
              available: false,
              status: output || 'Printer not found or not ready'
            });
          }
        }
      });
      
      statusProcess.on('error', (error) => {
        resolve({
          available: false,
          status: `Error checking printer: ${error.message}`
        });
      });
    });
  }
  
  static async testPrint(): Promise<{ success: boolean; message: string }> {
    const testData: ReceiptData = {
      order_id: 999,
      sequence_number: 999,
      total_amount: 10.00,
      total_tax: 2.00,
      payment_method: 'Carte Bancaire',
      created_at: new Date().toISOString(),
      business_info: {
        name: 'MuseBar',
        address: '4 Impasse des Hauts Mariages, 76000 Rouen',
        phone: '02 35 00 00 00',
        email: 'muse.rouen@gmail.com'
      },
      receipt_type: 'detailed',
      compliance_info: {
        receipt_hash: 'TEST-HASH-123',
        cash_register_id: 'TEST-CR-001',
        operator_id: 'TEST-OP-001'
      }
    };
    
    return this.printReceipt(testData);
  }
}
EOL
```

## Step 4: Update the Legal Routes

Replace the thermal print route in `/var/www/MOSEHXL/MuseBar/backend/src/routes/legal.ts`. Find the line that says:

```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        receipt_data: thermalPrintData
      });
    }
```

And replace it with:

```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        receipt_data: thermalPrintData,
        receipt_content: printResult.receipt_content
      });
    }
```

Also find the closure bulletin print route and replace:

```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        bulletin_data: thermalPrintData
      });
    }
```

With:

```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        bulletin_data: thermalPrintData,
        bulletin_content: printResult.bulletin_content
      });
    }
```

## Step 5: Build and Restart

```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm run build
pm2 restart musebar-backend
```

## Step 6: Test the Fix

```bash
# Test the thermal print endpoint
curl -X POST "http://localhost:3001/api/legal/receipt/754/thermal-print?type=detailed" \
  -H "Content-Type: application/json"

# Test the printer status endpoint
curl "http://localhost:3001/api/legal/thermal-printer/status"
```

## Expected Results

The thermal print endpoint should now return:
```json
{
  "success": true,
  "message": "Receipt generated successfully (server environment - no physical printer available)",
  "receipt_data": { ... },
  "receipt_content": "ESC/POS formatted content..."
}
```

And the printer status should return:
```json
{
  "available": false,
  "status": "No physical printer available in server environment"
}
```

## Verification

After running these commands, try using the thermal print button in your web interface. It should now work without the "spawn lp ENOENT" error and show a success message instead. 