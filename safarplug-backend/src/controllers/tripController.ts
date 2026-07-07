import { Response } from 'express';
import { Trip } from '../models/Trip';
import { Station } from '../models/Station';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { calculateDistance } from '../utils/distance';

export const planTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { from, to, vehicleType, batteryPercent, vehicleRangeKm } = req.body;

    if (!from || !to || !vehicleRangeKm) {
      res.status(400).json({ success: false, message: 'Start and destination coordinates are required' });
      return;
    }

    const dist = calculateDistance(from, to);
    const initialRange = vehicleRangeKm * (batteryPercent / 100);

    const selectedStops: any[] = [];
    const stations = await Station.find({ isActive: true });

    if (dist > initialRange) {
      // Calculate number of stops needed assuming we charge up to 80% at each stop
      const stopRange = vehicleRangeKm * 0.8;
      const stopCount = Math.max(1, Math.ceil((dist - initialRange) / stopRange));

      // Divide the route into equal segments and pick the closest station for each midpoint
      for (let i = 1; i <= stopCount; i++) {
        const fraction = i / (stopCount + 1);
        const segmentPoint = {
          latitude: from.latitude + (to.latitude - from.latitude) * fraction,
          longitude: from.longitude + (to.longitude - from.longitude) * fraction,
        };

        let closestStation = null;
        let minSegDist = Infinity;

        for (const st of stations) {
          const stLatLng = {
            latitude: st.location.coordinates[1],
            longitude: st.location.coordinates[0],
          };
          const dSeg = calculateDistance(segmentPoint, stLatLng);
          if (dSeg < minSegDist) {
            minSegDist = dSeg;
            closestStation = st;
          }
        }

        if (closestStation && !selectedStops.some((s) => s.id === closestStation.id)) {
          selectedStops.push(closestStation);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        fromLocation: from,
        toLocation: to,
        fromName: req.body.fromName || 'Origin',
        toName: req.body.toName || 'Destination',
        vehicleType,
        startBatteryPercent: batteryPercent,
        vehicleRangeKm,
        selectedStops,
        estimatedDistanceKm: dist,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const saveTrip = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { fromLocation, toLocation, fromName, toName, vehicleType, startBatteryPercent, vehicleRangeKm, selectedStops, estimatedDistanceKm } = req.body;

    const trip = new Trip({
      userId: req.user.id,
      fromLocation,
      toLocation,
      fromName,
      toName,
      vehicleType,
      startBatteryPercent,
      vehicleRangeKm,
      selectedStops: selectedStops || [],
      estimatedDistanceKm,
    });

    await trip.save();
    res.status(201).json({ success: true, data: trip });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserTrips = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!req.user || req.user.id !== userId) {
      res.status(403).json({ success: false, message: 'Forbidden access' });
      return;
    }

    const trips = await Trip.find({ userId })
      .populate('selectedStops')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: trips });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
