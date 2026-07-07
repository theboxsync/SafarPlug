import { Router } from 'express';
import { planTrip, saveTrip, getUserTrips } from '../controllers/tripController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/plan', planTrip); // matching POST /api/trips/plan
router.post('/', protect, saveTrip); // matching POST /api/trips
router.get('/:userId', protect, getUserTrips); // matching GET /api/trips/:userId

export default router;
