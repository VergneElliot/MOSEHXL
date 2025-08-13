import { apiService } from './apiService';
import { CreateEstablishmentRequest, SystemEstablishment } from '../types/system';

export interface CreateEstablishmentResponse {
  message: string;
  establishment: {
    id: string;
    name: string;
    email: string;
    status: string;
    invitation_token?: string;
    invitation_link?: string;
  };
}

export interface GetEstablishmentsResponse {
  establishments: SystemEstablishment[];
  total: number;
}

export class EstablishmentService {
  static async createEstablishment(data: CreateEstablishmentRequest): Promise<CreateEstablishmentResponse> {
    const response = await apiService.post<CreateEstablishmentResponse>('/establishments', data);
    return response.data;
  }

  static async getEstablishments(): Promise<GetEstablishmentsResponse> {
    const response = await apiService.get<GetEstablishmentsResponse>('/establishments');
    return response.data;
  }

  static async getEstablishment(id: string): Promise<{ establishment: SystemEstablishment; invitations: Array<{ email: string; role: string; status: string; created_at: string; expires_at: string }> }> {
    const response = await apiService.get<{ establishment: SystemEstablishment; invitations: Array<{ email: string; role: string; status: string; created_at: string; expires_at: string }> }>(`/establishments/${id}`);
    return response.data;
  }

  static async deleteEstablishment(id: string): Promise<void> {
    await apiService.delete(`/establishments/${id}`);
  }
}