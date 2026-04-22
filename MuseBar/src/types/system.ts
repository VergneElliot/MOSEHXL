// System Admin Types
export interface SystemUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'system_admin';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface SystemEstablishment {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  status: 'active' | 'suspended' | 'pending' | 'setup_required' | 'pending_setup' | 'setup_in_progress';
  business_type: 'restaurant' | 'bar' | 'cafe' | 'retail' | 'other';
  timezone: string;
  language: 'fr' | 'en' | 'es' | 'de' | 'it';
  created_at: string;
  updated_at: string;
  owner_email: string;
  schema_name: string;
}

export interface SystemSecurityLog {
  id: string;
  user_id: string;
  action_type: string;
  resource_type: string;
  resource_id?: string;
  details: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CreateEstablishmentRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
  business_type?: 'restaurant' | 'bar' | 'cafe' | 'retail' | 'other';
  timezone?: string;
  language?: 'fr' | 'en' | 'es' | 'de' | 'it';
  owner_email: string;
}