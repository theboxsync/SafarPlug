import { useTripStore } from '../../src/store/tripStore';
import { mapsService } from '../../src/services/mapsService';
import { stationService } from '../../src/services/stationService';

jest.mock('../../src/services/mapsService', () => ({
  mapsService: {
    getDirections: jest.fn(),
    planTrip: jest.fn(),
  },
}));

jest.mock('../../src/services/stationService', () => ({
  stationService: {
    getNearbyStations: jest.fn(),
  },
}));

describe('tripStore', () => {
  beforeEach(() => {
    useTripStore.getState().clearTrip();
  });

  it('should initialize with default values', () => {
    const state = useTripStore.getState();
    expect(state.fromLocation).toBeNull();
    expect(state.toLocation).toBeNull();
    expect(state.vehicleType).toBe('car');
    expect(state.batteryPercent).toBe(80);
    expect(state.vehicleRangeKm).toBe(250);
    expect(state.suggestedStops).toEqual([]);
    expect(state.routePolyline).toEqual([]);
    expect(state.currentTrip).toBeNull();
  });

  it('should update inputs successfully', () => {
    const store = useTripStore.getState();
    const loc = { latitude: 28.6139, longitude: 77.2090, address: 'Delhi' };

    store.setFromLocation(loc);
    store.setToLocation(loc);
    store.setVehicleType('bike');
    store.setBatteryPercent(50);
    store.setVehicleRangeKm(150);

    const updated = useTripStore.getState();
    expect(updated.fromLocation).toEqual(loc);
    expect(updated.toLocation).toEqual(loc);
    expect(updated.vehicleType).toBe('bike');
    expect(updated.batteryPercent).toBe(50);
    expect(updated.vehicleRangeKm).toBe(150);
  });

  it('should transition state on calculateTrip success', async () => {
    const from = { latitude: 28.6139, longitude: 77.2090, address: 'Delhi' };
    const to = { latitude: 26.2183, longitude: 78.1772, address: 'Gwalior' };

    useTripStore.setState({
      fromLocation: from,
      toLocation: to,
      vehicleType: 'car',
      batteryPercent: 80,
      vehicleRangeKm: 250,
    });

    const mockRouteGeo: any = [from, to];
    mockRouteGeo.distanceKm = 320;

    (mapsService.getDirections as jest.Mock).mockResolvedValue(mockRouteGeo);
    (stationService.getNearbyStations as jest.Mock).mockResolvedValue([]);
    
    const mockTrip = {
      id: 'trip123',
      fromLocation: from,
      toLocation: to,
      fromName: 'Delhi',
      toName: 'Gwalior',
      vehicleType: 'car',
      startBatteryPercent: 80,
      vehicleRangeKm: 250,
      selectedStops: [],
      estimatedDistanceKm: 320,
    };
    (mapsService.planTrip as jest.Mock).mockResolvedValue(mockTrip);

    // Call calculate
    await useTripStore.getState().calculateTrip();

    const updated = useTripStore.getState();
    expect(updated.isLoading).toBe(false);
    expect(updated.currentTrip).toEqual(mockTrip);
    expect(updated.routePolyline).toEqual([from, to]);
  });
});
