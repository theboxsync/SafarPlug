import { Request, Response } from 'express';
import { z } from 'zod';
import { Charger } from '../models/Charger';
import { Station } from '../models/Station';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const addChargerSchema = z.object({
  chargerType: z.enum(['ac_slow_2w', 'ac_slow_car', 'ac_fast_car', 'dc_fast_car']),
  powerKw: z.number().min(0),
  connectorType: z.string().min(1),
  vehicleCompatibility: z.array(z.string()).optional(),
});

export const getStationChargers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const chargers = await Charger.find({ stationId });
    res.status(200).json({ success: true, data: chargers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCharger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const station = await Station.findById(stationId);
    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    // Verify ownership
    if (!req.user || req.user.id !== station.ownerId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden, you do not own this station' });
      return;
    }

    const parseResult = addChargerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { chargerType, powerKw, connectorType, vehicleCompatibility } = parseResult.data;

    const charger = new Charger({
      stationId,
      chargerType,
      powerKw,
      connectorType,
      isAvailable: true,
      vehicleCompatibility: vehicleCompatibility || ['car'],
    });

    await charger.save();

    // Update station info cache
    if (!station.chargerTypes.includes(chargerType)) {
      station.chargerTypes.push(chargerType);
    }
    station.totalSlotsAvailable += 1;
    await station.save();

    res.status(201).json({ success: true, data: charger });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleChargerStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const charger = await Charger.findById(id);

    if (!charger) {
      res.status(404).json({ success: false, message: 'Charger not found' });
      return;
    }

    const station = await Station.findById(charger.stationId);
    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    // Verify ownership
    if (!req.user || req.user.id !== station.ownerId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden, you do not own this station' });
      return;
    }

    charger.isAvailable = !charger.isAvailable;
    await charger.save();

    // Update total slots available
    station.totalSlotsAvailable += charger.isAvailable ? 1 : -1;
    await station.save();

    res.status(200).json({ success: true, data: charger });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
