import { useQuery } from '@tanstack/react-query';
import { stationService } from '../services/stationService';
import { useStationStore } from '../store/stationStore';
import { Station } from '../models/stationModel';

interface UseNearbyStationsOptions {
  lat: number | null;
  lng: number | null;
  filter?: string;
  radiusKm?: number;
  enabled?: boolean;
}

/**
 * React Query hook that fetches nearby stations from the Express API.
 * Automatically re-fetches when lat/lng or filter changes.
 * Also syncs results into stationStore so the map has access.
 */
export function useNearbyStations({
  lat,
  lng,
  filter,
  radiusKm = 5,
  enabled = true,
}: UseNearbyStationsOptions) {
  const setStations = useStationStore((s) => (stations: Station[]) =>
    useStationStore.setState({ stations })
  );

  const query = useQuery<Station[], Error>({
    queryKey: ['nearbyStations', lat, lng, filter, radiusKm],
    queryFn: async () => {
      if (!lat || !lng) return [];
      const list = await stationService.getNearbyStations({
        latitude: lat,
        longitude: lng,
        radiusKm,
        vehicleFilter: filter && filter !== 'all' ? filter : undefined,
      });
      // Sync into Zustand store for non-hook consumers (e.g. map screen)
      useStationStore.setState({ stations: list });
      return list;
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 30_000,       // 30 s — don't refetch while fresh
    gcTime: 5 * 60_000,     // 5 min cache
    refetchOnWindowFocus: false,
  });

  return query;
}
