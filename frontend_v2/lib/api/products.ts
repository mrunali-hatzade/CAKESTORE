import { apiClient } from './client';
import { Product, CreateProductRequest } from '@/types/product';
import { PaginatedResponse } from '@/types/order';

export const productsApi = {
  getOwnerProducts: async (page = 0, size = 20, search?: string, categoryId?: string | number): Promise<PaginatedResponse<Product>> => {
    return apiClient.get<PaginatedResponse<Product>>('/api/owner/products', {
      params: { 
        page, 
        size, 
        ...(search ? { search } : {}),
        ...(categoryId && categoryId !== 'ALL' ? { categoryId } : {})
      }
    });
  },

  createProduct: async (product: CreateProductRequest): Promise<Product> => {
    return apiClient.post<Product>('/api/owner/products', product);
  },

  updateProduct: async (id: number, product: CreateProductRequest): Promise<Product> => {
    return apiClient.put<Product>(`/api/owner/products/${id}`, product);
  },

  deleteProduct: async (id: number): Promise<void> => {
    return apiClient.delete<void>(`/api/owner/products/${id}`);
  },
};
