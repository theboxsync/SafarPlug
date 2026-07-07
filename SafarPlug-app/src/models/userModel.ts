export type UserType = 'ev_user' | 'station_owner';
export type VehicleType = 'car' | 'bike' | 'both';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicUrl?: string;
  userType: UserType;
  vehicleType?: VehicleType;
  createdAt: string;
}
