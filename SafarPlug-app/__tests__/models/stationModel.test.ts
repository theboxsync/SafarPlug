import { calculateDistance, formatDistance } from '../../src/core/utils/distanceUtils';

describe('Distance Utilities', () => {
  const delhi = { latitude: 28.6139, longitude: 77.2090 };
  const noida = { latitude: 28.6200, longitude: 77.3700 };

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates accurately in km', () => {
      const distance = calculateDistance(delhi, noida);
      expect(distance).toBeCloseTo(15.7, 1);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(delhi, delhi);
      expect(distance).toBe(0);
    });
  });

  describe('formatDistance', () => {
    it('should format distance in meters for less than 1 km', () => {
      const formatted = formatDistance(0.45);
      expect(formatted).toBe('450 m');
    });

    it('should format distance in km for 1 km or more', () => {
      const formatted = formatDistance(12.34);
      expect(formatted).toBe('12.3 km');
    });
  });
});
