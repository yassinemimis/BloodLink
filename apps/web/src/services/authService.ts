import api from './api';
import type { AuthResponse } from '../types';

export const authService = {
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    bloodGroup: string;
    role?: string;
  }): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(data: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};