import { Request, Response } from 'express';
import { z } from 'zod';
import { Station } from '../models/Station';
import { Charger } from '../models/Charger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { uploadToCloudinary } from '../services/uploadService';

// Validation Schemas
const registerStationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number({ required_error: 'Latitude is required' }),
  longitude: z.number({ required_error: 'Longitude is required' }),
  description: z.string().optional(),
  pricePerKwh: z.number().min(0, 'Price must be positive'),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  chargerTypes: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

const editStationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  pricePerKwh: z.number().min(0).optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  chargerTypes: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  phone: z.string().optional(),
});

const toggleStationSchema = z.object({
  isActive: z.boolean().optional(),
});

export const getNearbyStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radiusKm = 50, vehicleFilter, chargerTypes } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const maxDistanceMeters = parseFloat(radiusKm as string) * 1000;

    const query: any = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON expects [longitude, latitude]
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    };

    const filters = [vehicleFilter, chargerTypes].filter(Boolean) as string[];
    if (filters.length > 0) {
      query.chargerTypes = { $in: filters };
    }

    const stations = await Station.find(query);
    res.status(200).json({ success: true, data: stations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStationDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const station = await Station.findById(id).lean() as any;

    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    // Populate chargers manually
    const chargers = await Charger.find({ stationId: id });
    station.chargers = chargers;

    res.status(200).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOwnerStations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ownerId } = req.params;
    
    // Check permission: station_owner can see their own
    if (!req.user || (req.user.userType !== 'station_owner' && req.user.id !== ownerId)) {
      res.status(403).json({ success: false, message: 'Forbidden access' });
      return;
    }

    const stations = await Station.find({ ownerId });
    res.status(200).json({ success: true, data: stations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const registerStation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.userType !== 'station_owner') {
      res.status(403).json({ success: false, message: 'Only station owners can register stations' });
      return;
    }

    const parseResult = registerStationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const {
      name, address, latitude, longitude, description, pricePerKwh,
      workingHoursStart, workingHoursEnd, chargerTypes = [], amenities = [], phone
    } = parseResult.data;

    const station = new Station({
      ownerId: req.user.id,
      name,
      address,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude], // [lng, lat]
      },
      description,
      pricePerKwh,
      workingHoursStart,
      workingHoursEnd,
      photoUrls: [],
      chargerTypes,
      amenities,
      phone: phone || req.user.phone,
      isVerified: false,
      isActive: true,
      rating: 0,
      totalReviews: 0,
    });

    await station.save();
    res.status(201).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const editStation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const station = await Station.findById(id);

    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    // Only owner of the station can edit
    if (!req.user || (req.user.id !== station.ownerId.toString())) {
      res.status(403).json({ success: false, message: 'Unauthorized to modify this station' });
      return;
    }

    const parseResult = editStationSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const {
      name, address, latitude, longitude, description, pricePerKwh,
      workingHoursStart, workingHoursEnd, chargerTypes, amenities, phone
    } = parseResult.data;

    if (name) station.name = name;
    if (address) station.address = address;
    if (latitude !== undefined && longitude !== undefined) {
      station.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
      };
    }
    if (description) station.description = description;
    if (pricePerKwh !== undefined) station.pricePerKwh = pricePerKwh;
    if (workingHoursStart) station.workingHoursStart = workingHoursStart;
    if (workingHoursEnd) station.workingHoursEnd = workingHoursEnd;
    if (chargerTypes) station.chargerTypes = chargerTypes;
    if (amenities) station.amenities = amenities;
    if (phone) station.phone = phone;

    await station.save();
    res.status(200).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStationActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const station = await Station.findById(id);

    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    // Only owner of the station can change availability
    if (!req.user || (req.user.id !== station.ownerId.toString())) {
      res.status(403).json({ success: false, message: 'Unauthorized to modify this station' });
      return;
    }

    const parseResult = toggleStationSchema.safeParse(req.body);
    if (parseResult.success && parseResult.data.isActive !== undefined) {
      station.isActive = parseResult.data.isActive;
    } else {
      station.isActive = !station.isActive;
    }

    await station.save();
    res.status(200).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    if (!q) {
      res.status(400).json({ success: false, message: 'Search query is required' });
      return;
    }

    const regex = new RegExp(q as string, 'i');
    const stations = await Station.find({
      $or: [{ name: regex }, { address: regex }],
      isActive: true,
    });

    res.status(200).json({ success: true, data: stations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadStationPhotos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const station = await Station.findById(id);

    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    if (!req.user || (req.user.id !== station.ownerId.toString())) {
      res.status(403).json({ success: false, message: 'Unauthorized to modify this station' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No photo files uploaded' });
      return;
    }

    // Upload each to Cloudinary
    const uploadPromises = files.map((file) => uploadToCloudinary(file.buffer));
    const urls = await Promise.all(uploadPromises);

    station.photoUrls.push(...urls);
    await station.save();

    res.status(200).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
