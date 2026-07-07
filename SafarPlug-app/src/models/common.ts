export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
