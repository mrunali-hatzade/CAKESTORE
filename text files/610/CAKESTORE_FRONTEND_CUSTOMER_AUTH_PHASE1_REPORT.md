# CakeStore Frontend Phase 1 Report
## Customer Passwordless Authentication Integration

**Date:** October 2026
**Status:** Completed & Verified (Build passing)

### Overview
This phase successfully integrated the passwordless Phone + OTP customer authentication flow into the existing Next.js (`frontend_v2`) architecture. We strictly adhered to the **REUSE BEFORE CREATE** principle by discovering and refactoring existing guest order lookup components rather than building redundant authentication pages from scratch.

### Architectural Decisions & Reuse

1. **Separation of Authentication Contexts**
   - The existing `AuthContext.tsx` leverages `localStorage` and is strictly designed for long-lived Owner/Admin sessions.
   - Instead of polluting this context, we created a lightweight `CustomerAuthContext.tsx` specifically for `ROLE_CUSTOMER` authentication. 
   - This context securely persists the customer JWT and phone number in **`sessionStorage`**, ensuring sessions are tab-scoped and cleared more aggressively, fitting the "guest/customer" order tracking model.

2. **Component Reuse**
   - Discovered existing components that already implemented a skeleton of the Phone→OTP flow: `CustomerOrderLookupModal.tsx` and `StorefrontTrackOrderTab.tsx`.
   - Both components originally managed `guestToken` state individually and interacted with `sessionStorage` directly.
   - Refactored both components to consume the centralized `useCustomerAuth()` hook.

3. **API Client Reuse**
   - The centralized `apiClient.ts` was left untouched.
   - `ordersApi.getMyOrders()` was verified to explicitly accept a `Bearer` token in the headers, meaning no underlying fetch interceptors needed modification to support the secondary customer token.

### Modifications Made

| File | Action | Description |
|------|--------|-------------|
| `lib/auth/CustomerAuthContext.tsx` | **Created** | Centralized context for passwordless Customer Auth using `sessionStorage`. Exposes `requestOtp`, `verifyOtp`, `logout`, and token state. |
| `app/layout.tsx` | **Modified** | Wrapped the root application tree with `<CustomerAuthProvider>` immediately inside `<AuthProvider>`. |
| `components/customer/common/CustomerOrderLookupModal.tsx` | **Refactored** | Replaced internal raw `sessionStorage` logic and OTP handling with `useCustomerAuth()` hook. |
| `components/customer/storefront/tabs/StorefrontTrackOrderTab.tsx` | **Refactored** | Replaced direct OTP and token management with `useCustomerAuth()` hook, syncing the tab's UI state with the global customer auth state. |

### Technical Verification
- **ESLint/Typescript:** Fixed unescaped entities (e.g., `couldn't` to `couldn&apos;t`).
- **Build Status:** `next build` completed successfully with no type errors.
- **Security:** Owner and Customer authentication states remain completely isolated. The frontend does not parse or validate JWT roles locally, deferring entirely to the proven backend Spring Security configuration.

### Next Steps (Deferred Phases)
The passwordless infrastructure is now globally available in the frontend via `useCustomerAuth()`.
The next logical phase (Frontend Phase 2) will be injecting this context into `app/checkout/page.tsx` to link guest checkouts to customer profiles.
