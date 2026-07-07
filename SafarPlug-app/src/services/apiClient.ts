import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../core/constants/config';

export const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to automatically add token
apiClient.interceptors.request.use(
  async (requestConfig) => {
    try {
      const token = await SecureStore.getItemAsync('user_token');
      if (token && requestConfig.headers) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to retrieve authentication token', error);
    }
    return requestConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry and automatic refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const storedRefreshToken = await SecureStore.getItemAsync('user_refresh_token');
        if (storedRefreshToken) {
          // Request a new access token
          const response = await axios.post(`${config.API_BASE_URL}/auth/refresh`, {
            token: storedRefreshToken,
          });

          if (response.data?.success && response.data.data?.accessToken) {
            const newAccessToken = response.data.data.accessToken;
            await SecureStore.setItemAsync('user_token', newAccessToken);

            // Retry the original request with the new access token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        console.warn('Refresh token expired or invalid, cleaning credentials', refreshError);
      }
      
      // If refresh fails or is not available, log out by clearing tokens
      await SecureStore.deleteItemAsync('user_token');
      await SecureStore.deleteItemAsync('user_refresh_token');
    }
    return Promise.reject(error);
  }
);
