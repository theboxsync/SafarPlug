import { create } from 'zustand';
import { Station } from '../models/stationModel';
import { stationService } from '../services/stationService';

interface StationStoreState {
  stations: Station[];
  selectedStation: Station | null;
  vehicleFilter: string;        // 'all' | 'ac_slow_2w' | 'ac_slow_car' | 'ac_fast_car' | 'dc_fast_car'
  searchRadiusKm: number;
  isLoading: boolean;
  error: string | null;

  fetchNearbyStations: (latitude: number, longitude: number) => Promise<void>;
  fetchStationDetails: (stationId: string) => Promise<void>;
  setSelectedStation: (station: Station | null) => void;
  setVehicleFilter: (filter: string) => void;
  setSearchRadius: (radiusKm: number) => void;
  submitReview: (stationId: string, rating: number, comment: string) => Promise<void>;
  clearError: () => void;
}

export const useStationStore = create<StationStoreState>((set, get) => ({
  stations: [],
  selectedStation: null,
  vehicleFilter: 'all',
  searchRadiusKm: 5.0,
  isLoading: false,
  error: null,

  fetchNearbyStations: async (latitude, longitude) => {
    set({ isLoading: true, error: null });
    try {
      const { vehicleFilter, searchRadiusKm } = get();
      const list = await stationService.getNearbyStations({
        latitude,
        longitude,
        radiusKm: searchRadiusKm,
        vehicleFilter: vehicleFilter !== 'all' ? vehicleFilter : undefined,
      });
      set({ stations: list, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to load stations', isLoading: false });
    }
  },

  fetchStationDetails: async (stationId) => {
    set({ isLoading: true, error: null });
    try {
      const station = await stationService.getStationDetails(stationId);
      set({ selectedStation: station, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to load station details', isLoading: false });
    }
  },

  setSelectedStation: (station) => set({ selectedStation: station }),

  setVehicleFilter: (filter) => set({ vehicleFilter: filter }),

  setSearchRadius: (radiusKm) => set({ searchRadiusKm: radiusKm }),

  submitReview: async (stationId, rating, comment) => {
    try {
      await stationService.submitReview(stationId, rating, comment);
      // Refresh station to pick up new rating/review count
      const station = await stationService.getStationDetails(stationId);
      set({ selectedStation: station });
    } catch (e: any) {
      set({ error: e.message || 'Failed to submit review' });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
