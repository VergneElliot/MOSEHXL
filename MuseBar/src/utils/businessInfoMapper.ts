// Utility function to map business info from backend format (snake_case) to frontend format (camelCase)
export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  taxIdentification: string;
}

export interface BusinessInfoBackend {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  tax_identification: string;
}

export function mapBusinessInfoFromBackend(backendInfo: BusinessInfoBackend): BusinessInfo {
  return {
    name: backendInfo.name || '',
    address: backendInfo.address || '',
    phone: backendInfo.phone || '',
    email: backendInfo.email || '',
    siret: backendInfo.siret || '',
    taxIdentification: backendInfo.tax_identification || ''
  };
} 