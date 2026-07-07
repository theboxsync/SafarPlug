import { Schema, model, Document, Types } from 'mongoose';

export interface ISession extends Document {
  userId: Types.ObjectId;
  stationId: Types.ObjectId;
  chargerId: Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  startBatteryPercent: number;
  endBatteryPercent?: number;
  energyUsedKwh: number;
  totalCostRs: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  vehicleType: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    chargerId: { type: Schema.Types.ObjectId, ref: 'Charger', required: true, index: true },
    startTime: { type: Date, default: Date.now, required: true },
    endTime: { type: Date },
    startBatteryPercent: { type: Number, required: true },
    endBatteryPercent: { type: Number },
    energyUsedKwh: { type: Number, default: 0 },
    totalCostRs: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      required: true,
    },
    vehicleType: { type: String, required: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        ret.stationId = ret.stationId.toString();
        ret.chargerId = ret.chargerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Session = model<ISession>('Session', sessionSchema);
