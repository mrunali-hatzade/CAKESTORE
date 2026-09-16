import { apiClient } from './client';

export interface SubscriptionPlan {
  planId: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  durationDays: number;
  features: string; // JSON string array
}

export const plansApi = {
  getActivePlans: async (): Promise<SubscriptionPlan[]> => {
    return apiClient.get('/api/subscription-plans');
  },
};
