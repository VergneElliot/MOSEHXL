import crypto from 'crypto';
import { getRegisterIdForEstablishment } from '../utils/registerId';

export function resolveArchiveRegisterId(establishmentId?: string): string {
  return getRegisterIdForEstablishment(establishmentId);
}

export function createDigitalSignature(data: string | Buffer): string {
  const key = process.env.ARCHIVE_SECRET_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      'ARCHIVE_SECRET_KEY environment variable is required for archive signing (at least 32 characters). ' +
      'Set it in your .env file. In production it is required.'
    );
  }
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

export function verifyDigitalSignature(data: string | Buffer, signature: string): boolean {
  const expectedSignature = createDigitalSignature(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export function generateFileHash(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
