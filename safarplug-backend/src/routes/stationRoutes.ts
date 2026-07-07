import { Router } from 'express';
import {
  getNearbyStations,
  getStationDetails,
  getOwnerStations,
  registerStation,
  editStation,
  toggleStationActive,
  searchStations,
  uploadStationPhotos,
} from '../controllers/stationController';
import { protect, restrictTo } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.get('/nearby', getNearbyStations);
router.get('/search', searchStations);
router.get('/owner/:ownerId', protect, restrictTo('station_owner'), getOwnerStations);
router.get('/:id', getStationDetails);

router.post('/', protect, restrictTo('station_owner'), registerStation);
router.patch('/:id/availability', protect, restrictTo('station_owner'), toggleStationActive);
router.patch('/:id', protect, restrictTo('station_owner'), editStation);
router.post('/:id/photos', protect, restrictTo('station_owner'), upload.array('photos', 5), uploadStationPhotos);

export default router;
