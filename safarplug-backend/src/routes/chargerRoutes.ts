import { Router } from 'express';
import {
  getStationChargers,
  addCharger,
  toggleChargerStatus,
} from '../controllers/chargerController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = Router();

router.get('/station/:stationId/chargers', getStationChargers);
router.post('/station/:stationId/chargers', protect, restrictTo('station_owner'), addCharger);
router.patch('/chargers/:id/availability', protect, restrictTo('station_owner'), toggleChargerStatus);

router.get('/:stationId/chargers', getStationChargers);
router.post('/:stationId/chargers', protect, restrictTo('station_owner'), addCharger);

export default router;
