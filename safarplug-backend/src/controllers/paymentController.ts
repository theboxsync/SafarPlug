import { Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { Session } from '../models/Session';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { env } from '../config/env';

let razorpay: Razorpay | null = null;

if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export const createPaymentOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, amount } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    const platformFee = 2; // ₹2 platform fee
    const finalAmount = amount + platformFee;

    if (!razorpay) {
      // Mock order creation for development environment
      console.log('Razorpay keys not configured, creating mock order');
      const orderId = `order_mock_${Math.random().toString(36).substring(2, 10)}`;
      session.razorpayOrderId = orderId;
      await session.save();

      res.status(201).json({
        success: true,
        data: {
          id: orderId,
          amount: finalAmount * 100, // in paise
          currency: 'INR',
        },
      });
      return;
    }

    const options = {
      amount: Math.round(finalAmount * 100), // amount in paise
      currency: 'INR',
      receipt: `receipt_${sessionId}`,
    };

    const order = await razorpay.orders.create(options);
    
    session.razorpayOrderId = order.id;
    await session.save();

    res.status(201).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyPaymentSignature = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sessionId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    if (!env.RAZORPAY_KEY_SECRET) {
      // Offline fallback success for testing
      session.paymentStatus = 'paid';
      session.razorpayPaymentId = razorpayPaymentId;
      await session.save();
      res.status(200).json({ success: true, message: 'Mock payment verified successfully' });
      return;
    }

    // Standard Razorpay SHA256 Signature Verification
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpaySignature) {
      session.paymentStatus = 'paid';
      session.razorpayPaymentId = razorpayPaymentId;
      await session.save();

      res.status(200).json({ success: true, message: 'Payment verified successfully' });
    } else {
      session.paymentStatus = 'failed';
      await session.save();
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
