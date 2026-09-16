/**
 * Utility for resolving and sanitizing image URLs across storefront and marketplace.
 * Prevents Next.js image proxy from making requests to dummy/mock domains (like example.com)
 * which return 404 upstream errors.
 */

export const FALLBACK_BAKERY_COVER =
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80';

export const FALLBACK_CAKE_IMAGE =
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80';

const DUMMY_DOMAINS = [
  'example.com',
  'placeholder.com',
  'via.placeholder.com',
  'test.com',
  'dummyimage.com',
];

/**
 * Returns true if the URL is empty, invalid, or belongs to a known dummy placeholder domain.
 */
export function isDummyOrInvalidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return true;

  return DUMMY_DOMAINS.some((domain) => trimmed.includes(domain));
}

/**
 * Returns a guaranteed valid image URL, substituting the provided fallback
 * if the URL is missing, invalid, or a mock placeholder domain.
 */
export function getSafeImageUrl(
  url?: string | null,
  fallback: string = FALLBACK_CAKE_IMAGE
): string {
  if (isDummyOrInvalidImageUrl(url)) {
    return fallback;
  }
  return url!.trim();
}
