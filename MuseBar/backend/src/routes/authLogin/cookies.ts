import crypto from 'crypto';
import express from 'express';

import { AuthenticationError, ValidationError } from '../../middleware/errorHandler';
import {
  CLIENT_SESSION_COOKIE_MAX_AGE_MS,
  computeRefreshCookieMaxAgeMs,
  getClientSessionCookieName,
  getCsrfCookieName,
  getRefreshCookieName,
} from './config';

export function getCookieValue(req: express.Request, cookieName: string): string | null {
  return getCookieValues(req, cookieName)[0] ?? null;
}

export function getCookieValues(req: express.Request, cookieName: string): string[] {
  const rawCookieHeader = req.headers.cookie;
  if (typeof rawCookieHeader !== 'string' || rawCookieHeader.length === 0) {
    return [];
  }

  return rawCookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${cookieName}=`))
    .map((cookiePair) => cookiePair.slice(cookieName.length + 1).trim())
    .filter((value) => value.length > 0)
    .map((value) => decodeURIComponent(value));
}

export function normalizeClientSessionId(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    return null;
  }
  const allowedPattern = /^[a-zA-Z0-9_-]+$/;
  if (!allowedPattern.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function resolveClientSessionId(req: express.Request, res: express.Response): string {
  const fromHeader = normalizeClientSessionId(req.header('x-client-session-id'));
  const fromCookie = normalizeClientSessionId(getCookieValue(req, getClientSessionCookieName()));
  const existing = fromHeader ?? fromCookie;
  if (existing) {
    return existing;
  }
  const minted = crypto.randomUUID();
  res.cookie(getClientSessionCookieName(), minted, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: CLIENT_SESSION_COOKIE_MAX_AGE_MS,
  });
  return minted;
}

export function getRefreshTokenFromRequest(
  req: express.Request,
  options?: { allowBodyFallback?: boolean }
): string | null {
  const allowBodyFallback = options?.allowBodyFallback === true;
  const refreshFromCookie = getCookieValue(req, getRefreshCookieName());
  if (refreshFromCookie) {
    return refreshFromCookie;
  }
  if (!allowBodyFallback) {
    return null;
  }
  const bodyToken = req.body?.refreshToken;
  return typeof bodyToken === 'string' && bodyToken.trim().length > 0 ? bodyToken.trim() : null;
}

export function setRefreshTokenCookie(
  res: express.Response,
  refreshToken: string,
  rememberMe: boolean,
  expiresAt?: Date
): void {
  const maxAgeMs = computeRefreshCookieMaxAgeMs(rememberMe, expiresAt);
  res.cookie(getRefreshCookieName(), refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

export function setCsrfTokenCookie(
  res: express.Response,
  csrfToken: string,
  rememberMe: boolean,
  expiresAt?: Date
): void {
  const maxAgeMs = computeRefreshCookieMaxAgeMs(rememberMe, expiresAt);
  res.clearCookie(getCsrfCookieName(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
  res.cookie(getCsrfCookieName(), csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeMs,
  });
}

export function clearRefreshTokenCookie(res: express.Response): void {
  res.clearCookie(getRefreshCookieName(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

export function clearCsrfTokenCookie(res: express.Response): void {
  res.clearCookie(getCsrfCookieName(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  // Clear legacy cookies created before the frontend needed to read the CSRF token from app routes.
  res.clearCookie(getCsrfCookieName(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

export function validateRefreshCsrf(req: express.Request): void {
  const csrfCookieValues = getCookieValues(req, getCsrfCookieName());
  const csrfFromHeader = req.header('x-csrf-token');
  if (csrfCookieValues.length === 0 || !csrfFromHeader) {
    throw new ValidationError('CSRF token is required');
  }

  const headerBuffer = Buffer.from(csrfFromHeader);
  const hasMatchingCookie = csrfCookieValues.some((csrfFromCookie) => {
    const cookieBuffer = Buffer.from(csrfFromCookie);
    return cookieBuffer.length === headerBuffer.length && crypto.timingSafeEqual(cookieBuffer, headerBuffer);
  });
  if (!hasMatchingCookie) {
    throw new AuthenticationError('Invalid CSRF token');
  }
}
