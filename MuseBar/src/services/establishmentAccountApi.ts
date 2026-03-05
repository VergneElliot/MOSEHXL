/**
 * API service for establishment account creation.
 * Uses the centralized request() from api/core for auth, timeout, and 401 handling (audit #47).
 */

import { request } from './api/core';
import type {
  InvitationValidationResult,
  EstablishmentAccountCreationRequest,
  EstablishmentAccountCreationResponse,
} from '../components/EstablishmentAccountCreation/types';

/**
 * Validate invitation token
 */
export async function validateInvitation(token: string): Promise<InvitationValidationResult> {
  try {
    return await request<InvitationValidationResult>(
      `/establishment-account-creation/validate/${encodeURIComponent(token)}`
    );
  } catch (error: unknown) {
    console.error('Error validating invitation:', error);
    throw error;
  }
}

/**
 * Create establishment account
 */
export async function createAccount(
  body: EstablishmentAccountCreationRequest
): Promise<EstablishmentAccountCreationResponse> {
  try {
    return await request<EstablishmentAccountCreationResponse>(
      '/establishment-account-creation/complete',
      { method: 'POST', body: JSON.stringify(body) }
    );
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    throw error;
  }
}

/**
 * Check service health
 */
export async function checkHealth(): Promise<{ status: string; message: string }> {
  try {
    return await request<{ status: string; message: string }>(
      '/establishment-account-creation/health'
    );
  } catch (error: unknown) {
    console.error('Error checking service health:', error);
    throw error;
  }
}

/** Singleton-style API object for backward compatibility with existing call sites */
export const establishmentAccountApi = {
  validateInvitation,
  createAccount,
  checkHealth,
};
