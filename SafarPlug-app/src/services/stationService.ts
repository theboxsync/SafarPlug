import { apiClient } from './apiClient';
import { Station } from '../models/stationModel';
import { Charger } from '../models/chargerModel';
import { Review } from '../models/reviewModel';
import { ApiResponse } from '../models/common';

import { useAuthStore } from '../store/authStore';

export const stationService = {
  async getNearbyStations(options: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    vehicleFilter?: string;
    connectorType?: string;
    isTwoWheelerFriendly?: boolean;
  }): Promise<Station[]> {
    const { latitude, longitude, radiusKm = 50, vehicleFilter, connectorType } = options;
    const response = await apiClient.get<ApiResponse<Station[]>>('/stations/nearby', {
      params: {
        lat: latitude,
        lng: longitude,
        radiusKm,
        vehicleFilter: vehicleFilter || connectorType,
      },
    });
    return response.data.data;
  },

  async getStationById(stationId: string): Promise<Station> {
    const response = await apiClient.get<ApiResponse<Station>>(`/stations/${stationId}`);
    return response.data.data;
  },

  async getStationsByOwner(ownerId?: string): Promise<Station[]> {
    const id = ownerId || useAuthStore.getState().user?.id;
    const response = await apiClient.get<ApiResponse<Station[]>>(`/stations/owner/${id}`);
    return response.data.data;
  },

  async registerStation(payload: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    description?: string;
    pricePerKwh?: number;
    workingHoursStart?: string;
    workingHoursEnd?: string;
    city?: string;
    state?: string;
    isTwoWheelerFriendly?: boolean;
    [key: string]: any;
  }): Promise<Station> {
    const response = await apiClient.post<ApiResponse<Station>>('/stations', payload);
    return response.data.data;
  },

  async updateStationAvailability(stationId: string, isActive: boolean): Promise<Station> {
    const response = await apiClient.patch<ApiResponse<Station>>(`/stations/${stationId}/availability`, {
      isActive,
    });
    return response.data.data;
  },

  async uploadStationPhotos(stationId: string, photoUris: string[]): Promise<Station> {
    const formData = new FormData();
    photoUris.forEach((uri) => {
      const fileName = uri.split('/').pop() || 'photo.jpg';
      const fileType = fileName.split('.').pop() === 'png' ? 'image/png' : 'image/jpeg';
      
      formData.append('photos', {
        uri,
        name: fileName,
        type: fileType,
      } as any);
    });

    const response = await apiClient.post<ApiResponse<Station>>(`/stations/${stationId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  async addReview(stationId: string, payload: { rating: number; comment: string }): Promise<Review> {
    const response = await apiClient.post<ApiResponse<Review>>(`/reviews/station/${stationId}/reviews`, payload);
    return response.data.data;
  },

  async getReviews(stationId: string): Promise<Review[]> {
    const response = await apiClient.get<ApiResponse<Review[]>>(`/reviews/station/${stationId}/reviews`);
    return response.data.data;
  },

  async searchStations(query: string): Promise<Station[]> {
    const response = await apiClient.get<ApiResponse<Station[]>>('/stations/search', {
      params: { q: query },
    });
    return response.data.data;
  },

  async getChargers(stationId: string): Promise<Charger[]> {
    const response = await apiClient.get<ApiResponse<Charger[]>>(`/stations/${stationId}/chargers`);
    return response.data.data;
  },

  // Aliases and additional direct functions expected by callers
  async getOwnerStations(ownerId?: string): Promise<Station[]> {
    return this.getStationsByOwner(ownerId);
  },

  async getStationDetails(stationId: string): Promise<Station> {
    return this.getStationById(stationId);
  },

  async submitReview(stationId: string, rating: number, comment: string): Promise<Review> {
    return this.addReview(stationId, { rating, comment });
  },

  async toggleChargerStatus(stationId: string, chargerId: string, isAvailable: any): Promise<any> {
    const response = await apiClient.patch(`/chargers/${chargerId}/availability`, { isAvailable });
    return response.data.data;
  },
};
