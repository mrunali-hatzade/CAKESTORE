import { apiClient } from './client';
import { PaginatedResponse } from '@/types/order';
import {
  DashboardStats,
  AdminShopSummary,
  AdminShopDetails,
  AdminPlan,
  AdminMessagePayload,
} from '@/types/admin';

// ==========================================
// SUPER ADMIN API CLIENT FUNCTIONS (LIVE BACKEND)
// ==========================================

/**
 * Fetch top-level platform statistics for Admin Dashboard.
 */
export async function getPlatformStats(): Promise<DashboardStats> {
  return apiClient.get<DashboardStats>('/api/admin/dashboard/stats');
}

/**
 * Fetch all registered bakery shops across the platform.
 */
export async function getAllShops(page: number = 0, size: number = 20, search?: string, status?: string): Promise<PaginatedResponse<AdminShopSummary>> {
  return apiClient.get<PaginatedResponse<AdminShopSummary>>('/api/admin/shops', {
    params: { page, size, ...(search && { search }), ...(status && status !== "ALL" && { status }) }
  });
}

export async function getAllAdminShops(page: number = 0, size: number = 20, search?: string, status?: string): Promise<PaginatedResponse<AdminShopSummary>> {
  return apiClient.get<PaginatedResponse<AdminShopSummary>>('/api/admin/shops', {
    params: { page, size, ...(search && { search }), ...(status && status !== "ALL" && { status }) }
  });
}

/**
 * Fetch deep operational details for a specific bakery shop.
 */
export async function getShopDetails(shopId: number): Promise<AdminShopDetails> {
  return apiClient.get<AdminShopDetails>(`/api/admin/shops/${shopId}`);
}

export async function getAdminShopDetails(shopId: number): Promise<AdminShopDetails> {
  return apiClient.get<AdminShopDetails>(`/api/admin/shops/${shopId}`);
}

/**
 * Update shop operational status (ACTIVE, SUSPENDED, INACTIVE).
 */
export async function updateShopStatus(
  shopId: number,
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | string,
  reason?: string
): Promise<any> {
  return apiClient.patch(`/api/admin/shops/${shopId}/status`, { status, reason });
}

/**
 * Review bakery KYC compliance verification (APPROVE, REJECT).
 */
export async function updateShopVerification(
  shopId: number,
  action: 'APPROVE' | 'REJECT',
  reason?: string
): Promise<any> {
  return apiClient.patch(`/api/admin/shops/${shopId}/verification`, { action, reason });
}

/**
 * Fetch platform subscription plans.
 */
export async function getAllPlans(): Promise<AdminPlan[]> {
  return apiClient.get<AdminPlan[]>('/api/admin/plans');
}

export async function getAdminPlans(): Promise<AdminPlan[]> {
  return apiClient.get<AdminPlan[]>('/api/admin/plans');
}

/**
 * Create a new subscription plan.
 */
export async function createPlan(plan: Partial<AdminPlan>): Promise<AdminPlan> {
  return apiClient.post<AdminPlan>('/api/admin/plans', plan);
}

/**
 * Update an existing subscription plan.
 */
export async function updatePlan(id: number, plan: Partial<AdminPlan>): Promise<AdminPlan> {
  return apiClient.put<AdminPlan>(`/api/admin/plans/${id}`, plan);
}

/**
 * Toggle plan active status.
 */
export async function togglePlanStatus(id: number, isActive: boolean): Promise<AdminPlan> {
  return apiClient.patch<AdminPlan>(`/api/admin/plans/${id}/status?isActive=${isActive}`);
}

/**
 * Broadcast an announcement message to all or specific bakery owners.
 */
export async function sendAdminMessage(payload: AdminMessagePayload): Promise<string> {
  return apiClient.post<string>('/api/admin/messages', payload);
}

export const adminApi = {
  getPlatformStats,
  getAllShops,
  getAllAdminShops,
  getShopDetails,
  getAdminShopDetails,
  updateShopStatus,
  updateShopVerification,
  getAllPlans,
  getAdminPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  sendAdminMessage,
};
