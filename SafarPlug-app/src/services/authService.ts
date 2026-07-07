import * as SecureStore from 'expo-secure-store';
import { apiClient } from './apiClient';
import { User } from '../models/userModel';
import { ApiResponse } from '../models/common';

export interface LoginData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginData> {
    const response = await apiClient.post<ApiResponse<LoginData>>('/auth/login', {
      email,
      password,
    });
    const { user, accessToken, refreshToken } = response.data.data;
    await SecureStore.setItemAsync('user_token', accessToken);
    await SecureStore.setItemAsync('user_refresh_token', refreshToken);
    return { user, accessToken, refreshToken };
  },

  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    userType: 'ev_user' | 'station_owner';
    vehicleType?: 'car' | 'bike' | 'both';
  }): Promise<LoginData> {
    const response = await apiClient.post<ApiResponse<LoginData>>('/auth/register', data);
    const { user, accessToken, refreshToken } = response.data.data;
    await SecureStore.setItemAsync('user_token', accessToken);
    await SecureStore.setItemAsync('user_refresh_token', refreshToken);
    return { user, accessToken, refreshToken };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    await SecureStore.deleteItemAsync('user_token');
    await SecureStore.deleteItemAsync('user_refresh_token');
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  async updateProfile(payload: {
    name?: string;
    phone?: string;
    profilePicUrl?: string;
    vehicleType?: 'car' | 'bike' | 'both';
  }): Promise<User> {
    const response = await apiClient.patch<ApiResponse<User>>('/auth/me', payload);
    return response.data.data;
  },

  async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('user_token');
  },
};
