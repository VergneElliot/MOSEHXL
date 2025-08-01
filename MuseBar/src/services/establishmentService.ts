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

  static async getEstablishment(id: string): Promise<{ establishment: SystemEstablishment; invitations: any[] }> {
    const response = await apiService.get<{ establishment: SystemEstablishment; invitations: any[] }>(`/establishments/${id}`);
    return response.data;
  }
}