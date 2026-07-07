import { ChargerType } from './chargerModel';

export interface Station {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  photoUrls: string[];
  chargerTypes: ChargerType[];
  pricePerKwh: number;
  workingHoursStart: string; // e.g. "08:00"
  workingHoursEnd: string;   // e.g. "22:00"
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  totalReviews: number;
  totalSlotsAvailable: number;
  createdAt: string;
}
