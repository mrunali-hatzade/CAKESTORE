export type PlatformFeedbackCategory =
  | 'GENERAL'
  | 'DASHBOARD'
  | 'ORDERS'
  | 'PAYMENTS'
  | 'STOREFRONT'
  | 'SUBSCRIPTION'
  | 'FEATURE_REQUEST';

export interface PlatformFeedback {
  id: string | number;
  shopId?: number;
  shopName?: string;
  ownerName?: string;
  ownerEmail?: string;
  rating: number; // 1 - 5
  category?: PlatformFeedbackCategory;
  message: string;
  createdAt: string;
  isRead: boolean;
  adminReply?: string;
  repliedAt?: string;
}

export interface CreatePlatformFeedbackPayload {
  rating: number;
  category?: PlatformFeedbackCategory;
  message: string;
}

export interface ContactEnquiry {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  adminReply?: string;
  repliedAt?: string;
}

export interface CreateContactEnquiryPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export interface CommunicationSummary {
  unreadFeedbackCount: number;
  unreadEnquiriesCount: number;
}
