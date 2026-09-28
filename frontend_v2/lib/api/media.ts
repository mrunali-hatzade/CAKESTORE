import { apiClient } from './client';

export const mediaApi = {
  uploadImage: async (file: File, type: 'products' | 'covers' | 'logos' | 'documents' = 'products'): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.post<{ url: string }>('/api/owner/media/upload', formData);
  },

  uploadGuestReferenceImage: async (file: File): Promise<{ url: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{ url: string; fileName: string }>('/api/storefront/media/upload-reference', formData);
  },
};
