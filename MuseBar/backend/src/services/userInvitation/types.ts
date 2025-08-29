/**
 * User Invitation Service Types
 * Type definitions for user and establishment invitations
 */

/**
 * Invitation types
 */
export type InvitationType = 'establishment' | 'user';

/**
 * Invitation status
 */
export type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

/**
 * User roles
 */
export type UserRole = 'cashier' | 'manager' | 'supervisor' | 'establishment_admin';

/**
 * Subscription plans
 */
export type SubscriptionPlan = 'basic' | 'premium' | 'enterprise';

/**
 * Establishment invitation data
 */
export interface EstablishmentInvitationData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: SubscriptionPlan;
  inviterUserId: string;
  inviterName: string;
}

/**
 * User invitation data
 */
export interface UserInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  establishmentId: string;
  establishmentName: string;
  inviterUserId: string;
  inviterName: string;
}

/**
 * Invitation result
 */
export interface InvitationResult {
  success: boolean;
  invitationId?: string;
  establishmentId?: string;
  userId?: string;
  message: string;
  emailSent: boolean;
  trackingId?: string;
}

/**
 * Database invitation record
 */
export interface InvitationRecord {
  id: string;
  email: string;
  inviter_user_id: string;
  inviter_name: string;
  establishment_name: string;
  establishment_id?: string;
  role: UserRole;
  invitation_token: string;
  expires_at: Date;
  status: InvitationStatus;
  created_at: Date;
  accepted_at?: Date;
  cancelled_at?: Date;
}

/**
 * Invitation acceptance data
 */
export interface InvitationAcceptanceData {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Invitation validation result
 */
export interface InvitationValidationResult {
  isValid: boolean;
  message: string;
  invitation?: InvitationRecord;
}

