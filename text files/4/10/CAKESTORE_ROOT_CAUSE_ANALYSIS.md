# CAKESTORE ROOT CAUSE ANALYSIS

## Overview
Initial compilation and baseline testing indicates that the system is structurally sound at the compilation level. Both backend and frontend successfully built. Zero automated test failures were found in the 454 backend tests. 

However, functional errors and integration mismatch often manifest at runtime between the API contracts and frontend expectations. 

## Group 1: Deployment/Configuration
**SYMPTOM:** Missing SMS configurations.
**ROOT CAUSE:** `application.yml` lacks Twilio variables.
**AFFECTED COMPONENTS:** SMS notification service.
**CORRECT FIX:** Environment variables must be provisioned.
**DEPENDENCIES:** None.
**TEST REQUIRED:** Trigger OTP or notification.

## Group 2: Frontend Integration
**SYMPTOM:** Eslint dependency warnings on React hooks (e.g. `exhaustive-deps` in `checkout/page.tsx`, `ProductDetailModal.tsx`).
**ROOT CAUSE:** Missing dependencies in `useEffect` and `useCallback` arrays.
**AFFECTED COMPONENTS:** Checkout page, Reviews, Storefront rendering.
**CORRECT FIX:** Audit react hook dependencies. Either add them, or rewrite the effect to safely ignore them using refs.
**DEPENDENCIES:** Frontend state management.
**TEST REQUIRED:** Component re-render stability tests.

## Group 3: Database & Migrations
**SYMPTOM:** Hard deletes vs Soft Deletes logic.
**ROOT CAUSE:** V38 and V39 introduce `is_deleted` flags, but old code may still rely on `DELETE` queries or lack `WHERE is_deleted = false`.
**AFFECTED COMPONENTS:** `users`, `shops` tables.
**CORRECT FIX:** Audit JPA repositories for `@Where(clause = "is_deleted = false")`.
**DEPENDENCIES:** Spring Data JPA.
**TEST REQUIRED:** Attempt to fetch a soft-deleted user.

## Group 4: API Contract
**SYMPTOM:** Disconnect between frontend data fetching (e.g. empty lists on error) and backend HTTP 500s.
**ROOT CAUSE:** Frontend swallowing errors using `catch (e) { return [] }` or similar.
**AFFECTED COMPONENTS:** API client hooks.
**CORRECT FIX:** Map exact HTTP status codes to specific UI error bounds.
**DEPENDENCIES:** Axios/Fetch error interceptors.
**TEST REQUIRED:** Force 500 error from backend and verify UI shows error toast.

*(This report will be continuously updated as runtime validation phases are fully mapped).*
