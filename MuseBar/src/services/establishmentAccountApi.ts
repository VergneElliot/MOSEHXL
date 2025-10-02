/**
 * API service for establishment account creation
 * Handles all API calls related to establishment account setup
 */

import { 
  InvitationValidationResult, 
  EstablishmentAccountCreationRequest, 
  EstablishmentAccountCreationResponse 
} from '../components/EstablishmentAccountCreation/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class EstablishmentAccountApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Validate invitation token
   */
  async validateInvitation(token: string): Promise<InvitationValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/establishment-account-creation/validate/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      console.error('Error validating invitation:', error);
      throw error;
    }
  }

  /**
   * Create establishment account
   */
  async createAccount(request: EstablishmentAccountCreationRequest): Promise<EstablishmentAccountCreationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/establishment-account-creation/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/establishment-account-creation/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: unknown) {
      console.error('Error checking service health:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const establishmentAccountApi = new EstablishmentAccountApi();
