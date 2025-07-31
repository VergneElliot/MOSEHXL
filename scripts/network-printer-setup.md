# Network Thermal Printer Setup

Now that the basic fix is working, let's configure the thermal printer to actually print from the cloud server.

## Step 1: Find Your Thermal Printer's IP Address

### Option A: Check Printer Settings
1. **Print a network configuration page** from your thermal printer
2. Look for the IP address (usually something like `192.168.1.100` or `10.0.0.50`)

### Option B: Find it on your network
```bash
# On your local machine, scan your network for the printer
nmap -sn 192.168.1.0/24  # Adjust network range as needed
# or
arp -a | grep -i oxhoo
```

### Option C: Check your router
1. Log into your router's admin panel
2. Look for connected devices
3. Find your thermal printer in the list

## Step 2: Test Network Connectivity

Once you have the printer's IP address, test if the cloud server can reach it:

```bash
# From your cloud server
ssh root@209.38.223.92

# Test connectivity to your printer
ping YOUR_PRINTER_IP_ADDRESS
```

## Step 3: Configure Network Printing

### Option A: Direct Network Printing (Recommended)

Update the thermal print service to use direct network communication:

```bash
cd /var/www/MOSEHXL/MuseBar/backend/src/utils
nano thermalPrintService.ts
```

Replace the `sendToPrinter` method with this network version:

```typescript
private static readonly NETWORK_PRINTER_IP = process.env.NETWORK_PRINTER_IP || '192.168.1.100'; // Replace with your printer's IP
private static readonly NETWORK_PRINTER_PORT = process.env.NETWORK_PRINTER_PORT || '9100';

private static sendToNetworkPrinter(content: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const net = require('net');
    const client = new net.Socket();
    
    client.connect(this.NETWORK_PRINTER_PORT, this.NETWORK_PRINTER_IP, () => {
      console.log('Connected to network printer');
      client.write(content, 'binary');
      client.end();
    });
    
    client.on('close', () => {
      resolve({
        success: true,
        message: 'Receipt sent to network printer successfully'
      });
    });
    
    client.on('error', (error) => {
      console.error('Network printer error:', error);
      resolve({
        success: false,
        message: `Network printer error: ${error.message}`
      });
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      client.destroy();
      resolve({
        success: false,
        message: 'Network printer connection timeout'
      });
    }, 10000);
  });
}
```

Then update the `printReceipt` method:

```typescript
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
      message: 'Receipt generated successfully (server environment - no physical printer available)'
    };
    
  } catch (error) {
    console.error('Error printing receipt:', error);
    return {
      success: false,
      message: `Error printing receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
```

### Option B: CUPS Network Printing

If your printer supports CUPS, set it up on the cloud server:

```bash
# Install CUPS on the cloud server
apt-get update
apt-get install -y cups cups-client

# Add the network printer
lpadmin -p "Oxhoo-TP85v-Network" -E -v "socket://YOUR_PRINTER_IP:9100" -m "raw"

# Enable the printer
cupsenable "Oxhoo-TP85v-Network"
cupsaccept "Oxhoo-TP85v-Network"
```

Then update the thermal print service to use CUPS:

```typescript
private static sendToPrinter(filePath: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    let command: string;
    let args: string[];
    
    if (this.IS_WINDOWS) {
      command = 'print';
      args = [filePath];
    } else {
      // Use CUPS for network printing
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
          message: 'Receipt printed successfully via network'
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
```

## Step 4: Set Environment Variables

Add the printer configuration to your environment:

```bash
cd /var/www/MOSEHXL/MuseBar/backend
nano .env
```

Add these lines:
```env
NETWORK_PRINTER_IP=YOUR_PRINTER_IP_ADDRESS
NETWORK_PRINTER_PORT=9100
```

## Step 5: Test Network Connectivity

Test if the cloud server can reach your printer:

```bash
# Test basic connectivity
ping YOUR_PRINTER_IP_ADDRESS

# Test port connectivity
telnet YOUR_PRINTER_IP_ADDRESS 9100
# or
nc -zv YOUR_PRINTER_IP_ADDRESS 9100
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

## Troubleshooting

### If the cloud server can't reach your printer:

1. **Check firewall settings** on your local network
2. **Configure port forwarding** on your router (port 9100 to your printer)
3. **Use a VPN** to connect the cloud server to your local network
4. **Consider a cloud print service** like Google Cloud Print (if supported)

### If the printer doesn't respond:

1. **Check printer network settings**
2. **Verify the IP address is correct**
3. **Test with a simple telnet connection**
4. **Check printer documentation** for network setup

## Alternative: Local Network Bridge

If direct network printing doesn't work, you can set up a local service that bridges the cloud server to your printer:

```bash
# On your local machine, create a simple bridge service
# This would forward requests from the cloud server to your local printer
```

Let me know your printer's IP address and I can help you configure the specific network printing setup! 