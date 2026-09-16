import { apiClient } from './client';
import { GalleryItem, CreateGalleryItemRequest } from '@/types/gallery';

export const galleryApi = {
  getOwnerGalleryItems: async (): Promise<GalleryItem[]> => {
    return apiClient.get<GalleryItem[]>('/api/owner/gallery');
  },

  createGalleryItem: async (request: CreateGalleryItemRequest): Promise<GalleryItem> => {
    return apiClient.post<GalleryItem>('/api/owner/gallery', request);
  },

  updateGalleryItem: async (id: number, request: CreateGalleryItemRequest): Promise<GalleryItem> => {
    return apiClient.put<GalleryItem>(`/api/owner/gallery/${id}`, request);
  },

  deleteGalleryItem: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/api/owner/gallery/${id}`);
  },

  getStorefrontGallery: async (shopId: number): Promise<GalleryItem[]> => {
    return apiClient.get<GalleryItem[]>(`/api/storefront/shops/${shopId}/gallery`);
  },
};
