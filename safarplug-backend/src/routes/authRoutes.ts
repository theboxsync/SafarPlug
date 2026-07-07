import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  me,
  updateProfile,
  logout,
} from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/me', protect, me);
router.patch('/me', protect, updateProfile);
router.post('/logout', protect, logout);

export default router;
