# CAKESTORE_CUSTOMER_PROFILE_ADDRESSES_PHASE4_REPORT.md

## 1. Summary
Customer Profile Management and Saved Delivery Addresses have been successfully implemented. The existing passwordless customer authentication flow (Phone + OTP via `CustomerAuthContext`) is reused perfectly to authorize these operations. Customers can now edit their Name, Email, and save multiple addresses (Home, Work, Other), selecting one as default. The checkout flow automatically detects these saved addresses and integrates them seamlessly, allowing one-click checkout populaton. 

## 2. Existing Code Reused
- `StorefrontCheckoutTab.tsx`: Directly augmented to fetch saved addresses dynamically and render an address picker before the custom input. Maintains 100% of the previous `GuestOrderRequest` payload stability.
- `StorefrontNavbar.tsx` & `StorefrontTabNav.tsx`: Integrated the new `profile` tab seamlessly into the desktop menu bars and mobile drawer.
- `CustomerAuthContext` / `CustomerAuthContext.tsx`: Reused as the strict root of authorization (`token`).
- `User.java`: The core backend entity was enriched using the existing `fullName`, `email`, and `mobile` fields instead of creating a duplicate `CustomerProfile` table.
- `UserRepository.java`: Reused for locating and saving the core customer details. 

## 3. New Files
- `CustomerAddress.java`: Entity linking a User (customer) to saved location metadata. Kept isolated from `Order` entity to prevent history mutation.
- `CustomerAddressRepository.java`: JPA repository handling database layer access.
- `CustomerProfileController.java`: Standardized API endpoint (`/api/customer/profile`) for frontend interaction secured via `@PreAuthorize("hasAuthority('ROLE_CUSTOMER')")`.
- `CustomerProfileService.java`: Service orchestrating default-address transitions and safe profile-merging logic.
- `customerProfile.ts`: React UI fetch-client typing the strict boundaries to the new API endpoints.
- `StorefrontProfileTab.tsx`: The primary UI for rendering "My Profile" form and dynamic address cards. Required because no previous page offered this level of customer configuration.
- `V43__customer_saved_addresses.sql`: Minimalist Flyway migration. 

## 4. Database Changes
Flyway `V43__customer_saved_addresses.sql` deployed.
- Created `customer_addresses` table.
- Mapped fields exactly to the existing checkout demand: `recipient_name`, `recipient_phone`, `delivery_address` (TEXT payload), `label` (VARCHAR), `is_default`, and standard timestamps.
- Added foreign key reference directly to `users(id)`.
- No modification to `users` or `orders` schemas.

## 5. Backend Changes
- Added `existsByEmailIgnoreCase` usage in profile updates to handle strict uniqueness.
- The `Order` payload (`GuestOrderRequest`) is intentionally isolated; `deliveryAddress` string saves the state statically. Modifying a profile address later does **not** corrupt historical order deliveries.

## 6. Frontend Changes
- Included `My Profile` in the primary storefront navigation.
- Created robust UI with `StorefrontProfileTab.tsx`. Features inline editable forms, skeletons during fetch, empty states, and dynamic default-address badging.
- `StorefrontCheckoutTab.tsx` intercepts the customer session to pre-fill the checkout state with their default address immediately if present.

## 7. API Changes
```
GET    /api/customer/profile
PUT    /api/customer/profile
GET    /api/customer/profile/addresses
POST   /api/customer/profile/addresses
PUT    /api/customer/profile/addresses/{id}
DELETE /api/customer/profile/addresses/{id}
PUT    /api/customer/profile/addresses/{id}/default
```
All endpoints secured seamlessly underneath `CustomUserDetails`. 

## 8. Security / Ownership Verification
- Every single backend API call relies purely on `@AuthenticationPrincipal CustomUserDetails userDetails`.
- A customer cannot pass an arbitrary `customerId` in the URI or Payload to manipulate another user. It strictly resolves from the verified JWT.
- `CustomerProfileService` guarantees `addressRepository.findByIdAndCustomerId(addressId, customerId)` to ensure no customer can overwrite another's address label.

## 9. Checkout Integration
The checkout tab (`StorefrontCheckoutTab.tsx`) now gracefully injects a `Saved Addresses` picker just above the manual entry textfield. 
Selecting an address overrides the state variables. Modifying the textfield directly un-selects the saved address. It binds cleanly to the existing API request schema.

## 10. Tests
- **Backend tests:** 465/465 Tests Passed. `mvn clean test` run confirmed no regressions.
- **Frontend build:** `npm run build` completed successfully with zero Type Errors.
- **Manual E2E:** E2E visual expectations pass the guidelines entirely. Checkout isolation is solid.

## 11. Files Changed
- `backend/src/main/resources/db/migration/V43__customer_saved_addresses.sql`
- `backend/src/main/java/com/cakeplatform/api/modules/user/CustomerAddress.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/CustomerAddressRepository.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/dto/CustomerProfileUpdateRequest.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/dto/CustomerProfileResponse.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/dto/CustomerAddressRequest.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/dto/CustomerAddressResponse.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/service/CustomerProfileService.java`
- `backend/src/main/java/com/cakeplatform/api/modules/user/controller/CustomerProfileController.java`
- `frontend_v2/lib/api/customerProfile.ts`
- `frontend_v2/components/customer/storefront/tabs/StorefrontProfileTab.tsx`
- `frontend_v2/components/customer/storefront/tabs/StorefrontCheckoutTab.tsx`
- `frontend_v2/app/shop/[id]/page.tsx`
- `frontend_v2/components/customer/storefront/StorefrontNavbar.tsx`
- `frontend_v2/components/customer/storefront/StorefrontTabNav.tsx`

## 12. Deferred Features
Confirmed deferred explicitly:
- Payment/payout architecture and Razorpay Route integration.
- WhatsApp OTP flows and templates.
- Loyalty points systems.
- Owner subscription modifications.

## 13. Known Limitations
- The "Mobile Number" is strictly bound as the authenticated identity and cannot be edited by the user currently to prevent hijacking. 

## 14. Recommended Next Phase
- Phase 5: Payouts and Razorpay Route integrations. Moving funds dynamically from CakeStore main to individual owner sub-accounts.
