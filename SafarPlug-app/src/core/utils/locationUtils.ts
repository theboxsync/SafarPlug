import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Request location permission and get current coordinates.
 * Returns default coordinates or throws error if permission denied.
 */
export async function getCurrentLocation(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

/**
 * Check if permission is already granted.
 */
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}
