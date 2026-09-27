export interface DashboardStats {
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  inactiveShops: number;
  pendingShops: number;
  totalUsers: number;
  todayRegistrations: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  todayPayments: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

export interface BusinessDocumentItem {
  id: number;
  documentType: string;
  fileUrl: string;
  status: 'PROCESSING' | 'VERIFIED' | 'ACTION_REQUIRED' | 'REJECTED' | string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminShopSummary {
  shopId: number;
  businessName: string;
  ownerName?: string;
  ownerEmail?: string;
  shopStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'REJECTED' | string;
  registeredAt: string;
}

export interface AdminShopDetails {
  shop: {
    id: number;
    businessName: string;
    description?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    fssaiRegistration?: string;
    status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'REJECTED' | string;
    verificationStatus?: 'PROCESSING' | 'VERIFIED' | 'ACTION_REQUIRED' | 'REJECTED' | string;
    isPureVeg?: boolean;
    createdAt: string;
    updatedAt: string;
  };
  subscriptions?: {
    id: number;
    planName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    amount?: number;
  }[];
  payments?: {
    id: number;
    amount: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
  }[];
  activityLogs?: {
    id: number;
    action: string;
    details?: string;
    metadata?: string;
    createdAt: string;
  }[];
  businessDocuments?: BusinessDocumentItem[];
  totalProducts: number;
  totalOrders: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  weeklyRevenue?: number;
  completedOrders?: number;
  cancelledOrders?: number;
}

export interface AdminPlan {
  id: number;
  name: string;
  description?: string;
  billingCycle?: string;
  price: number;
  currency: string;
  durationDays: number;
  features?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminMessagePayload {
  title: string;
  message: string;
  specificOwnerId?: number | null;
  sendEmail?: boolean;
}

export interface SentBroadcastRecord {
  id: string;
  title: string;
  message: string;
  target: string;
  sentAt: string;
  recipientCount: number;
}
