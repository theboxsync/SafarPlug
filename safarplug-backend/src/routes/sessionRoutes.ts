import { Router } from 'express';
import {
  startSession,
  updateProgress,
  endSession,
  getHistory,
  getOwnerSessions,
} from '../controllers/sessionController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = Router();

router.post('/start', protect, startSession);
router.patch('/:id/progress', protect, updateProgress);
router.post('/:id/end', protect, endSession);
router.get('/history/:userId', protect, getHistory);
router.get('/owner/:ownerId', protect, restrictTo('station_owner'), getOwnerSessions);

export default router;
