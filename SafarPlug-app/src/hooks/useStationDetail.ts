import { useQuery } from '@tanstack/react-query';
import { stationService } from '../services/stationService';
import { useStationStore } from '../store/stationStore';
import { Station } from '../models/stationModel';

/**
 * React Query hook for a single station's full detail.
 * Sets selectedStation in Zustand store as a side-effect.
 */
export function useStationDetail(stationId: string | null | undefined) {
  return useQuery<Station, Error>({
    queryKey: ['stationDetail', stationId],
    queryFn: async () => {
      const station = await stationService.getStationDetails(stationId!);
      useStationStore.setState({ selectedStation: station });
      return station;
    },
    enabled: !!stationId,
    staleTime: 60_000,   // 1 min
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
