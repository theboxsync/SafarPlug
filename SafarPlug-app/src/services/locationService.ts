import * as Location from 'expo-location';
import axios from 'axios';
import { config } from '../core/constants/config';
import { LatLng } from '../models/common';

export const locationService = {
  async requestLocationPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  async getCurrentLocation(): Promise<LatLng> {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  },

  async fetchAndCacheLocation(): Promise<LatLng> {
    return this.getCurrentLocation();
  },

  async getAddressFromLatLng(latitude: number, longitude: number): Promise<string> {
    try {
      const apiKey = config.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );

      if (response.data?.status === 'OK' && response.data.results?.[0]) {
        return response.data.results[0].formatted_address;
      }
      return `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.warn('Geocoding failed', error);
      return `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  },

  async getLatLngFromAddress(address: string): Promise<LatLng> {
    try {
      const apiKey = config.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google API key not configured');
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      );

      if (response.data?.status === 'OK' && response.data.results?.[0]?.geometry?.location) {
        const { lat, lng } = response.data.results[0].geometry.location;
        return { latitude: lat, longitude: lng };
      }
      throw new Error('Address not found');
    } catch (error) {
      console.warn('Forward geocoding failed', error);
      throw error;
    }
  },
};
