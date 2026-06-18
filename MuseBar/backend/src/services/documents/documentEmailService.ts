import { EmailService } from '../email/EmailService';
import { getEnvironmentConfig } from '../../config/environment';
import { Logger } from '../../utils/logger';
import type { ClosureBulletinData, ReceiptData } from '../printing/types';
import {
  renderClosureBulletinPdf,
  renderReceiptOrInvoicePdf,
} from './documentPdfService';
import {
  buildClosureExportData,
  buildClosurePdfFilename,
  buildClosureXlsxAttachment,
} from './closureXlsxService';
import type { Pool } from 'pg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRecipientEmail(email: unknown): string {
  const trimmed = String(email ?? '').trim();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    throw Object.assign(new Error('Adresse email destinataire invalide'), { statusCode: 400 });
  }
  return trimmed;
}

function getEmailService(): EmailService {
  const config = getEnvironmentConfig();
  const logger = Logger.getInstance(config);
  const service = EmailService.getInstance(config, logger);
  if (!service.isConfigured()) {
    throw Object.assign(
      new Error('Service email non configuré (SENDGRID_API_KEY et FROM_EMAIL requis)'),
      { statusCode: 503 }
    );
  }
  return service;
}

function toBase64Attachment(buffer: Buffer, filename: string, type: string) {
  return {
    content: buffer.toString('base64'),
    filename,
    type,
  };
}

function receiptEmailSubject(data: ReceiptData): string {
  if (data.document_kind === 'invoice') {
    return `Facture ${data.document_number ?? ''} — ${data.business_info.name}`.trim();
  }
  return `Ticket de caisse n°${data.document_number ?? data.sequence_number} — ${data.business_info.name}`;
}

function bulletinEmailSubject(data: ClosureBulletinData): string {
  return `Bulletin de clôture ${data.closure_type} — ${data.business_info.name}`;
}

function receiptEmailHtml(data: ReceiptData): string {
  const label = data.document_kind === 'invoice' ? 'facture' : 'ticket de caisse';
  const docId = data.document_number ?? String(data.sequence_number);
  return `
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint votre ${label} <strong>${docId}</strong> émis par <strong>${data.business_info.name}</strong>.</p>
    <p>Date: ${new Date(data.created_at).toLocaleString('fr-FR')}</p>
    <p>Total TTC: ${data.total_amount.toFixed(2)} EUR</p>
    <p>Cordialement,<br/>${data.business_info.name}</p>
  `;
}

function bulletinEmailHtml(data: ClosureBulletinData): string {
  return `
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint le bulletin de clôture <strong>${data.closure_type}</strong> pour la période du ${data.period_start.slice(0, 10)} au ${data.period_end.slice(0, 10)}.</p>
    <p>Établissement: <strong>${data.business_info.name}</strong></p>
    <p>Total TTC: ${data.total_amount.toFixed(2)} EUR</p>
    <p>Cordialement,<br/>${data.business_info.name}</p>
  `;
}

export async function emailReceiptDocument(
  data: ReceiptData,
  to: string
): Promise<{ trackingId: string; message: string }> {
  const recipient = validateRecipientEmail(to);
  const pdf = await renderReceiptOrInvoicePdf(data);
  const filename =
    data.document_kind === 'invoice'
      ? `${data.document_number ?? 'facture'}.pdf`
      : `ticket-${data.document_number ?? data.sequence_number}.pdf`;

  const emailService = getEmailService();
  const trackingId = await emailService.sendEmail({
    to: recipient,
    subject: receiptEmailSubject(data),
    html: receiptEmailHtml(data),
    text: `Votre document ${data.document_number ?? data.sequence_number} est joint en PDF.`,
    attachments: [toBase64Attachment(pdf, filename, 'application/pdf')],
    trackingId: `doc-receipt-${data.order_id}-${Date.now()}`,
  });

  return { trackingId, message: `Email envoyé à ${recipient}` };
}

export async function emailClosureBulletinDocument(
  pool: Pool,
  establishmentId: string,
  data: ClosureBulletinData,
  to: string
): Promise<{ trackingId: string; message: string; attachments: string[] }> {
  const recipient = validateRecipientEmail(to);
  const exportData = await buildClosureExportData(pool, establishmentId, data);
  const pdf = await renderClosureBulletinPdf(data, exportData);
  const attachments = [
    toBase64Attachment(pdf, buildClosurePdfFilename(data), 'application/pdf'),
  ];

  const xlsxAttachment = await buildClosureXlsxAttachment(pool, establishmentId, data, exportData);
  attachments.push(
    toBase64Attachment(xlsxAttachment.buffer, xlsxAttachment.filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  );

  const emailService = getEmailService();
  const trackingId = await emailService.sendEmail({
    to: recipient,
    subject: bulletinEmailSubject(data),
    html: bulletinEmailHtml(data),
    text: `Bulletin de clôture ${data.closure_type} joint en PDF et Excel.`,
    attachments,
    trackingId: `doc-closure-${data.id}-${Date.now()}`,
  });

  return {
    trackingId,
    message: `Email envoyé à ${recipient}`,
    attachments: attachments.map((a) => a.filename),
  };
}
