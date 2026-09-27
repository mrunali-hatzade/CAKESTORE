import { apiClient } from './client';
import { Order, GuestOrderRequest, OrderStatus, PaginatedResponse } from '@/types/order';

export const ordersApi = {
  createGuestOrder: async (shopId: number | string, orderData: GuestOrderRequest): Promise<Order> => {
    return apiClient.post<Order>(`/api/storefront/shops/${shopId}/orders`, orderData);
  },

  getOrderByNumber: async (orderNumber: string): Promise<Order> => {
    return apiClient.get<Order>(`/api/storefront/shops/orders/${orderNumber}`);
  },

  createPaymentOrder: async (orderNumber: string): Promise<{
    orderNumber: string;
    razorpayOrderId: string;
    amount: number;
    amountPaise: number;
    currency: string;
    keyId: string;
    shopName: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }> => {
    return apiClient.post(`/api/storefront/orders/${orderNumber}/create-payment-order`);
  },

  verifyPayment: async (
    orderNumber: string,
    payload: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }
  ): Promise<{
    status: string;
    message: string;
    orderNumber: string;
    paymentId?: number;
  }> => {
    return apiClient.post(`/api/storefront/orders/${orderNumber}/verify-payment`, payload);
  },

  getOwnerOrders: async (status?: string, page = 0, size = 20): Promise<PaginatedResponse<Order>> => {
    return apiClient.get<PaginatedResponse<Order>>('/api/owner/orders', { params: { status, page, size } });
  },

  updateOrderStatus: async (orderId: number, status: string): Promise<Order> => {
    return apiClient.patch<Order>(`/api/owner/orders/${orderId}/status`, { status });
  },

  updatePaymentStatus: async (orderId: number, paymentStatus = 'PAID', paymentNote?: string): Promise<Order> => {
    return apiClient.patch<Order>(`/api/owner/orders/${orderId}/payment-status`, {
      paymentStatus,
      paymentNote: paymentNote || 'CASH_COLLECTED',
    });
  },

  getOrderDetails: async (id: number): Promise<Order> => {
    return apiClient.get<Order>(`/api/owner/orders/${id}`);
  },

  downloadInvoice: async (id: number, orderNumber: string): Promise<void> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const token = typeof window !== 'undefined' ? localStorage.getItem('cakestore_token') : null;

    const response = await fetch(`${API_BASE_URL}/api/owner/orders/${id}/invoice`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Failed to download invoice: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${orderNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  requestTrackingOtp: async (phone: string): Promise<void> => {
    return apiClient.post('/api/customer/storefront/tracking/request-otp', { phone });
  },

  verifyTrackingOtp: async (phone: string, otp: string): Promise<{ token: string }> => {
    return apiClient.post('/api/customer/storefront/tracking/verify-otp', { phone, otp });
  },

  getMyOrders: async (token: string, page = 0, size = 10): Promise<{ content: Order[], totalElements: number, totalPages: number }> => {
    return apiClient.get(`/api/customer/storefront/tracking/orders?page=${page}&size=${size}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  downloadStorefrontInvoice: async (orderNumber: string): Promise<void> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const response = await fetch(`${API_BASE_URL}/api/storefront/shops/orders/${orderNumber}/invoice`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to download invoice: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice-${orderNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
