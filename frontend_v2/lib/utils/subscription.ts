import type { SubscriptionRecord, SubscriptionStatusType } from '@/types/owner';

/**
 * Calculates remaining calendar days from current date to subscription expiry date.
 * Uses date-only components (UTC normalized) to avoid timezone and hour/minute discrepancies.
 *
 * @param expiryDateStr ISO date string or formatted date string from backend
 * @param now Optional override for current date (useful for testing)
 * @returns Number of calendar days remaining, or null if expiry date is missing/invalid
 */
export function calculateSubscriptionDaysRemaining(
  expiryDateStr?: string | null,
  now: Date = new Date()
): number | null {
  if (!expiryDateStr) return null;

  // Split on either 'T' or space to extract YYYY-MM-DD
  const datePart = expiryDateStr.split(/[T\s]/)[0];
  const parts = datePart.split('-');
  if (parts.length < 3) return null;

  const targetYear = parseInt(parts[0], 10);
  const targetMonth = parseInt(parts[1], 10) - 1; // 0-indexed in JS Date
  const targetDay = parseInt(parts[2], 10);

  if (isNaN(targetYear) || isNaN(targetMonth) || isNaN(targetDay)) return null;

  // Normalize both dates to midnight UTC for pure calendar-day difference
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(targetYear, targetMonth, targetDay);

  const diffMs = targetUtc - todayUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface SubscriptionHeaderInfo {
  status: SubscriptionStatusType | string;
  badgeVariant: 'default' | 'success' | 'warning' | 'error';
  badgeLabel: string;
  daysRemainingText: string;
  daysRemaining: number | null;
}

/**
 * Resolves the display metadata for the Owner Dashboard header subscription indicator.
 * Strictly adheres to backend SubscriptionStatus enum values and domain rules.
 */
export function getSubscriptionHeaderInfo(
  subscription: SubscriptionRecord | null,
  shopStatus?: string | null,
  nowOverride?: Date,
  userRole?: string | null,
  hasShop: boolean = true
): SubscriptionHeaderInfo {
  // If user is Admin and has no shop attached
  if ((userRole === 'ROLE_ADMIN' || userRole === 'ADMIN' || String(userRole).includes('ADMIN')) && !hasShop) {
    return {
      status: 'ADMIN_VIEW',
      badgeVariant: 'default',
      badgeLabel: 'ADMIN VIEW',
      daysRemainingText: 'Platform Administrator',
      daysRemaining: null,
    };
  }

  // Determine authoritative status: subscription status takes priority, falls back to shop status
  const rawStatus = (subscription?.status || shopStatus || (!hasShop ? 'NO_SHOP' : 'NO_PLAN')).toUpperCase();
  const daysRemaining = calculateSubscriptionDaysRemaining(subscription?.expiryDate, nowOverride);

  // Map to CakeStore UI Badge variants
  let badgeVariant: 'default' | 'success' | 'warning' | 'error' = 'default';
  let badgeLabel = rawStatus.replace(/_/g, ' ');

  switch (rawStatus) {
    case 'ACTIVE':
      badgeVariant = 'success';
      break;
    case 'EXPIRING_SOON':
    case 'GRACE_PERIOD':
      badgeVariant = 'warning';
      break;
    case 'EXPIRED':
    case 'SUSPENDED':
      badgeVariant = 'error';
      break;
    case 'NO_PLAN':
    case 'PENDING':
      badgeVariant = 'warning';
      break;
    case 'NO_SHOP':
    case 'CANCELLED':
    default:
      badgeVariant = 'default';
      break;
  }

  let daysRemainingText = '';

  switch (rawStatus) {
    case 'ACTIVE':
    case 'EXPIRING_SOON':
      if (daysRemaining !== null) {
        if (daysRemaining > 1) {
          daysRemainingText = `${daysRemaining} days left in subscription`;
        } else if (daysRemaining === 1) {
          daysRemainingText = '1 day left in subscription';
        } else if (daysRemaining === 0) {
          daysRemainingText = 'Expires today';
        } else {
          // Negative remaining days must never display a positive number
          daysRemainingText = 'Subscription expired';
        }
      } else {
        daysRemainingText = 'Active subscription';
      }
      break;

    case 'GRACE_PERIOD':
      if (daysRemaining !== null && daysRemaining > 1) {
        daysRemainingText = `${daysRemaining} days left in grace period`;
      } else if (daysRemaining === 1) {
        daysRemainingText = '1 day left in grace period';
      } else {
        daysRemainingText = 'In grace period';
      }
      break;

    case 'EXPIRED':
      daysRemainingText = 'Subscription expired';
      break;

    case 'SUSPENDED':
      daysRemainingText = 'Subscription suspended';
      break;

    case 'CANCELLED':
      daysRemainingText = 'Subscription cancelled';
      break;

    case 'PENDING':
      badgeLabel = 'PAYMENT REQUIRED';
      daysRemainingText = 'Payment required';
      break;

    case 'NO_PLAN':
      badgeLabel = 'NO PLAN';
      daysRemainingText = 'Subscription required';
      break;

    case 'NO_SHOP':
      badgeLabel = 'NO BAKERY';
      daysRemainingText = 'No bakery created yet';
      break;

    default:
      badgeLabel = 'NO PLAN';
      daysRemainingText = 'Subscription required';
      break;
  }

  return {
    status: rawStatus,
    badgeVariant,
    badgeLabel,
    daysRemainingText,
    daysRemaining,
  };
}
