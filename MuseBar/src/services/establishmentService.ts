import { apiService } from './apiService';
import { CreateEstablishmentRequest, SystemEstablishment } from '../types/system';

export interface CreateEstablishmentResponse {
  success: boolean;
  message: string;
  establishment: {
    id: string;
    name: string;
    email: string;
    status: string;
    schema_name: string;
    subscription_plan: string;
    invitation_token?: string;
    invitation_link?: string;
    setup_instructions?: string;
  };
  audit_log: {
    id: string;
    action: string;
    timestamp: Date;
  };
}

export interface GetEstablishmentsResponse {
  establishments: SystemEstablishment[];
  total: number;
}

export class EstablishmentService {
  static async createEstablishment(data: CreateEstablishmentRequest): Promise<CreateEstablishmentResponse> {
    const response = await apiService.post<CreateEstablishmentResponse>('/enhanced-establishments', data);
    return response.data;
  }

  static async getEstablishments(): Promise<GetEstablishmentsResponse> {
    const response = await apiService.get<GetEstablishmentsResponse>('/establishment-search');
    return response.data;
  }

  static async getEstablishment(id: string): Promise<{ establishment: SystemEstablishment; invitations: Array<{ email: string; role: string; status: string; created_at: string; expires_at: string }> }> {
    const response = await apiService.get<{ establishment: SystemEstablishment; invitations: Array<{ email: string; role: string; status: string; created_at: string; expires_at: string }> }>(`/establishments/${id}`);
    return response.data;
  }

  static async deleteEstablishment(id: string): Promise<void> {
    await apiService.delete(`/establishments/${id}`);
  }

  // Enhanced establishment service methods
  static async getEstablishmentStats(): Promise<{
    total_establishments: string;
    pending_setup: string;
    active: string;
    suspended: string;
    this_month: string;
  }> {
    const response = await apiService.get<{
      success: boolean;
      data: {
        total_establishments: string;
        pending_setup: string;
        active: string;
        suspended: string;
        this_month: string;
      };
    }>('/enhanced-establishments/stats');
    return response.data.data;
  }

  static async getDashboardMetrics(): Promise<any> {
    const response = await apiService.get<{
      success: boolean;
      data: any;
    }>('/admin-dashboard/metrics');
    return response.data.data;
  }

  static async searchEstablishments(filters?: {
    name?: string;
    email?: string;
    status?: string;
    business_type?: string;
    subscription_plan?: string;
    created_after?: string;
    created_before?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<{
    success: boolean;
    data: {
      establishments: SystemEstablishment[];
      total: number;
      page: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    filters: any;
    options: any;
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiService.get<{
      success: boolean;
      data: {
        establishments: SystemEstablishment[];
        total: number;
        page: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
      filters: any;
      options: any;
    }>(`/establishment-search?${params.toString()}`);
    return response.data;
  }
}