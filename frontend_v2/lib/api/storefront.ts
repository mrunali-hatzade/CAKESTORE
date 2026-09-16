import { apiClient } from './client';
import { Shop, ShopSearchFilters, PopularCity } from '@/types/shop';
import { Product, Category } from '@/types/product';

export const storefrontApi = {
  getShopById: async (shopId: number | string): Promise<Shop> => {
    try {
      const shop = await apiClient.get<Shop>(`/api/storefront/shops/${shopId}`);
      if (shop && shop.id) {
        return shop;
      }
      throw new Error('Bakery not found');
    } catch (err: any) {
      console.error(`[StorefrontAPI] getShopById(${shopId}) error:`, err);
      throw new Error(err.message || 'Failed to load bakery storefront.');
    }
  },

  getPopularCities: async (limit: number = 8): Promise<PopularCity[]> => {
    try {
      const data = await apiClient.get<PopularCity[]>(
        `/api/storefront/shops/locations/popular-cities?limit=${limit}`
      );
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('[StorefrontAPI] getPopularCities error:', err);
      return [];
    }
  },

  searchShops: async (filters: ShopSearchFilters = {}): Promise<Shop[]> => {
    const params: Record<string, string> = {};
    if (filters.state && filters.state.trim() && !filters.state.toLowerCase().startsWith('all')) {
      params.state = filters.state.trim();
    }
    if (filters.district && filters.district.trim() && !filters.district.toLowerCase().startsWith('all')) {
      params.district = filters.district.trim();
    }
    if (filters.city && filters.city.trim() && !filters.city.toLowerCase().startsWith('all')) {
      params.city = filters.city.trim();
    }
    if (filters.area && filters.area.trim() && !filters.area.toLowerCase().startsWith('all')) {
      params.area = filters.area.trim();
    }
    if (filters.pincode && filters.pincode.trim() && !filters.pincode.toLowerCase().startsWith('all')) {
      params.pincode = filters.pincode.trim();
    }
    if (filters.country && filters.country.trim()) {
      params.country = filters.country.trim();
    }
    if (filters.businessType && filters.businessType !== 'ALL' && filters.businessType.trim()) {
      params.businessType = filters.businessType.trim();
    }
    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.location && filters.location.trim() && !filters.location.toLowerCase().startsWith('all')) {
      params.location = filters.location.trim();
    }
    if (filters.latitude != null && !isNaN(filters.latitude)) {
      params.latitude = filters.latitude.toString();
    }
    if (filters.longitude != null && !isNaN(filters.longitude)) {
      params.longitude = filters.longitude.toString();
    }
    if (filters.radiusKm != null && !isNaN(filters.radiusKm)) {
      params.radiusKm = filters.radiusKm.toString();
    }
    if (filters.sortBy && filters.sortBy.trim()) {
      params.sortBy = filters.sortBy.trim();
    }
    if (filters.page != null) {
      params.page = filters.page.toString();
    }
    if (filters.size != null) {
      params.size = filters.size.toString();
    }

    try {
      const data = await apiClient.get<Shop[]>('/api/storefront/shops/search', { params });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('[StorefrontAPI] searchShops error:', err);
      throw new Error(err.message || "We couldn't load bakeries right now.");
    }
  },

  getStorefrontProducts: async (shopId: number | string): Promise<Product[]> => {
    try {
      const prods = await apiClient.get<Product[]>(`/api/storefront/shops/${shopId}/products`);
      return Array.isArray(prods) ? prods : [];
    } catch (err: any) {
      console.error(`[StorefrontAPI] getStorefrontProducts(${shopId}) error:`, err);
      return [];
    }
  },

  getProductDetails: async (
    shopId: number | string,
    productId: number | string
  ): Promise<Product> => {
    return apiClient.get<Product>(`/api/storefront/shops/${shopId}/products/${productId}`);
  },

  getStorefrontCategories: async (shopId: number | string): Promise<Category[]> => {
    try {
      const data = await apiClient.get<Category[]>(`/api/storefront/shops/${shopId}/categories`);
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error(`[StorefrontAPI] getStorefrontCategories(${shopId}) error:`, err);
      return [];
    }
  },

  validateCoupon: async (
    shopId: number | string,
    code: string,
    subtotal: number
  ): Promise<{
    valid: boolean;
    code?: string;
    discountType?: 'PERCENTAGE' | 'FLAT';
    discountValue?: number;
    discountAmount?: number;
    minOrderValue?: number;
    maxDiscountCap?: number;
    newSubtotal?: number;
    message?: string;
  }> => {
    return apiClient.post(
      `/api/storefront/shops/${shopId}/coupons/validate`,
      { code, subtotal }
    );
  },

  getTopRatedProducts: async (shopId: number | string, limit: number = 8): Promise<Product[]> => {
    try {
      const prods = await apiClient.get<Product[]>(`/api/storefront/shops/${shopId}/products/top-rated?limit=${limit}`);
      return Array.isArray(prods) ? prods : [];
    } catch (err: any) {
      console.error(`[StorefrontAPI] getTopRatedProducts(${shopId}) error:`, err);
      return [];
    }
  },

  submitCustomCakeRequest: async (
    shopId: number | string,
    payload: any
  ): Promise<any> => {
    return apiClient.post(`/api/storefront/shops/${shopId}/custom-cakes`, payload);
  },

  submitEnquiry: async (
    shopId: number | string,
    payload: {
      customerName: string;
      customerEmail: string;
      enquiryType: string;
      message: string;
    }
  ): Promise<any> => {
    return apiClient.post(`/api/storefront/shops/${shopId}/enquiries`, payload);
  },

  getShopFeedback: async (shopId: number | string): Promise<any[]> => {
    try {
      const data = await apiClient.get<any[]>(`/api/storefront/shops/${shopId}/feedback`);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  submitFeedback: async (
    shopId: number | string,
    payload: {
      customerDisplayName?: string;
      rating: number;
      comment: string;
      orderReference?: string;
    }
  ): Promise<any> => {
    return apiClient.post(`/api/storefront/shops/${shopId}/feedback`, payload);
  },
};
