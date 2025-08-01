// System Admin Types
export interface SystemUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'system_admin' | 'system_operator';
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface Establishment {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tva_number?: string;
  siret_number?: string;
  subscription_plan: 'basic' | 'premium';
  status: 'active' | 'suspended' | 'pending' | 'setup_required';
  created_at: string;
  owner_email: string;
  schema_name?: string;
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
  subscription_plan: 'basic' | 'premium';
  owner_email: string;
}