import { apiClient } from './client';
import { PaginatedResponse } from '@/types/order';

export interface PublicReview {
  id: number;
  customerDisplayName: string;
  rating: number;
  reviewText: string;
  isVerifiedPurchase: boolean;
  cakeImageUrl?: string;
  cakeVideoUrl?: string;
  ownerReply?: string;
  ownerRepliedAt?: string;
  createdAt: string;
  source?: 'PRODUCT_REVIEW' | 'FEEDBACK';
  editToken?: string;
}

export interface ProductReviewsSummary {
  productId: number;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
  reviews: PublicReview[];
}

export interface OrderItemEligibility {
  orderItemId: number;
  productId?: number;
  productName: string;
  variantName?: string;
  isDelivered: boolean;
  hasReviewed: boolean;
  isEligible: boolean;
  existingReviewId?: number;
  existingRating?: number;
  existingReviewText?: string;
  existingCakeImageUrl?: string;
  existingCakeVideoUrl?: string;
}

export interface SubmitReviewPayload {
  orderNumber: string;
  customerPhone: string;
  orderItemId: number;
  rating: number;
  reviewText?: string;
  cakeImageUrl?: string;
  cakeVideoUrl?: string;
}

export interface OwnerProductReview {
  id: number;
  productId?: number;
  productName: string;
  productImage?: string;
  orderNumber: string;
  customerName: string;
  rating: number;
  reviewText: string;
  isVerifiedPurchase: boolean;
  cakeImageUrl?: string;
  cakeVideoUrl?: string;
  ownerReply?: string;
  ownerRepliedAt?: string;
  createdAt: string;
}

export const reviewsApi = {
  getProductReviews: async (
    shopId: number | string,
    productId: number | string
  ): Promise<ProductReviewsSummary> => {
    try {
      return await apiClient.get<ProductReviewsSummary>(
        `/api/storefront/shops/${shopId}/products/${productId}/reviews`
      );
    } catch {
      return {
        productId: Number(productId),
        averageRating: 0.0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviews: [],
      };
    }
  },

  submitProductReview: async (
    shopId: number | string,
    productId: number | string,
    payload: SubmitReviewPayload
  ): Promise<PublicReview> => {
    return apiClient.post<PublicReview>(
      `/api/storefront/shops/${shopId}/products/${productId}/reviews`,
      payload
    );
  },

  checkOrderEligibility: async (
    shopId: number | string,
    orderNumber: string,
    phone: string = ''
  ): Promise<OrderItemEligibility[]> => {
    try {
      return await apiClient.get<OrderItemEligibility[]>(
        `/api/storefront/shops/${shopId}/reviews/eligibility`,
        { params: { orderNumber, phone } }
      );
    } catch (err) {
      throw err;
    }
  },

  getOwnerProductReviews: async (page = 0, size = 20, search?: string, rating?: number): Promise<PaginatedResponse<OwnerProductReview>> => {
    return apiClient.get<PaginatedResponse<OwnerProductReview>>('/api/owner/product-reviews', {
      params: { 
        page, 
        size, 
        ...(search ? { search } : {}),
        ...(rating ? { rating } : {})
      }
    });
  },

  replyToProductReview: async (
    reviewId: number | string,
    reply: string
  ): Promise<OwnerProductReview> => {
    return apiClient.post<OwnerProductReview>(
      `/api/owner/product-reviews/${reviewId}/reply`,
      { reply }
    );
  },

  updateProductReview: async (
    shopId: number | string,
    productId: number | string,
    reviewId: number | string,
    payload: SubmitReviewPayload,
    token?: string
  ): Promise<PublicReview> => {
    return apiClient.put<PublicReview>(
      `/api/storefront/shops/${shopId}/products/${productId}/reviews/${reviewId}`,
      payload,
      token ? { headers: { 'X-Review-Token': token }, params: { token } } : undefined
    );
  },

  deleteProductReview: async (
    shopId: number | string,
    productId: number | string,
    reviewId: number | string,
    orderNumber: string,
    phone: string = '',
    token?: string
  ): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(
      `/api/storefront/shops/${shopId}/products/${productId}/reviews/${reviewId}`,
      {
        params: { orderNumber, phone, ...(token ? { token } : {}) },
        headers: token ? { 'X-Review-Token': token } : undefined,
      }
    );
  },
};
