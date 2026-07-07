import { Router } from 'express';
import {
  getStationReviews,
  addReview,
  deleteReview,
} from '../controllers/reviewController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/station/:stationId/reviews', getStationReviews); // matching GET /api/stations/:stationId/reviews
router.post('/station/:stationId/reviews', protect, addReview); // matching POST /api/stations/:stationId/reviews
router.delete('/reviews/:id', protect, deleteReview); // matching DELETE /api/reviews/:id

// Let's also mount additional direct aliases if required by router mapping
router.delete('/:id', protect, deleteReview);

export default router;
