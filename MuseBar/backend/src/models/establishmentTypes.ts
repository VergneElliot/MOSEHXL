/**
 * Phase B1 (2026-04): The app commits to **shared-table multi-tenancy**.
 * `establishments.schema_name` is legacy metadata and is not used for runtime isolation.
 */

export interface Establishment {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  /** Legacy metadata (not a runtime isolation boundary). */
  schema_name: string;
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  subscription_status: 'active' | 'suspended' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface CreateEstablishmentData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
}

export interface UpdateEstablishmentData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  subscription_plan?: 'basic' | 'premium' | 'enterprise';
  subscription_status?: 'active' | 'suspended' | 'cancelled';
}

/**
 * Legacy: schema name safety.
 *
 * Even though schema-per-tenant is no longer the runtime model, `schema_name` is still stored
 * in DB rows for backward compatibility with older installs and migrations.
 */
const SAFE_SCHEMA_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/;

export function assertValidSchemaName(schemaName: string): void {
  if (!SAFE_SCHEMA_NAME_REGEX.test(schemaName)) {
    throw new Error(`Invalid schema name format (refused for SQL safety): ${schemaName}`);
  }
}

export function validateEstablishmentData(
  data: CreateEstablishmentData
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('Establishment name must be at least 2 characters long');
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email address is required');
  }

  if (data.phone && !/^[\+]?[0-9\s\-\(\)]{8,}$/.test(data.phone)) {
    errors.push('Phone number format is invalid');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
