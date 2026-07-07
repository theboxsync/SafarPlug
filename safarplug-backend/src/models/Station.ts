import { Schema, model, Document, Types } from 'mongoose';

export interface IStation extends Document {
  ownerId: Types.ObjectId;
  name: string;
  address?: string;
  location: {
    type: 'Point';
    coordinates: number[]; // [longitude, latitude]
  };
  description?: string;
  photoUrls: string[];
  chargerTypes: string[];
  pricePerKwh: number;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  totalReviews: number;
  totalSlotsAvailable: number;
  phone?: string;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const stationSchema = new Schema<IStation>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    address: { type: String },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    description: { type: String },
    photoUrls: [{ type: String }],
    chargerTypes: [{ type: String }],
    pricePerKwh: { type: Number, required: true },
    workingHoursStart: { type: String },
    workingHoursEnd: { type: String },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalSlotsAvailable: { type: Number, default: 0 },
    phone: { type: String },
    amenities: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret: any) => {
        ret.id = ret._id.toString();
        ret.ownerId = ret.ownerId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create 2dsphere index for location search
stationSchema.index({ location: '2dsphere' });

export const Station = model<IStation>('Station', stationSchema);
