import { mapsService } from '../../src/services/mapsService';
import { apiClient } from '../../src/services/apiClient';

jest.mock('../../src/services/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe('mapsService', () => {
  describe('planTrip', () => {
    it('should call /trips/plan endpoint and return a trip object', async () => {
      const mockTrip = {
        id: '123',
        fromLocation: { latitude: 28.6139, longitude: 77.2090 },
        toLocation: { latitude: 26.2183, longitude: 78.1772 },
        fromName: 'Delhi',
        toName: 'Gwalior',
        vehicleType: 'car',
        startBatteryPercent: 65,
        vehicleRangeKm: 250,
        selectedStops: [],
        estimatedDistanceKm: 320,
      };

      const mockResponse = {
        data: {
          success: true,
          data: mockTrip,
        },
      };

      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const from = { latitude: 28.6139, longitude: 77.2090 };
      const to = { latitude: 26.2183, longitude: 78.1772 };

      const result = await mapsService.planTrip(from, to, 'car', 65, 250);

      expect(apiClient.post).toHaveBeenCalledWith('/trips/plan', {
        from,
        to,
        vehicleType: 'car',
        batteryPercent: 65,
        vehicleRangeKm: 250,
      });
      expect(result).toEqual(mockTrip);
    });
  });
});
