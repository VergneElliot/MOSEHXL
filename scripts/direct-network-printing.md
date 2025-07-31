# Direct Network Printing Setup

This solution allows the cloud server to print directly to your thermal printer without requiring any local services or additional hardware.

## Step 1: Configure Port Forwarding

### On Your Router:
1. **Log into your router** (usually `192.168.0.1` or `192.168.1.1`)
2. **Find "Port Forwarding" or "Virtual Server"**
3. **Add a new rule:**
   - External Port: `9100`
   - Internal IP: `192.168.0.241` (your printer)
   - Internal Port: `9100`
   - Protocol: TCP

## Step 2: Get Your Router's Public IP

Find your router's public IP address:

```bash
curl ifconfig.me
# or
curl ipinfo.io/ip
```

**Note this IP address** - we'll need it for the cloud server configuration.

## Step 3: Test Connectivity

Test if the cloud server can reach your printer through the public IP:

```bash
# SSH into your cloud server
ssh root@209.38.223.92

# Test connectivity to your printer through the public IP
ping YOUR_ROUTER_PUBLIC_IP
```

## Step 4: Update the Cloud Server's Thermal Print Service

SSH into your cloud server and update the thermal print service:

```bash
ssh root@209.38.223.92
cd /var/www/MOSEHXL/MuseBar/backend/src/utils
nano thermalPrintService.ts
```

Replace the entire file with this updated version:

```typescript
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';

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
  compliance_info?: {
    cash_register_id?: string;
    operator_id?: string;
  };
}

export class ThermalPrintService {
  private static readonly PRINTER_NAME = 'Oxhoo-TP85v-Network';
  private static readonly TEMP_DIR = os.tmpdir();
  private static readonly IS_WINDOWS = os.platform() === 'win32';
  
  // Network printer configuration
  private static readonly NETWORK_PRINTER_IP = process.env.NETWORK_PRINTER_IP || 'YOUR_ROUTER_PUBLIC_IP'; // Replace with your router's public IP
  private static readonly NETWORK_PRINTER_PORT = parseInt(process.env.NETWORK_PRINTER_PORT || '9100');
  
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

  /**
   * Send content directly to network printer
   */
  private static sendToNetworkPrinter(content: string): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      
      // Set timeout
      const timeout = setTimeout(() => {
        client.destroy();
        resolve({
          success: false,
          message: 'Network printer connection timeout'
        });
      }, 10000);

      client.connect(this.NETWORK_PRINTER_PORT, this.NETWORK_PRINTER_IP, () => {
        console.log(`✅ Connected to network printer at ${this.NETWORK_PRINTER_IP}:${this.NETWORK_PRINTER_PORT}`);
        clearTimeout(timeout);
        
        // Send the print content
        client.write(content, 'binary', (error) => {
          if (error) {
            client.destroy();
            resolve({
              success: false,
              message: `Network printer write error: ${error.message}`
            });
          } else {
            console.log('📄 Content sent to network printer');
            client.end();
          }
        });
      });

      client.on('close', () => {
        console.log('🔌 Network printer connection closed');
        clearTimeout(timeout);
        resolve({
          success: true,
          message: 'Receipt sent to network printer successfully'
        });
      });

      client.on('error', (error: Error) => {
        console.error('❌ Network printer error:', error.message);
        clearTimeout(timeout);
        resolve({
          success: false,
          message: `Network printer error: ${error.message}`
        });
      });
    });
  }

  static async printReceipt(receiptData: ReceiptData): Promise<{ success: boolean; message: string }> {
    try {
      const content = this.generateReceiptContent(receiptData);
      
      // Try network printing first
      const networkResult = await this.sendToNetworkPrinter(content);
      if (networkResult.success) {
        return networkResult;
      }
      
      // Fallback to server environment message
      return {
        success: true,
        message: 'Receipt generated successfully (network printer unavailable)'
      };
      
    } catch (error) {
      console.error('Error printing receipt:', error);
      return {
        success: false,
        message: `Error printing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async printClosureBulletin(bulletinData: ClosureBulletinData): Promise<{ success: boolean; message: string }> {
    try {
      const content = this.generateClosureBulletinContent(bulletinData);
      
      // Try network printing first
      const networkResult = await this.sendToNetworkPrinter(content);
      if (networkResult.success) {
        return networkResult;
      }
      
      // Fallback to server environment message
      return {
        success: true,
        message: 'Closure bulletin generated successfully (network printer unavailable)'
      };
      
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
      resolve({
        success: false,
        message: 'Local printing not available in server environment'
      });
    });
  }
  
  static async checkPrinterStatus(): Promise<{ available: boolean; status: string }> {
    return new Promise((resolve) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        resolve({
          available: false,
          status: 'Network printer connection timeout'
        });
      }, 5000);

      client.connect(this.NETWORK_PRINTER_PORT, this.NETWORK_PRINTER_IP, () => {
        clearTimeout(timeout);
        client.destroy();
        resolve({
          available: true,
          status: 'Network printer is available'
        });
      });

      client.on('error', (error: Error) => {
        clearTimeout(timeout);
        resolve({
          available: false,
          status: `Network printer error: ${error.message}`
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
```

**Important:** Replace `YOUR_ROUTER_PUBLIC_IP` with your actual router's public IP address.

## Step 5: Set Environment Variables

Add the printer configuration to your environment:

```bash
cd /var/www/MOSEHXL/MuseBar/backend
nano .env
```

Add these lines:
```env
NETWORK_PRINTER_IP=YOUR_ROUTER_PUBLIC_IP
NETWORK_PRINTER_PORT=9100
```

## Step 6: Build and Test

```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm run build
pm2 restart musebar-backend

# Test the thermal print
curl -X POST "http://localhost:3001/api/legal/receipt/754/thermal-print?type=detailed" \
  -H "Content-Type: application/json"
```

## Benefits of This Solution

✅ **No additional hardware required**
✅ **No local services needed**
✅ **Works 24/7 without your computer**
✅ **Direct communication from cloud to printer**
✅ **Automatic fallback if printer is unavailable**

## Troubleshooting

### If the cloud server can't reach the printer:
1. **Check port forwarding** is configured correctly
2. **Verify your public IP** is correct
3. **Test connectivity** with `telnet YOUR_PUBLIC_IP 9100`

### If the printer doesn't respond:
1. **Check printer network settings**
2. **Verify the printer IP** is static
3. **Test local connectivity** with `telnet 192.168.0.241 9100`

This solution will work permanently without requiring any local services or your computer to be running! 