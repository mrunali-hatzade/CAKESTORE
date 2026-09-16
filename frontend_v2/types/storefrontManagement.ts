export interface ShopBanner {
  id: number;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopBannerRequest {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ShopBusinessHour {
  id?: number;
  dayOfWeek: string; // MONDAY..SUNDAY
  isOpen: boolean;
  openTime: string; // "09:00:00" or "09:00"
  closeTime: string; // "21:00:00" or "21:00"
}

export interface ShopBusinessHoursRequest {
  dayOfWeek: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface ShopDeliveryConfig {
  id?: number;
  deliveryChargeType: 'FREE' | 'FIXED' | string;
  fixedChargeAmount: number;
  minOrderForFreeDelivery?: number | null;
  deliveryNotes?: string | null;
}

export interface ShopStorefrontSettings {
  id?: number;
  heroBannerEnabled: boolean;
  topRatedEnabled: boolean;
  reviewsEnabled: boolean;
  bakeryInfoEnabled: boolean;
  categoriesEnabled: boolean;
  filtersEnabled: boolean;
  ratingsEnabled: boolean;
  aboutStoryEnabled: boolean;
  aboutImageEnabled: boolean;
  fulfillmentEnabled: boolean;
  leadTimeDays: number;
  leadTimeMessage?: string | null;
  customCakesEnabled: boolean;
  whatsappEnabled: boolean;
  phoneEnabled: boolean;
  emailEnabled: boolean;
  addressEnabled: boolean;
  mapEnabled: boolean;
  businessHoursEnabled: boolean;
}

export interface ShopCustomFormField {
  id?: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DROPDOWN' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'TIME' | 'IMAGE' | string;
  isRequired: boolean;
  isEnabled: boolean;
  optionsJson?: string | null;
  displayOrder: number;
}
