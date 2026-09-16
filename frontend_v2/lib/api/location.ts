import { apiClient } from './client';
import {
  LocationCountry,
  LocationState,
  LocationDistrict,
  LocationCity,
  LocationLocality,
  PincodeLookupResponse,
  LocationValidationPayload,
  LocationReadiness,
} from '@/types/location';

export const locationApi = {
  getReadiness: async (): Promise<LocationReadiness> => {
    return apiClient.get<LocationReadiness>('/api/locations/readiness');
  },

  getCountries: async (): Promise<LocationCountry[]> => {
    return apiClient.get<LocationCountry[]>('/api/locations/countries');
  },

  getStates: async (countryCode: string = 'IND'): Promise<LocationState[]> => {
    return apiClient.get<LocationState[]>('/api/locations/states', {
      params: { countryCode },
    });
  },

  getDistricts: async (stateId: number): Promise<LocationDistrict[]> => {
    return apiClient.get<LocationDistrict[]>('/api/locations/districts', {
      params: { stateId },
    });
  },

  getCities: async (districtId: number): Promise<LocationCity[]> => {
    return apiClient.get<LocationCity[]>('/api/locations/cities', {
      params: { districtId },
    });
  },

  getLocalities: async (cityId: number): Promise<LocationLocality[]> => {
    return apiClient.get<LocationLocality[]>('/api/locations/localities', {
      params: { cityId },
    });
  },

  getPincodes: async (params: { districtId?: number; localityId?: number }): Promise<string[]> => {
    return apiClient.get<string[]>('/api/locations/pincodes', {
      params: {
        districtId: params.districtId,
        localityId: params.localityId,
      },
    });
  },

  lookupPincode: async (pincode: string): Promise<PincodeLookupResponse> => {
    return apiClient.get<PincodeLookupResponse>(`/api/locations/pincodes/${encodeURIComponent(pincode.trim())}`);
  },

  validateLocation: async (payload: LocationValidationPayload): Promise<{ valid: boolean; message: string }> => {
    return apiClient.post<{ valid: boolean; message: string }>('/api/locations/validate', payload);
  },
};
