import api from './api';
import * as SecureStore from 'expo-secure-store';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('accessToken', response.data.accessToken);
    return response.data;
  },

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    bloodGroup: string;
    role?: string;
  }) {
    const response = await api.post('/auth/register', data);
    await SecureStore.setItemAsync('accessToken', response.data.accessToken);
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  async logout() {
    await SecureStore.deleteItemAsync('accessToken');
  },

  async isAuthenticated() {
    const token = await SecureStore.getItemAsync('accessToken');
    return !!token;
  },
};