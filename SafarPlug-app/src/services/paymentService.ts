import { apiClient } from './apiClient';
import { ApiResponse } from '../models/common';

export interface PaymentOrderData {
  id: string;
  amount: number;
  currency: string;
}

export const paymentService = {
  async createOrder(sessionId: string, amount: number): Promise<PaymentOrderData> {
    const response = await apiClient.post<ApiResponse<PaymentOrderData>>('/payments/create-order', {
      sessionId,
      amount,
    });
    return response.data.data;
  },

  async verifyPayment(
    sessionId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<any>>('/payments/verify', {
      sessionId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    return response.data.success;
  },
};
