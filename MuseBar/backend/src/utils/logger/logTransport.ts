import fs from 'fs';
import path from 'path';
import { LogEntry } from './types';

export class FileTransport {
  private logsDir: string;
  private enabled: boolean;

  constructor(logsDir: string, enabled: boolean) {
    this.logsDir = logsDir;
    this.enabled = enabled;
    if (enabled && !fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  public write(entry: LogEntry): void {
    if (!this.enabled) return;
    const today = new Date().toISOString().split('T')[0];
    const filename = `${today}.log`;
    const filepath = path.join(this.logsDir, filename);
    const logLine = JSON.stringify(entry) + '\n';
    try {
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }
}


