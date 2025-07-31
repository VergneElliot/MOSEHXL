# Setup Printer Bridge Service

This guide will help you set up a TypeScript bridge service on your local machine that forwards print requests from the cloud server to your thermal printer.

## Step 1: Create the Bridge Service Directory

On your local machine (where you're running this), create a new directory for the bridge service:

```bash
mkdir printer-bridge
cd printer-bridge
```

## Step 2: Copy the Files

Copy these files to your `printer-bridge` directory:

### 1. Copy the TypeScript bridge service:
```bash
# Copy the printer-bridge.ts file to your printer-bridge directory
cp /path/to/your/project/scripts/printer-bridge.ts ./printer-bridge.ts
```

### 2. Create package.json:
```bash
# Create package.json with the content provided
cat > package.json << 'EOL'
{
  "name": "printer-bridge",
  "version": "1.0.0",
  "description": "Local bridge service to forward print requests from cloud server to thermal printer",
  "main": "dist/printer-bridge.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/printer-bridge.js",
    "dev": "ts-node printer-bridge.ts"
  },
  "dependencies": {
    "@types/node": "^20.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
EOL
```

### 3. Create tsconfig.json:
```bash
cat > tsconfig.json << 'EOL'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "printer-bridge.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOL
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Update Printer IP Address

Edit the `printer-bridge.ts` file and update the printer IP address:

```bash
nano printer-bridge.ts
```

Find this line:
```typescript
private readonly PRINTER_IP = '192.168.0.241'; // Your printer's IP
```

And change it to your actual printer IP address.

## Step 5: Build and Test the Bridge Service

```bash
# Build the TypeScript code
npm run build

# Start the bridge service
npm start
```

You should see output like:
```
🔧 Starting Printer Bridge Service...
🚀 Printer Bridge running on port 3002
📡 Ready to forward print requests to 192.168.0.241:9100
🌐 Accessible from: http://localhost:3002/print
```

## Step 6: Test the Bridge Service Locally

In another terminal, test the bridge service:

```bash
# Test with a simple print request
curl -X POST http://localhost:3002/print \
  -H "Content-Type: application/json" \
  -d '{"content": "Test print content"}'
```

You should get a response like:
```json
{"success": true, "message": "Receipt sent to printer successfully"}
```

## Step 7: Update the Cloud Server

Now we need to update the cloud server to send print requests to your local bridge service.

### Get Your Local Machine's Public IP

You need to find your local machine's public IP address so the cloud server can reach it:

```bash
# Find your public IP
curl ifconfig.me
# or
curl ipinfo.io/ip
```

### Update the Cloud Server's Thermal Print Service

SSH into your cloud server:

```bash
ssh root@209.38.223.92
cd /var/www/MOSEHXL/MuseBar/backend/src/utils
nano thermalPrintService.ts
```

Replace the `printReceipt` method with this version:

```typescript
static async printReceipt(receiptData: ReceiptData): Promise<{ success: boolean; message: string }> {
  try {
    const content = this.generateReceiptContent(receiptData);
    
    // Try to send to local bridge service
    const bridgeResult = await this.sendToBridgeService(content);
    if (bridgeResult.success) {
      return bridgeResult;
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

private static async sendToBridgeService(content: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const http = require('http');
    const data = JSON.stringify({ content });
    
    const options = {
      hostname: 'YOUR_LOCAL_MACHINE_PUBLIC_IP', // Replace with your public IP
      port: 3002,
      path: '/print',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res: any) => {
      let responseData = '';
      res.on('data', (chunk: Buffer) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          resolve({
            success: false,
            message: 'Invalid response from bridge service'
          });
        }
      });
    });
    
    req.on('error', (error: Error) => {
      resolve({
        success: false,
        message: `Bridge service error: ${error.message}`
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        success: false,
        message: 'Bridge service timeout'
      });
    });
    
    req.write(data);
    req.end();
  });
}
```

**Important:** Replace `YOUR_LOCAL_MACHINE_PUBLIC_IP` with your actual public IP address.

## Step 8: Configure Port Forwarding

You need to configure your router to forward port 3002 to your local machine:

1. **Log into your router** (usually `192.168.0.1` or `192.168.1.1`)
2. **Find "Port Forwarding" or "Virtual Server"**
3. **Add a new rule:**
   - External Port: `3002`
   - Internal IP: `YOUR_LOCAL_MACHINE_IP` (your computer's local IP)
   - Internal Port: `3002`
   - Protocol: TCP

## Step 9: Build and Restart the Cloud Server

```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm run build
pm2 restart musebar-backend
```

## Step 10: Test the Complete Setup

1. **Make sure your bridge service is running** on your local machine
2. **Test the thermal print** from your web interface
3. **Check the bridge service logs** to see if requests are coming through

## Troubleshooting

### If the bridge service can't connect to the printer:
- Check that the printer IP address is correct
- Verify the printer is on the same network
- Test with `telnet 192.168.0.241 9100`

### If the cloud server can't reach the bridge service:
- Check that port forwarding is configured correctly
- Verify your public IP address is correct
- Test with `curl http://YOUR_PUBLIC_IP:3002/print`

### If the bridge service isn't receiving requests:
- Check that the bridge service is running on port 3002
- Verify the cloud server is using the correct public IP
- Check firewall settings on your local machine

Let me know when you've completed each step and I'll help you troubleshoot any issues! 