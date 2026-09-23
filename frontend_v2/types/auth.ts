export type UserRole = 'ROLE_CUSTOMER' | 'ROLE_SHOP_OWNER' | 'ROLE_ADMIN';

export interface AuthUser {
  email: string;
  role: UserRole;
  shopId?: number | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  email: string;
  shopId?: number | null;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
  mobile: string;
  businessName: string;
  businessType?: string;
  businessDescription?: string;
  businessPhone?: string;
  businessEmail?: string;
  yearsInBusiness?: number;
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  fssaiRegistration?: string;
  verificationFile?: File | null;
  latitude?: number;
  longitude?: number;
}
