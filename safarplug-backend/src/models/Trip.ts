import { Schema, model, Document, Types } from 'mongoose';

export interface ITrip extends Document {
  userId: Types.ObjectId;
  fromLocation: {
    latitude: number;
    longitude: number;
  };
  toLocation: {
    latitude: number;
    longitude: number;
  };
  fromName: string;
  toName: string;
  vehicleType: string;
  startBatteryPercent: number;
  vehicleRangeKm: number;
  selectedStops: Types.ObjectId[];
  estimatedDistanceKm: number;
  createdAt: Date;
  updatedAt: Date;
}

const tripSchema = new Schema<ITrip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fromLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    toLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    fromName: { type: String, required: true },
    toName: { type: String, required: true },
    vehicleType: { type: String, required: true },
    startBatteryPercent: { type: Number, required: true },
    vehicleRangeKm: { type: Number, required: true },
    selectedStops: [{ type: Schema.Types.ObjectId, ref: 'Station' }],
    estimatedDistanceKm: { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.userId = ret.userId.toString();
        if (ret.selectedStops) {
          ret.selectedStops = ret.selectedStops.map((id: any) => id.toString());
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Trip = model<ITrip>('Trip', tripSchema);
