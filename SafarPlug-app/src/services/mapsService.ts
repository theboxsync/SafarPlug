import polyline from '@mapbox/polyline';
import axios from 'axios';
import { apiClient } from './apiClient';
import { config } from '../core/constants/config';
import { LatLng, ApiResponse } from '../models/common';
import { Trip } from '../models/tripModel';
import { calculateDistance } from '../core/utils/distanceUtils';

export interface RouteGeometry extends Array<LatLng> {
  distanceKm: number;
}

export const mapsService = {
  async getDirections(origin: LatLng, destination: LatLng): Promise<RouteGeometry> {
    try {
      const apiKey = config.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        const fallback = [origin, destination] as RouteGeometry;
        fallback.distanceKm = calculateDistance(origin, destination);
        return fallback;
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;
      const response = await axios.get(url);

      let coords: LatLng[] = [];
      if (response.data?.status === 'OK' && response.data.routes?.[0]) {
        const points = response.data.routes[0].overview_polyline.points;
        const decodedPoints = polyline.decode(points);
        coords = decodedPoints.map(([latitude, longitude]) => ({
          latitude,
          longitude,
        }));
      } else {
        coords = [origin, destination];
      }

      const result = coords as RouteGeometry;
      result.distanceKm = calculateDistance(origin, destination);
      return result;
    } catch (error) {
      console.warn('Failed to fetch directions', error);
      const fallback = [origin, destination] as RouteGeometry;
      fallback.distanceKm = calculateDistance(origin, destination);
      return fallback;
    }
  },

  async calculateRoute(from: LatLng, to: LatLng, stops: LatLng[]): Promise<RouteGeometry> {
    try {
      const apiKey = config.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        const fallback = [from, ...stops, to] as RouteGeometry;
        fallback.distanceKm = calculateDistance(from, to);
        return fallback;
      }

      const waypoints = stops.map((stop) => `${stop.latitude},${stop.longitude}`).join('|');
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&waypoints=${waypoints}&key=${apiKey}`;
      const response = await axios.get(url);

      let coords: LatLng[] = [];
      if (response.data?.status === 'OK' && response.data.routes?.[0]) {
        const points = response.data.routes[0].overview_polyline.points;
        const decodedPoints = polyline.decode(points);
        coords = decodedPoints.map(([latitude, longitude]) => ({
          latitude,
          longitude,
        }));
      } else {
        coords = [from, ...stops, to];
      }

      const result = coords as RouteGeometry;
      result.distanceKm = calculateDistance(from, to);
      return result;
    } catch (error) {
      console.warn('Failed to calculate route', error);
      const fallback = [from, ...stops, to] as RouteGeometry;
      fallback.distanceKm = calculateDistance(from, to);
      return fallback;
    }
  },

  async planTrip(
    from: LatLng,
    to: LatLng,
    vehicleType: 'car' | 'bike',
    batteryPercent: number,
    vehicleRangeKm: number
  ): Promise<Trip> {
    const response = await apiClient.post<ApiResponse<Trip>>('/trips/plan', {
      from,
      to,
      vehicleType,
      batteryPercent,
      vehicleRangeKm,
    });
    return response.data.data;
  },
};
