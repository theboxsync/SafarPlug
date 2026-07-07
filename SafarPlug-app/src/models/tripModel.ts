import { LatLng } from './common';
import { Station } from './stationModel';

export interface Trip {
  id: string;
  userId: string;
  fromLocation: LatLng;
  toLocation: LatLng;
  fromName: string;
  toName: string;
  vehicleType: 'car' | 'bike';
  startBatteryPercent: number;
  vehicleRangeKm: number;
  selectedStops: Station[];
  estimatedDistanceKm: number;
  createdAt: string;
}
