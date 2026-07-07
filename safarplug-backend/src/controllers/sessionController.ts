import { Response } from 'express';
import { z } from 'zod';
import { Session } from '../models/Session';
import { Charger } from '../models/Charger';
import { Station } from '../models/Station';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { emitToSessionRoom } from '../services/socketService';

// Validation Schemas
const startSessionSchema = z.object({
  stationId: z.string().min(1, 'Station ID is required'),
  chargerId: z.string().min(1, 'Charger ID is required'),
  startBatteryPercent: z.number().min(0).max(100).optional(),
  vehicleType: z.enum(['car', 'bike']).optional(),
});

const updateProgressSchema = z.object({
  currentBatteryPercent: z.number().min(0).max(100),
  energyUsedKwh: z.number().min(0),
});

export const startSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const parseResult = startSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { stationId, chargerId, startBatteryPercent = 20, vehicleType = 'car' } = parseResult.data;

    const charger = await Charger.findById(chargerId);
    if (!charger || !charger.isAvailable) {
      res.status(400).json({ success: false, message: 'Charger is not available' });
      return;
    }

    const station = await Station.findById(stationId);
    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    // Set charger unavailable
    charger.isAvailable = false;
    await charger.save();

    // Update station slots count
    station.totalSlotsAvailable = Math.max(0, station.totalSlotsAvailable - 1);
    await station.save();

    const session = new Session({
      userId: req.user.id,
      stationId,
      chargerId,
      startTime: new Date(),
      startBatteryPercent,
      energyUsedKwh: 0,
      totalCostRs: 0,
      paymentStatus: 'pending',
      vehicleType,
    });

    await session.save();

    // Emit socket event to the room
    emitToSessionRoom(session.id, 'session:started', session);

    res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session || session.endTime) {
      res.status(404).json({ success: false, message: 'Active session not found' });
      return;
    }

    // Only the session user can update progress
    if (!req.user || req.user.id !== session.userId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden, you do not own this session' });
      return;
    }

    const parseResult = updateProgressSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { currentBatteryPercent, energyUsedKwh } = parseResult.data;

    session.endBatteryPercent = currentBatteryPercent;
    session.energyUsedKwh = energyUsedKwh;

    // Recalculate cost dynamically
    const station = await Station.findById(session.stationId);
    const rate = station?.pricePerKwh || 12;
    session.totalCostRs = energyUsedKwh * rate;

    await session.save();

    // Emit socket event to session room
    emitToSessionRoom(session.id, 'session:progress', session);

    res.status(200).json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const endSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);

    if (!session || session.endTime) {
      res.status(404).json({ success: false, message: 'Active session not found or already ended' });
      return;
    }

    // Only the session user can end the session
    if (!req.user || req.user.id !== session.userId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden, you do not own this session' });
      return;
    }

    const station = await Station.findById(session.stationId);
    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    session.endTime = new Date();
    
    // final cost = energyUsedKwh * pricePerKwh + platform fee (2 INR)
    const platformFee = 2;
    session.totalCostRs = (session.energyUsedKwh * station.pricePerKwh) + platformFee;
    
    // Set charger back to available
    const charger = await Charger.findById(session.chargerId);
    if (charger) {
      charger.isAvailable = true;
      await charger.save();
    }

    // Increment slots available on station
    station.totalSlotsAvailable += 1;
    await station.save();

    await session.save();

    // Emit socket ended event
    emitToSessionRoom(session.id, 'session:ended', session);

    res.status(200).json({ success: true, data: session });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!req.user || (req.user.id !== userId && req.user.userType !== 'station_owner')) {
      res.status(403).json({ success: false, message: 'Forbidden access' });
      return;
    }

    const history = await Session.find({ userId }).populate('stationId').sort({ startTime: -1 });
    res.status(200).json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOwnerSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ownerId } = req.params;
    const { date } = req.query;

    if (!req.user || req.user.id !== ownerId) {
      res.status(403).json({ success: false, message: 'Forbidden access' });
      return;
    }

    // Get owner's stations
    const stations = await Station.find({ ownerId });
    const stationIds = stations.map((s) => s._id);

    const query: any = { stationId: { $in: stationIds } };

    if (date) {
      const searchDate = new Date(date as string);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const sessions = await Session.find(query)
      .populate('userId')
      .populate('stationId')
      .sort({ startTime: -1 });

    res.status(200).json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
