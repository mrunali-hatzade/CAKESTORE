import { apiClient } from './client';

export interface CustomerProfile {
  id: number;
  fullName: string | null;
  email: string | null;
  mobile: string;
}

export interface CustomerProfileUpdateRequest {
  fullName: string;
  email: string | null;
}

export interface CustomerAddress {
  id: number;
  label: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  default: boolean;
}

export interface CustomerAddressRequest {
  label: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  default: boolean;
}

export const customerProfileApi = {
  getProfile: async (token: string): Promise<CustomerProfile> => {
    return apiClient.get<CustomerProfile>('/api/customer/profile', { token });
  },

  updateProfile: async (data: CustomerProfileUpdateRequest, token: string): Promise<CustomerProfile> => {
    return apiClient.put<CustomerProfile>('/api/customer/profile', data, { token });
  },

  getAddresses: async (token: string): Promise<CustomerAddress[]> => {
    return apiClient.get<CustomerAddress[]>('/api/customer/profile/addresses', { token });
  },

  addAddress: async (data: CustomerAddressRequest, token: string): Promise<CustomerAddress> => {
    return apiClient.post<CustomerAddress>('/api/customer/profile/addresses', data, { token });
  },

  updateAddress: async (id: number, data: CustomerAddressRequest, token: string): Promise<CustomerAddress> => {
    return apiClient.put<CustomerAddress>(`/api/customer/profile/addresses/${id}`, data, { token });
  },

  deleteAddress: async (id: number, token: string): Promise<void> => {
    return apiClient.delete(`/api/customer/profile/addresses/${id}`, { token });
  },

  setDefaultAddress: async (id: number, token: string): Promise<{ success: boolean }> => {
    return apiClient.put<{ success: boolean }>(`/api/customer/profile/addresses/${id}/default`, {}, { token });
  }
};
