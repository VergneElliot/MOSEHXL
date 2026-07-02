import type { Response as ExpressResponse } from 'express';

import { getLogger } from '../../utils/logger';
import { AppError, NotFoundError, ValidationError } from '../../middleware/errorHandler';

export function sendPdfDownload(res: ExpressResponse, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export function sendXlsxDownload(res: ExpressResponse, buffer: Buffer, filename: string): void {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export function mapDocumentRouteError(error: unknown, fallbackCode: string): never {
  if (error instanceof AppError) throw error;
  const e = error as { statusCode?: number; message?: string };
  if (e?.statusCode === 404) throw new NotFoundError('Document');
  if (e?.statusCode === 400) throw new ValidationError(e.message ?? 'Invalid request');
  if (e?.statusCode === 422) throw new ValidationError(e.message ?? 'Compliance validation failed');
  if (e?.statusCode === 503) throw new AppError(e.message ?? 'Email service unavailable', 503, 'EMAIL_SERVICE_NOT_CONFIGURED');
  const message = e?.message ?? (error instanceof Error ? error.message : 'Unknown error');
  if (
    message.includes('SendGrid') ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('from_email')
  ) {
    throw new AppError(message, 503, 'EMAIL_PROVIDER_ERROR');
  }
  getLogger().error('Document route error', error instanceof Error ? error : undefined);
  throw new AppError(message, 500, fallbackCode);
}
