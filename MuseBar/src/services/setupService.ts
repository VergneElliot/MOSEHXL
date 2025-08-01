/**
 * Setup Service - Handles business setup wizard API calls
 */

import { apiService } from './apiService';
import { InvitationValidation, BusinessSetupRequest, BusinessSetupResponse } from '../types/setup';

export class SetupService {
  /**
   * Validate invitation token
   */
  static async validateInvitation(token: string): Promise<InvitationValidation> {
    try {
      const response = await apiService.get<InvitationValidation>(`/setup/validate/${token}`);
      return response.data;
    } catch (error: any) {
      return {
        isValid: false,
        token,
        error: error.response?.data?.error || 'Invalid or expired invitation token'
      };
    }
  }

  /**
   * Complete business setup
   */
  static async completeSetup(setupData: BusinessSetupRequest): Promise<BusinessSetupResponse> {
    const response = await apiService.post<BusinessSetupResponse>('/setup/complete', setupData);
    return response.data;
  }

  /**
   * Check if establishment setup is already completed
   */
  static async checkSetupStatus(token: string): Promise<{ completed: boolean; redirectUrl?: string }> {
    try {
      const response = await apiService.get<{ completed: boolean; redirectUrl?: string }>(`/setup/status/${token}`);
      return response.data;
    } catch (error) {
      return { completed: false };
    }
  }
}