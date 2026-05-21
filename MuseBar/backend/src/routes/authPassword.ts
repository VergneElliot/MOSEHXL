import express from 'express';
import crypto from 'crypto';
import { UserModel } from '../models/user';
import { PasswordResetRequestModel } from '../models/passwordResetRequest';
import { TokenBlocklistModel } from '../models/tokenBlocklist';
import { RefreshTokenModel } from '../models/refreshToken';
import { AuditTrailModel } from '../models/auditTrail';
import { Logger } from '../utils/logger';
import { EmailService } from '../services/email/EmailService';
import { validatePasswordWithBreachCheck } from '../utils/passwordValidation';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const RESET_EXPIRATION_MINUTES = 60;

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function logAuditBestEffort(entry: Parameters<typeof AuditTrailModel.logAction>[0]): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      'Password flow audit logging failed',
      error as Error,
      'AUTH_PASSWORD'
    );
  }
}

function buildResetUrl(token: string): string {
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean)[0];
  const baseUrl = process.env.PASSWORD_RESET_BASE_URL || corsOrigin || 'http://localhost:3000';
  return `${baseUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

router.post('/password/forgot', asyncHandler(async (req, res) => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserModel.findByEmail(normalizedEmail);
  const genericMessage =
    'If an account with this email exists, a password reset link has been sent.';

  if (!user) {
    await logAuditBestEffort({
      action_type: 'PASSWORD_RESET_REQUEST_IGNORED',
      action_details: { email: normalizedEmail, reason: 'USER_NOT_FOUND' },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
    return res.json({ message: genericMessage });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_EXPIRATION_MINUTES * 60 * 1000);

  await PasswordResetRequestModel.invalidateActiveRequestsForUser(user.id);
  await PasswordResetRequestModel.createRequest({
    userId: user.id,
    email: user.email,
    tokenHash,
    expiresAt,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const resetUrl = buildResetUrl(rawToken);
  const emailService = EmailService.getInstance();
  if (emailService?.isConfigured()) {
    try {
      await emailService.sendTemplateEmail('password_reset', user.email, {
        recipientName: user.first_name || user.email,
        resetUrl,
        expirationTime: `${RESET_EXPIRATION_MINUTES} minutes`,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
    } catch (error) {
      Logger.getInstance().error(
        'Password reset email send failed',
        error as Error,
        'AUTH_PASSWORD'
      );
    }
  }

  await logAuditBestEffort({
    user_id: String(user.id),
    action_type: 'PASSWORD_RESET_REQUESTED',
    action_details: { email: user.email },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  return res.json({ message: genericMessage });
}));

router.post('/password/reset', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Token and newPassword are required' });
  }

  const passwordValidation = await validatePasswordWithBreachCheck(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error ?? 'Invalid password' });
  }

  const resetRequest = await PasswordResetRequestModel.findValidByTokenHash(hashResetToken(token));
  if (!resetRequest) {
    throw new AppError('Invalid or expired reset token', 400, 'PASSWORD_RESET_TOKEN_INVALID');
  }

  const updated = await UserModel.updatePasswordById(resetRequest.user_id, newPassword);
  if (!updated) {
    throw new AppError('Failed to update password', 500, 'PASSWORD_RESET_UPDATE_FAILED');
  }

  await PasswordResetRequestModel.markUsed(resetRequest.id);
  await TokenBlocklistModel.revokeAllUserTokensIssuedBefore(
    resetRequest.user_id,
    Math.floor(Date.now() / 1000),
    'PASSWORD_RESET'
  );
  await RefreshTokenModel.revokeAllForUser(resetRequest.user_id, 'PASSWORD_RESET');

  await logAuditBestEffort({
    user_id: String(resetRequest.user_id),
    action_type: 'PASSWORD_RESET_COMPLETED',
    action_details: {},
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  return res.json({ message: 'Password reset successful. Please log in again.' });
}));

router.post('/password/change', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (
    !currentPassword ||
    typeof currentPassword !== 'string' ||
    !newPassword ||
    typeof newPassword !== 'string'
  ) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }

  const passwordValidation = await validatePasswordWithBreachCheck(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ error: passwordValidation.error ?? 'Invalid password' });
  }

  const user = await UserModel.findById(req.user!.id);
  if (!user) {
    throw new AppError('User not found', 404, 'PASSWORD_CHANGE_USER_NOT_FOUND');
  }

  const currentPasswordValid = await UserModel.verifyPassword(user, currentPassword);
  if (!currentPasswordValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const samePassword = await UserModel.verifyPassword(user, newPassword);
  if (samePassword) {
    return res.status(400).json({ error: 'New password must be different from current password' });
  }

  const updated = await UserModel.updatePasswordById(user.id, newPassword);
  if (!updated) {
    throw new AppError('Failed to update password', 500, 'PASSWORD_CHANGE_UPDATE_FAILED');
  }

  const cutoff = Math.floor(Date.now() / 1000);
  await TokenBlocklistModel.revokeAllUserTokensIssuedBefore(user.id, cutoff, 'PASSWORD_CHANGE');
  await RefreshTokenModel.revokeAllForUser(user.id, 'PASSWORD_CHANGE');

  const authorization = req.headers.authorization;
  const currentToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (currentToken) {
    await TokenBlocklistModel.revokeToken(currentToken, {
      userId: user.id,
      reason: 'PASSWORD_CHANGE_CURRENT_TOKEN_REVOKE',
    });
  }

  await logAuditBestEffort({
    user_id: String(user.id),
    action_type: 'PASSWORD_CHANGED',
    action_details: {},
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });

  return res.json({ message: 'Password changed successfully. Please log in again.' });
}));

export default router;

