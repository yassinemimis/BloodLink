import api from './api';
import type { BloodRequest, PaginatedResponse } from '../types';

export const bloodRequestService = {
  async create(data: {
    bloodGroup: string;
    urgencyLevel: string;
    unitsNeeded: number;
    hospital: string;
    description?: string;
    latitude: number;
    longitude: number;
    searchRadius?: number;
  }) {
    const response = await api.post('/blood-requests', data);
    return response.data;
  },

  async findAll(params?: {
    status?: string;
    urgencyLevel?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<BloodRequest>> {
    const response = await api.get('/blood-requests', { params });
    return response.data;
  },

  async findOne(id: string): Promise<BloodRequest> {
    const response = await api.get(`/blood-requests/${id}`);
    return response.data;
  },

  async cancel(id: string) {
    const response = await api.patch(`/blood-requests/${id}/cancel`);
    return response.data;
  },

  async getStatistics() {
    const response = await api.get('/blood-requests/statistics');
    return response.data;
  },
};