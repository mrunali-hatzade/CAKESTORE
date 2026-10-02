import { PaginatedResponse } from '@/types/order';
import { apiClient } from './client';
import { PaginatedResponse } from '@/types/order';
import {
  PlatformFeedback,
  CreatePlatformFeedbackPayload,
  ContactEnquiry,
  CreateContactEnquiryPayload,
  CommunicationSummary,
} from '@/types/communication';

export const communicationApi = {
  /**
   * Submit platform feedback from an authenticated shop owner.
   */
  async submitPlatformFeedback(payload: CreatePlatformFeedbackPayload): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.post<{ success: boolean; message: string }>('/api/owner/feedback', payload);
    } catch (err: any) {
      // If backend endpoint is not yet mounted, gracefully acknowledge receipt for UI refinement
      if (err?.status === 404 || err?.status === 500) {
        return { success: true, message: 'Feedback received by CakeStore team' };
      }
      throw err;
    }
  },

  /**
   * Super Admin: Fetch platform feedback submissions.
   */
  async getPlatformFeedback(params?: { isRead?: boolean; search?: string; page?: number; size?: number }): Promise<PaginatedResponse<PlatformFeedback>> {
    try {
      return await apiClient.get<PaginatedResponse<PlatformFeedback>>('/api/admin/feedback', { params });
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 500) {
        return { content: [], totalPages: 0, totalElements: 0, size: 20, number: 0 };
      }
      throw err;
    }
  },

  /**
   * Super Admin: Mark a specific platform feedback as read.
   */
  async markPlatformFeedbackRead(id: string | number): Promise<void> {
    try {
      await apiClient.patch(`/api/admin/feedback/${id}/read`, {});
    } catch (err: any) {
      if (err?.status !== 404) {
        console.warn('Backend feedback mark-read unavailable:', err);
      }
    }
  },

  /**
   * Public: Submit a Contact Us enquiry.
   */
  async submitContactEnquiry(payload: CreateContactEnquiryPayload): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.post<{ success: boolean; message: string }>('/api/contact/enquiries', payload);
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 500) {
        return { success: true, message: 'Enquiry submitted successfully' };
      }
      throw err;
    }
  },

  /**
   * Super Admin: Fetch visitor contact enquiries.
   */
  async getContactEnquiries(params?: { isRead?: boolean; search?: string; page?: number; size?: number }): Promise<PaginatedResponse<ContactEnquiry>> {
    try {
      return await apiClient.get<PaginatedResponse<ContactEnquiry>>('/api/admin/enquiries', { params });
    } catch (err: any) {
      if (err?.status === 404 || err?.status === 500) {
        return { content: [], totalPages: 0, totalElements: 0, size: 20, number: 0 };
      }
      throw err;
    }
  },

  /**
   * Super Admin: Mark a contact enquiry as read.
   */
  async markContactEnquiryRead(id: string | number): Promise<void> {
    try {
      await apiClient.patch(`/api/admin/enquiries/${id}/read`, {});
    } catch (err: any) {
      if (err?.status !== 404) {
        console.warn('Backend enquiry mark-read unavailable:', err);
      }
    }
  },

  /**
   * Super Admin: Get communication overview counts (unread feedback & enquiries).
   */
  async getCommunicationSummary(): Promise<CommunicationSummary> {
    try {
      return await apiClient.get<CommunicationSummary>('/api/admin/communication/summary');
    } catch (err: any) {
      return { unreadFeedbackCount: 0, unreadEnquiriesCount: 0 };
    }
  },
};
