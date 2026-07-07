export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface ChargingSession {
  id: string;
  userId: string;
  stationId: string;
  chargerId: string;
  startTime: string;
  endTime?: string;
  startBatteryPercent: number;
  endBatteryPercent?: number;
  energyUsedKwh: number;
  totalCostRs: number;
  paymentStatus: PaymentStatus;
  vehicleType: 'car' | 'bike';
  razorpayPaymentId?: string;
}
