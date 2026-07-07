import { Router } from 'express';
import { createPaymentOrder, verifyPaymentSignature } from '../controllers/paymentController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.post('/create-order', protect, createPaymentOrder); // matching POST /api/payments/create-order
router.post('/verify', protect, verifyPaymentSignature); // matching POST /api/payments/verify

// Let's also mount additional direct aliases if required by router mapping
router.post('/order', protect, createPaymentOrder);

export default router;
