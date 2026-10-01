// Local Storage Utility for Customer Review Ownership & Editing

export interface StoredReview {
  id: number;
  source: 'PRODUCT_REVIEW' | 'FEEDBACK';
  shopId: number | string;
  productId?: number | string | null;
  productName?: string;
  customerDisplayName?: string;
  customerPhone?: string;
  rating: number;
  reviewText: string;
  orderNumber?: string;
  orderReference?: string;
  cakeImageUrl?: string;
  cakeVideoUrl?: string;
  editToken?: string;
  createdAt: string;
}

const STORAGE_KEY = 'cakestore_customer_reviews';
const NAME_STORAGE_KEY = 'cakestore_customer_name';
const PHONE_STORAGE_KEY = 'cakestore_customer_phone';

export const reviewStorage = {
  getStoredReviews(): StoredReview[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveStoredReview(review: StoredReview): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getStoredReviews();
      const filtered = existing.filter(
        (r) => !(String(r.id) === String(review.id) && r.source === review.source)
      );
      filtered.unshift(review);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      if (review.customerDisplayName?.trim()) {
        localStorage.setItem(NAME_STORAGE_KEY, review.customerDisplayName.trim());
      }
      if (review.customerPhone?.trim()) {
        localStorage.setItem(PHONE_STORAGE_KEY, review.customerPhone.trim());
      }
    } catch (e) {
      console.warn('Failed to save review to localStorage', e);
    }
  },

  removeStoredReview(id: number | string, source?: 'PRODUCT_REVIEW' | 'FEEDBACK'): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getStoredReviews();
      const filtered = existing.filter((r) => {
        if (source) {
          return !(String(r.id) === String(id) && r.source === source);
        }
        return String(r.id) !== String(id);
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to remove review from localStorage', e);
    }
  },

  getStoredReview(id: number | string, source?: 'PRODUCT_REVIEW' | 'FEEDBACK'): StoredReview | undefined {
    const existing = this.getStoredReviews();
    if (source) {
      const exactMatch = existing.find((r) => String(r.id) === String(id) && r.source === source);
      if (exactMatch) return exactMatch;
    }
    return existing.find((r) => String(r.id) === String(id));
  },

  getStoredReviewToken(reviewId: number | string, source?: 'PRODUCT_REVIEW' | 'FEEDBACK'): string | undefined {
    const stored = this.getStoredReview(reviewId, source);
    return stored?.editToken;
  },

  setStoredReviewToken(reviewId: number | string, token: string, source?: 'PRODUCT_REVIEW' | 'FEEDBACK'): void {
    if (typeof window === 'undefined' || !token) return;
    try {
      const existing = this.getStoredReviews();
      const item = existing.find((r) => {
        if (source) return String(r.id) === String(reviewId) && r.source === source;
        return String(r.id) === String(reviewId);
      });
      if (item) {
        item.editToken = token;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      }
    } catch (e) {
      console.warn('Failed to set review token in localStorage', e);
    }
  },

  /**
   * Only returns true if the review was explicitly authored and saved in this browser's session/storage.
   * Strangers and other visitors will never see edit/delete buttons on reviews they did not create.
   */
  isCustomerReview(reviewId: number | string, _customerName?: string, source?: string): boolean {
    if (typeof window === 'undefined') return false;
    const existing = this.getStoredReviews();
    
    return existing.some((r) => {
      if (source && r.source && r.source !== source) return false;
      return String(r.id) === String(reviewId);
    });
  },

  getStoredCustomerName(): string {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(NAME_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  },

  setStoredCustomerName(name: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(NAME_STORAGE_KEY, name.trim());
    } catch {}
  },

  getStoredCustomerPhone(): string {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(PHONE_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  },

  setStoredCustomerPhone(phone: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PHONE_STORAGE_KEY, phone.trim());
    } catch {}
  },
};
