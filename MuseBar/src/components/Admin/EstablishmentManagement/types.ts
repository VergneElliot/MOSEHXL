/**
 * Types and interfaces for Establishment Management
 */

export interface Establishment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
  stats?: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    subscriptionStatus: string;
  };
}

export interface CreateEstablishmentData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
}

export interface InviteEstablishmentData {
  name: string;
  email: string;
  phone: string;
  address: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

