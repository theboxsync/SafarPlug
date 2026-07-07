export type ChargerType = 'ac_slow_2w' | 'ac_slow_car' | 'ac_fast_car' | 'dc_fast_car';
export type ConnectorType = 'type2' | 'ccs2' | 'home_plug';
export type VehicleCompatibility = 'car' | 'bike';

export interface Charger {
  id: string;
  stationId: string;
  chargerType: ChargerType;
  powerKw: number;
  connectorType: ConnectorType;
  isAvailable: boolean;
  vehicleCompatibility: VehicleCompatibility[];
}
