import { Schema, model, Document, Types } from 'mongoose';

export interface ICharger extends Document {
  stationId: Types.ObjectId;
  chargerType: 'ac_slow_2w' | 'ac_slow_car' | 'ac_fast_car' | 'dc_fast_car';
  powerKw?: number;
  connectorType: 'type2' | 'ccs2' | 'home_plug';
  isAvailable: boolean;
  vehicleCompatibility: string[];
  createdAt: Date;
  updatedAt: Date;
}

const chargerSchema = new Schema<ICharger>(
  {
    stationId: { type: Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
    chargerType: {
      type: String,
      enum: ['ac_slow_2w', 'ac_slow_car', 'ac_fast_car', 'dc_fast_car'],
      required: true,
    },
    powerKw: { type: Number },
    connectorType: {
      type: String,
      enum: ['type2', 'ccs2', 'home_plug'],
      required: true,
    },
    isAvailable: { type: Boolean, default: true },
    vehicleCompatibility: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.stationId = ret.stationId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Charger = model<ICharger>('Charger', chargerSchema);
