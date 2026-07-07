import { create } from 'zustand';
import { Trip } from '../models/tripModel';
import { Station } from '../models/stationModel';
import { LatLng } from '../models/common';
import { mapsService, RouteGeometry } from '../services/mapsService';
import { stationService } from '../services/stationService';
import { useAuthStore } from './authStore';

interface LocationPoint extends LatLng {
  address: string;
}

interface TripStoreState {
  // Inputs
  fromLocation: LocationPoint | null;
  toLocation: LocationPoint | null;
  vehicleType: 'car' | 'bike';
  batteryPercent: number;
  vehicleRangeKm: number;

  // Results
  suggestedStops: Station[];
  routePolyline: LatLng[];
  currentTrip: Trip | null;

  isLoading: boolean;
  error: string | null;

  // Actions
  setFromLocation: (loc: LocationPoint | null) => void;
  setToLocation: (loc: LocationPoint | null) => void;
  setVehicleType: (type: 'car' | 'bike') => void;
  setBatteryPercent: (pct: number) => void;
  setVehicleRangeKm: (km: number) => void;

  calculateTrip: () => Promise<void>;
  clearTrip: () => void;
}

export const useTripStore = create<TripStoreState>((set, get) => ({
  fromLocation: null,
  toLocation: null,
  vehicleType: 'car',
  batteryPercent: 80,
  vehicleRangeKm: 250,
  suggestedStops: [],
  routePolyline: [],
  currentTrip: null,
  isLoading: false,
  error: null,

  setFromLocation: (loc) => set({ fromLocation: loc }),
  setToLocation: (loc) => set({ toLocation: loc }),
  setVehicleType: (type) => set({ vehicleType: type }),
  setBatteryPercent: (pct) => set({ batteryPercent: pct }),
  setVehicleRangeKm: (km) => set({ vehicleRangeKm: km }),

  calculateTrip: async () => {
    const { fromLocation, toLocation, vehicleType, batteryPercent, vehicleRangeKm } = get();
    if (!fromLocation || !toLocation) {
      set({ error: 'Please set both start and end locations.' });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // 1. Get turn-by-turn directions polyline
      const routeGeo: RouteGeometry = await mapsService.getDirections(fromLocation, toLocation);
      const polylineCoords: LatLng[] = Array.from(routeGeo);

      // 2. Find charging stops along the midpoint if range is insufficient
      const remainingRangeKm = vehicleRangeKm * (batteryPercent / 100);
      let stops: Station[] = [];

      if (routeGeo.distanceKm > remainingRangeKm) {
        const midpoint: LatLng = {
          latitude: (fromLocation.latitude + toLocation.latitude) / 2,
          longitude: (fromLocation.longitude + toLocation.longitude) / 2,
        };
        const nearby = await stationService.getNearbyStations({
          latitude: midpoint.latitude,
          longitude: midpoint.longitude,
          radiusKm: Math.max(routeGeo.distanceKm / 2, 30),
          vehicleFilter: vehicleType === 'bike' ? 'ac_slow_2w' : undefined,
        });
        // Simple greedy: pick the first active station as a stop
        stops = nearby.filter((s) => s.isActive).slice(0, 2);
      }

      // 3. Try backend trip planner (server-side AI stop suggestion)
      let trip: Trip | null = null;
      try {
        trip = await mapsService.planTrip(fromLocation, toLocation, vehicleType, batteryPercent, vehicleRangeKm);
      } catch {
        // Fall back to locally generated trip if backend unavailable
        const userId = useAuthStore.getState().user?.id || 'anonymous';
        trip = {
          id: Math.random().toString(36).substring(2, 9),
          userId,
          fromLocation: { latitude: fromLocation.latitude, longitude: fromLocation.longitude },
          toLocation: { latitude: toLocation.latitude, longitude: toLocation.longitude },
          fromName: fromLocation.address,
          toName: toLocation.address,
          vehicleType,
          startBatteryPercent: batteryPercent,
          vehicleRangeKm,
          selectedStops: stops,
          estimatedDistanceKm: routeGeo.distanceKm,
          createdAt: new Date().toISOString(),
        };
      }

      set({
        currentTrip: trip,
        suggestedStops: stops,
        routePolyline: polylineCoords,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to calculate route', isLoading: false });
    }
  },

  clearTrip: () =>
    set({
      currentTrip: null,
      suggestedStops: [],
      routePolyline: [],
      fromLocation: null,
      toLocation: null,
    }),
}));
