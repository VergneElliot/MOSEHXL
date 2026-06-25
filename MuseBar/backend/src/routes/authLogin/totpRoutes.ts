import { Router } from 'express';
import QRCode from 'qrcode';
import speakeasy from 'speakeasy';

import { deriveCanonicalRole } from '../../auth/roleVocabulary';
import { requireAuth } from '../../middleware/auth';
import {
  AppError,
  asyncHandler,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../middleware/errorHandler';
import { UserModel } from '../../models/user';
import { isAdminTwoFactorEnforced, requiresAdminTwoFactor, TOTP_ISSUER } from './config';
import { logAuditOrThrow } from './sideEffects';

const totpRoutes = Router();

totpRoutes.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const role = deriveCanonicalRole({
    roleFromDb: dbUser.role,
    isAdminFlag: dbUser.is_admin,
    establishmentId: dbUser.establishment_id,
  });

  return res.json({
    enabled: dbUser.mfa_totp_enabled === true,
    required_for_role: isAdminTwoFactorEnforced() && requiresAdminTwoFactor(role),
    role,
  });
}));

totpRoutes.post('/setup', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const generatedSecret = speakeasy.generateSecret({
    length: 20,
    name: `${TOTP_ISSUER}:${dbUser.email}`,
    issuer: TOTP_ISSUER,
  });
  const secret = generatedSecret.base32;
  const otpauthUrl = generatedSecret.otpauth_url;
  if (!secret || !otpauthUrl) {
    throw new AppError('Failed to generate TOTP setup material', 500, 'MFA_TOTP_SETUP_GENERATION_FAILED');
  }
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  await UserModel.setMfaTotpSecret(userId, secret);

  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_SETUP_STARTED',
    action_details: { issuer: TOTP_ISSUER },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_SETUP_STARTED');

  return res.json({
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  });
}));

totpRoutes.post('/enable', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code) {
    throw new ValidationError('code is required');
  }

  const mfaState = await UserModel.getMfaTotpState(userId);
  if (!mfaState?.mfa_totp_secret) {
    throw new ValidationError('TOTP setup is required before enabling two-factor authentication');
  }

  if (!speakeasy.totp.verify({
    secret: mfaState.mfa_totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  })) {
    throw new ValidationError('Invalid two-factor authentication code');
  }

  await UserModel.enableMfaTotp(userId);
  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_ENABLED',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_ENABLED');

  return res.json({ message: 'Two-factor authentication enabled' });
}));

totpRoutes.post('/disable', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!code || !password) {
    throw new ValidationError('code and password are required');
  }

  const dbUser = await UserModel.findById(userId);
  if (!dbUser) {
    throw new NotFoundError('User');
  }

  const validPassword = await UserModel.verifyPassword(dbUser, password);
  if (!validPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  const mfaState = await UserModel.getMfaTotpState(userId);
  if (!mfaState?.mfa_totp_enabled || !mfaState.mfa_totp_secret) {
    throw new ValidationError('Two-factor authentication is not enabled');
  }
  if (!speakeasy.totp.verify({
    secret: mfaState.mfa_totp_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  })) {
    throw new ValidationError('Invalid two-factor authentication code');
  }

  await UserModel.disableMfaTotp(userId);
  await logAuditOrThrow({
    user_id: String(userId),
    action_type: 'MFA_TOTP_DISABLED',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'MFA_TOTP_DISABLED');

  return res.json({ message: 'Two-factor authentication disabled' });
}));

export default totpRoutes;
