import { apiClient } from './client';
import {
  DashboardAnalytics,
  CouponRecord,
  CreateCouponPayload,
  CustomerProfile,
  CustomCakeRequest,
  GeneralEnquiry,
  FeedbackRecord,
  ShopSettings,
  ShopPayoutDetails,
  SubscriptionRecord,
  PaymentMockResult,
  OwnerDashboardStats,
  OwnerPaymentRecord,
} from '@/types/owner';

export const ownerApi = {
  // Stats
  getDashboardStats: async (): Promise<OwnerDashboardStats> => {
    return apiClient.get<OwnerDashboardStats>('/api/shops/my-shop/stats');
  },

  // Analytics
  getAnalytics: async (): Promise<DashboardAnalytics> => {
    return apiClient.get<DashboardAnalytics>('/api/owner/analytics/dashboard');
  },

  // Coupons
  getCoupons: async (): Promise<CouponRecord[]> => {
    return apiClient.get<CouponRecord[]>('/api/owner/coupons');
  },

  getOwnerCoupons: async (): Promise<CouponRecord[]> => {
    return apiClient.get<CouponRecord[]>('/api/owner/coupons');
  },

  createCoupon: async (data: CreateCouponPayload): Promise<CouponRecord> => {
    return apiClient.post<CouponRecord>('/api/owner/coupons', data);
  },

  createOwnerCoupon: async (data: CreateCouponPayload): Promise<CouponRecord> => {
    return apiClient.post<CouponRecord>('/api/owner/coupons', data);
  },

  toggleCoupon: async (id: string | number): Promise<void> => {
    await apiClient.patch(`/api/owner/coupons/${id}/toggle`);
  },

  deleteCoupon: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/api/owner/coupons/${id}`);
  },

  // Customers
  getCustomers: async (): Promise<CustomerProfile[]> => {
    return apiClient.get<CustomerProfile[]>('/api/owner/customers');
  },

  getOwnerCustomers: async (): Promise<CustomerProfile[]> => {
    return apiClient.get<CustomerProfile[]>('/api/owner/customers');
  },

  getCustomerProfile: async (email: string): Promise<CustomerProfile> => {
    return apiClient.get<CustomerProfile>(`/api/owner/customers/${encodeURIComponent(email)}`);
  },

  // Enquiries (General)
  getEnquiries: async (): Promise<GeneralEnquiry[]> => {
    return apiClient.get<GeneralEnquiry[]>('/api/owner/enquiries');
  },

  getOwnerEnquiries: async (): Promise<GeneralEnquiry[]> => {
    return apiClient.get<GeneralEnquiry[]>('/api/owner/enquiries');
  },

  replyToEnquiry: async (id: string | number, reply: string): Promise<GeneralEnquiry> => {
    return apiClient.post<GeneralEnquiry>(`/api/owner/enquiries/${id}/reply`, { reply: reply.trim() });
  },

  replyToGeneralEnquiry: async (id: number, reply: string): Promise<GeneralEnquiry> => {
    return apiClient.post<GeneralEnquiry>(`/api/owner/enquiries/${id}/reply`, { reply: reply.trim() });
  },

  // Custom Cakes
  getCustomCakeRequests: async (): Promise<CustomCakeRequest[]> => {
    return apiClient.get<CustomCakeRequest[]>('/api/owner/custom-cakes');
  },

  getOwnerCustomCakeRequests: async (): Promise<CustomCakeRequest[]> => {
    return apiClient.get<CustomCakeRequest[]>('/api/owner/custom-cakes');
  },

  respondToCustomCakeRequest: async (
    id: string | number,
    status: string,
    reply?: string
  ): Promise<CustomCakeRequest> => {
    const url = `/api/owner/custom-cakes/${id}/respond?status=${encodeURIComponent(status)}`;
    const body = reply && reply.trim() ? { reply: reply.trim() } : undefined;
    return apiClient.post<CustomCakeRequest>(url, body);
  },

  updateEnquiryStatus: async (id: string | number, status: any, quotedPrice?: number): Promise<void> => {
    const statusStr = String(status);
    const reply = quotedPrice ? `Quote: ?${quotedPrice}` : `Status: ${statusStr}`;
    await apiClient.post(`/api/owner/custom-cakes/${id}/respond?status=${encodeURIComponent(statusStr)}`, { reply }).catch(() => {});
  },

  // Reviews / Feedback
  getReviews: async (): Promise<FeedbackRecord[]> => {
    return apiClient.get<FeedbackRecord[]>('/api/owner/feedback');
  },

  getOwnerFeedback: async (): Promise<FeedbackRecord[]> => {
    return apiClient.get<FeedbackRecord[]>('/api/owner/feedback');
  },

  replyToReview: async (id: string | number, reply: string): Promise<FeedbackRecord> => {
    return apiClient.post<FeedbackRecord>(`/api/owner/feedback/${id}/reply`, { reply: reply.trim() });
  },

  replyToFeedback: async (id: number, reply: string): Promise<FeedbackRecord> => {
    return apiClient.post<FeedbackRecord>(`/api/owner/feedback/${id}/reply`, { reply: reply.trim() });
  },

  deleteReview: async (id: string | number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/api/owner/feedback/${id}`);
  },

  deleteFeedback: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/api/owner/feedback/${id}`);
  },

  // Shop Settings / Profile
  getShopSettings: async (): Promise<ShopSettings> => {
    return apiClient.get<ShopSettings>('/api/shops/my-shop');
  },

  getVerificationStatus: async (): Promise<{
    shopId?: number;
    verificationStatus: string;
    rejectionReason?: string | null;
    documents?: any[];
  } | null> => {
    try {
      return await apiClient.get('/api/verification/status');
    } catch {
      return null;
    }
  },

  updateShopSettings: async (data: Partial<ShopSettings>): Promise<ShopSettings> => {
    return apiClient.put<ShopSettings>('/api/shops/my-shop', data);
  },

  // Payout Details
  getPayoutDetails: async (): Promise<ShopPayoutDetails | null> => {
    try {
      return await apiClient.get<ShopPayoutDetails>('/api/shops/my-shop/payouts');
    } catch {
      return null;
    }
  },

  updatePayoutDetails: async (data: ShopPayoutDetails): Promise<ShopPayoutDetails> => {
    return apiClient.post<ShopPayoutDetails>('/api/shops/my-shop/payouts', data);
  },

  // Subscription
  getSubscription: async (): Promise<SubscriptionRecord | null> => {
    try {
      return await apiClient.get<SubscriptionRecord>('/api/owner/subscriptions/current');
    } catch {
      return null;
    }
  },

  getCurrentSubscription: async (): Promise<SubscriptionRecord | null> => {
    try {
      return await apiClient.get<SubscriptionRecord>('/api/owner/subscriptions/current');
    } catch {
      return null;
    }
  },

  processMockSubscriptionPayment: async (planId: number): Promise<PaymentMockResult> => {
    return apiClient.post<PaymentMockResult>('/api/owner/payments/mock-checkout', {
      planId: planId,
    });
  },

  // Stage C: Owner Payments & Invoices
  getPayments: async (): Promise<OwnerPaymentRecord[]> => {
    return apiClient.get<OwnerPaymentRecord[]>('/api/owner/payments');
  },

  downloadPaymentInvoice: async (paymentId: number): Promise<void> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const token = typeof window !== 'undefined' ? localStorage.getItem('cakestore_token') : null;

    const response = await fetch(`${API_BASE_URL}/api/owner/payments/${paymentId}/invoice`, {
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
    link.setAttribute('download', `invoice-SUB-${paymentId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  initiateSubscriptionPayment: async (planId: number): Promise<any> => {
    return apiClient.post('/api/owner/payments/initiate-subscription', { planId });
  },

  verifySubscriptionPayment: async (payload: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    planId: number;
  }): Promise<any> => {
    return apiClient.post('/api/owner/payments/verify-subscription', payload);
  },

  deleteAccount: async (data: { password: string; confirmationText: string }): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>('/api/owner/account/delete', data);
  },
};


