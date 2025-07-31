import * as http from 'http';
import * as net from 'net';

interface PrintRequest {
  content: string;
  type?: 'receipt' | 'bulletin';
}

interface PrintResponse {
  success: boolean;
  message: string;
}

class PrinterBridge {
  private readonly PRINTER_IP = '192.168.0.241'; // Your printer's IP
  private readonly PRINTER_PORT = 9100;
  private readonly SERVER_PORT = 3002;

  constructor() {
    this.startServer();
  }

  private startServer(): void {
    const server = http.createServer((req, res) => {
      // Set CORS headers to allow requests from the cloud server
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/print') {
        this.handlePrintRequest(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Endpoint not found' 
        }));
      }
    });

    server.listen(this.SERVER_PORT, '0.0.0.0', () => {
      console.log(`🚀 Printer Bridge running on port ${this.SERVER_PORT}`);
      console.log(`📡 Ready to forward print requests to ${this.PRINTER_IP}:${this.PRINTER_PORT}`);
      console.log(`🌐 Accessible from: http://localhost:${this.SERVER_PORT}/print`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
  }

  private handlePrintRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    let data = '';
    
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });

    req.on('end', () => {
      try {
        const printRequest: PrintRequest = JSON.parse(data);
        
        if (!printRequest.content) {
          this.sendResponse(res, {
            success: false,
            message: 'No content provided'
          });
          return;
        }

        this.sendToPrinter(printRequest.content)
          .then((result: PrintResponse) => {
            this.sendResponse(res, result);
          })
          .catch((error: Error) => {
            this.sendResponse(res, {
              success: false,
              message: `Print error: ${error.message}`
            });
          });

      } catch (error) {
        this.sendResponse(res, {
          success: false,
          message: `Invalid request format: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    });

    req.on('error', (error: Error) => {
      this.sendResponse(res, {
        success: false,
        message: `Request error: ${error.message}`
      });
    });
  }

  private sendToPrinter(content: string): Promise<PrintResponse> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      
      // Set timeout
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Connection timeout'));
      }, 10000);

      client.connect(this.PRINTER_PORT, this.PRINTER_IP, () => {
        console.log(`✅ Connected to printer at ${this.PRINTER_IP}:${this.PRINTER_PORT}`);
        clearTimeout(timeout);
        
        // Send the print content
        client.write(content, 'binary', (error) => {
          if (error) {
            client.destroy();
            reject(new Error(`Write error: ${error.message}`));
          } else {
            console.log('📄 Content sent to printer');
            client.end();
          }
        });
      });

      client.on('close', () => {
        console.log('🔌 Connection to printer closed');
        clearTimeout(timeout);
        resolve({
          success: true,
          message: 'Receipt sent to printer successfully'
        });
      });

      client.on('error', (error: Error) => {
        console.error('❌ Printer connection error:', error.message);
        clearTimeout(timeout);
        reject(new Error(`Printer connection failed: ${error.message}`));
      });
    });
  }

  private sendResponse(res: http.ServerResponse, response: PrintResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  }
}

// Start the bridge service
console.log('🔧 Starting Printer Bridge Service...');
new PrinterBridge();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Printer Bridge...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Printer Bridge...');
  process.exit(0);
}); 