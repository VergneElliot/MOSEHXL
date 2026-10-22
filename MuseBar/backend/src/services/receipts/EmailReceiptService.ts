/**
 * @deprecated Use SendGrid via services/documents/documentEmailService.ts and
 * POST /api/printing/{receipt|invoice|closure}/:id/email routes.
 * This Nodemailer-based service is not wired to any HTTP route.
 */
import * as nodemailer from 'nodemailer';
import { ReceiptData, ClosureBulletinData } from '../printing/types';
import * as QRCode from 'qrcode';
import { generateReceiptHTML } from './emailReceiptHtml';
import { generateClosureBulletinHTML } from './emailClosureHtml';

interface EmailConfig {
  from: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export class EmailReceiptService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor(config?: EmailConfig) {
    this.config = config || {
      from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || 'noreply@mosehxl.com',
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || ''
        }
      }
    };

    this.transporter = nodemailer.createTransport(this.config.smtp);
  }

  async sendReceipt(data: ReceiptData, email: string): Promise<void> {
    const html = generateReceiptHTML(data);
    const qrCode = await this.generateQRCode(data.order_id);

    await this.transporter.sendMail({
      from: this.config.from,
      to: email,
      subject: `Reçu #${data.sequence_number} - ${data.business_info.name}`,
      html: html,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrCode,
          cid: 'qrcode'
        }
      ]
    });
  }

  async sendClosureBulletin(data: ClosureBulletinData, email: string): Promise<void> {
    const html = generateClosureBulletinHTML(data);

    await this.transporter.sendMail({
      from: this.config.from,
      to: email,
      subject: `Bulletin de Clôture #${data.id} - ${data.business_info.name}`,
      html: html
    });
  }

  private async generateQRCode(orderId: number): Promise<Buffer> {
    const url = `${process.env.APP_URL || 'http://localhost:3000'}/receipts/${orderId}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 2
    });

    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }
}
