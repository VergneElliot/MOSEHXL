import { EnvironmentConfig } from '../../config/environment';
import { LogEntry, LogLevel } from './types';

export function formatLogEntry(entry: LogEntry, config: EnvironmentConfig): string {
  const { timestamp, level, message, metadata, context, requestId, userId, duration, error } = entry;

  let formattedMessage = `[${timestamp}] ${level.toUpperCase()}`;

  if (context) formattedMessage += ` [${context}]`;
  if (requestId) formattedMessage += ` [${requestId}]`;
  if (userId) formattedMessage += ` [User:${userId}]`;

  formattedMessage += `: ${message}`;

  if (duration !== undefined) formattedMessage += ` (${duration}ms)`;

  if (metadata && Object.keys(metadata).length > 0) {
    formattedMessage += ` | Metadata: ${JSON.stringify(metadata)}`;
  }

  if (error) {
    formattedMessage += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack && config.app.environment === 'development') {
      formattedMessage += `\n  Stack: ${error.stack}`;
    }
  }

  return formattedMessage;
}

export function writeToConsole(level: keyof typeof LogLevel, message: string): void {
  const colors = {
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
    INFO: '\x1b[36m',
    DEBUG: '\x1b[37m',
  } as const;

  const reset = '\x1b[0m';
  const colorCode = colors[level] || colors.INFO;
  process.stdout.write(`${colorCode}${message}${reset}\n`);
}


