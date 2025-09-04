/**
 * Print Operations
 * Handles actual printing operations and platform-specific logic
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PrinterConfig } from './types';

/**
 * Print operations manager
 */
export class PrintOperations {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  /**
   * Print content to thermal printer
   */
  public async printContent(content: string, jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Print job ${jobId} timed out`));
      }, this.config.timeout || 30000);

      try {
        if (process.platform === 'win32') {
          this.printWindows(content, timeout, resolve, reject);
        } else {
          this.printUnix(content, timeout, resolve, reject);
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Print on Windows systems
   */
  private printWindows(
    content: string,
    timeout: NodeJS.Timeout,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    // For Windows, we'll use the print command or a specific thermal printer driver
    const printProcess = spawn('cmd', ['/c', 'echo', content, '|', 'print', `/D:${this.config.devicePath}`], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    printProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    printProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Print process exited with code ${code}`));
      }
    });

    printProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  }

  /**
   * Print on Unix-like systems (Linux, macOS)
   */
  private printUnix(
    content: string,
    timeout: NodeJS.Timeout,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    const printProcess = spawn('lp', ['-d', this.config.devicePath, '-'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    printProcess.stdin.write(content);
    printProcess.stdin.end();

    printProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Print process exited with code ${code}`));
      }
    });

    printProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  }

  /**
   * Test printer connectivity
   */
  public async testPrinter(): Promise<boolean> {
    try {
      const testContent = '\x1B\x40'; // ESC @ - Initialize printer
      await this.printContent(testContent, 'test');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update printer configuration
   */
  public updateConfig(config: Partial<PrinterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current printer configuration
   */
  public getConfig(): PrinterConfig {
    return { ...this.config };
  }

  /**
   * Create temporary file for large print jobs
   */
  public async createTempFile(content: string): Promise<string> {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.txt`);
    
    await fs.writeFile(tempFile, content, 'utf8');
    return tempFile;
  }

  /**
   * Clean up temporary file
   */
  public async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore errors when cleaning up temp files
    }
  }

  /**
   * Print from file (for large content)
   */
  public async printFromFile(filePath: string, jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Print job ${jobId} timed out`));
      }, this.config.timeout || 30000);

      const printProcess = process.platform === 'win32'
        ? spawn('cmd', ['/c', 'type', filePath, '|', 'print', `/D:${this.config.devicePath}`])
        : spawn('lp', ['-d', this.config.devicePath, filePath]);

      printProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Print process exited with code ${code}`));
        }
      });

      printProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
}
