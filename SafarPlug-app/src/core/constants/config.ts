import { Platform } from 'react-native';

// For local development, localhost works on iOS simulator while Android emulator needs 10.0.2.2.
// In production, this will point to the deployed Express/MongoDB backend.
const LOCAL_API_URL = Platform.select({
  ios: 'http://localhost:5000/api',
  android: 'http://10.0.2.2:5000/api',
  default: 'http://localhost:5000/api',
});

export const config = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_API_URL,
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || LOCAL_API_URL?.replace('/api', ''),
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE',
  DEFAULT_LOCATION: {
    latitude: 28.6139, // New Delhi
    longitude: 77.2090,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  },
};
