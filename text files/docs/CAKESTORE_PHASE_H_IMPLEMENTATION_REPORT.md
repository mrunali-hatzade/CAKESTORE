# CakeStore — Phase H Implementation Report
## Customer Store Launch Hardening (H1 & H2)

**Status:** Completed & Verified  
**Date:** September 10, 2026  
**Verdict:** **PASS** (250/250 Backend Tests Passing, 31/31 Frontend Routes Compiled)

---

### 1. Executive Summary

Phase H successfully hardens the core customer shopping and inquiry workflows for the CakeStore SaaS platform prior to public commercial launch. It resolves the two P1 pre-launch audit items identified in the pre-launch gap audit without disrupting ongoing architectural boundaries:

1. **H1 — Guest Custom Cake Reference Upload:** Delivered a secure, dedicated media upload pipeline (`POST /api/storefront/media/upload-reference`) allowing unauthenticated customers to upload custom cake design inspirations. The upload pipeline implements strict magic-byte file inspection (JPEG, PNG, WEBP), size constraints ($\le 5\text{MB}$), path-traversal prevention, and sanitized server-generated UUID storage under `uploads/custom-cake-references/`. The returned URL is seamlessly linked with `custom_cake_requests.reference_image_url` and presented in the Owner Dashboard inquiry viewer.
2. **H2 — Delivery Slot Capacity Enforcement:** Replaced naive slot assignment with authoritative PostgreSQL/JPA capacity enforcement. Slot row selection uses pessimistic write locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`), validates date matching and day-of-week constraints, counts only active capacity-consuming order statuses, and cleanly rejects overbooking with HTTP 409 Conflict (`error: "SLOT_FULL"`). Slot capacity cancellation release is fully supported, and owner capacity decreases are validated against upcoming active bookings.

All work strictly adhered to the mandate: **Payments (Razorpay / cashflow gateways) and external Notification dispatchers (WhatsApp / SMS APIs) were preserved and untouched.**

---

### 2. H1: Guest Custom Cake Reference Upload

#### 2.1 Public Endpoint Specifications
- **Route:** `POST /api/storefront/media/upload-reference`
- **Authentication:** Public / Unauthenticated (`permitAll()` in Spring Security).
- **Consumes:** `multipart/form-data` with form field `file`.
- **Response Format:**
  ```json
  {
    "url": "http://localhost:8080/uploads/custom-cake-references/ref-a1b2c3d4-e5f6-7890.jpg",
    "filename": "ref-a1b2c3d4-e5f6-7890.jpg",
    "size": 184520,
    "contentType": "image/jpeg"
  }
  ```

#### 2.2 Security Validations & Anti-Abuse
- **Magic-Byte Inspection:** Inspects raw file header bytes directly to prevent mime-type spoofing:
  - **JPEG:** `FF D8 FF`
  - **PNG:** `89 50 4E 47 0D 0A 1A 0A`
  - **WEBP:** `52 49 46 46` ... `57 45 42 50` (RIFF...WEBP)
  - Rejects SVGs, HTML, EXEs, PDFs, scripts, and spoofed extensions (`.jpg` containing HTML/PHP) with HTTP 400 Bad Request.
- **Payload Limit:** Maximum 5MB (`5 * 1024 * 1024` bytes) strictly enforced before writing to disk.
- **Path Traversal Protection:** User filenames (`../../evil.jpg`) are completely ignored. Files are stored using cryptographic UUIDs: `ref-<uuid>.<ext>`.
- **Directory Isolation:** Stored in dedicated physical subfolder `uploads/custom-cake-references/`, distinct from tenant products, logos, or admin assets.

#### 2.3 Frontend & Database Integration
- **Database:** Uses existing Flyway `V6__custom_cake_requests.sql` column `reference_image_url VARCHAR(500)`.
- **Frontend Client:** Added `uploadGuestReferenceImage` in `frontend_v2/lib/api/media.ts`.
- **Storefront Components:** 
  - `components/customer/storefront/tabs/StorefrontCustomCakesTab.tsx`: Directly uploads reference photos on file selection, shows real-time upload spinners, previews uploaded images, and submits authoritative URLs.
  - `components/customer/storefront/CustomCakeInquiryModal.tsx`: Uploads reference images to `/api/storefront/media/upload-reference` and submits the URL with the custom inquiry.
- **Owner Dashboard:** `app/dashboard/owner/enquiries/page.tsx` renders thumbnail previews of reference images with modal zoom and direct download links.

---

### 3. H2: Delivery Slot Capacity Enforcement

#### 3.1 Pessimistic Concurrency & Data Integrity
To eliminate race conditions when two customers attempt to check out simultaneously for the last remaining slot:
- `ShopDeliverySlotRepository.java`:
  ```java
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ShopDeliverySlot s WHERE s.id = :slotId AND s.shop.id = :shopId")
  Optional<ShopDeliverySlot> findByIdAndShopIdWithLock(@Param("slotId") Long slotId, @Param("shopId") Long shopId);
  ```
- All checks execute inside a single `@Transactional` boundary in `CustomerStorefrontService.placeGuestOrder`. The slot row is locked, the database count query executes, capacity is compared, and the order is persisted before the lock is released.

#### 3.2 Database Queries & Active Order Accounting
- Active orders are queried dynamically:
  ```java
  @Query("SELECT COUNT(o) FROM Order o WHERE o.deliverySlot.id = :slotId " +
         "AND o.deliveryDate = :deliveryDate " +
         "AND o.orderStatus IN :activeStatuses")
  long countActiveOrdersForSlotAndDate(
          @Param("slotId") Long slotId,
          @Param("deliveryDate") LocalDate deliveryDate,
          @Param("activeStatuses") Collection<String> activeStatuses
  );
  ```
- **Capacity Calculation:**
  $$\text{Remaining Capacity} = \max(0, \text{maxOrders} - \text{bookedOrders})$$
  $$\text{Available} = (\text{Remaining Capacity} > 0) \land (\text{isActive} = \text{true})$$

#### 3.3 HTTP 409 Conflict Contract
When capacity is exhausted ($\text{bookedOrders} \ge \text{maxOrders}$):
- Server throws `DeliverySlotFullException` with `errorCode = "SLOT_FULL"`.
- `GlobalExceptionHandler.java` maps this to HTTP 409 Conflict:
  ```json
  {
    "error": "SLOT_FULL",
    "message": "This delivery slot is fully booked. Please select another slot."
  }
  ```
- Frontend `StorefrontCheckoutTab.tsx` intercepts `SLOT_FULL`, flags the selected slot as unavailable in UI state, resets selection, and displays a user-friendly amber banner: *"This delivery slot just filled up. Please pick an alternative time."*

#### 3.4 Owner Slot Capacity Modification Protection
When an owner attempts to reduce `maxOrders` on a slot in `OwnerDeliverySlotController.updateSlot`:
- The controller queries `findMaxActiveOrdersOnAnyUpcomingDate(slotId, LocalDate.now())`.
- If new `maxOrders < maxActive`, the update is rejected with HTTP 400 Bad Request:
  *"Cannot reduce capacity to X: there are already Y active orders booked for an upcoming date."*

---

### 4. Order Status & Capacity Consumption Matrix

| Order Status | Consumes Capacity? | Rationale & Business Behavior |
|:---|:---:|:---|
| `NEW` | **YES** | Order placed via COD or checkout. Kitchen reserved; delivery slot allocated. |
| `CONFIRMED` | **YES** | Accepted by bakery owner. Scheduled for production. |
| `PREPARING` | **YES** | Baking/decorating in kitchen. Slot actively committed. |
| `READY_FOR_PICKUP` | **YES** | Ready in store or staged for courier dispatch. |
| `OUT_FOR_DELIVERY` | **YES** | In transit with rider during the assigned delivery window. |
| `DELIVERED` | **YES** | Completed order for that date; slot was used. |
| `CANCELLED` | **NO** | Order rejected or cancelled; capacity released immediately for other buyers. |
| `REFUNDED` | **NO** | Order returned/cancelled with payment reversed; slot freed. |

---

### 5. Test Coverage & Verification Results

#### 5.1 Backend Test Summary
- **Total Tests Run:** 250
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **Execution Result:** `BUILD SUCCESS` (36.464s)

#### 5.2 Phase H Specific Test Suites

##### Suite 1: `GuestMediaUploadSecurityTest.java` (15 tests, 100% Pass)
- `H1.1`: Valid JPEG upload succeeds with 200 OK and valid URL
- `H1.2`: Valid PNG upload succeeds with 200 OK and valid URL
- `H1.3`: Valid WEBP upload succeeds with 200 OK and valid URL
- `H1.4`: File exceeding 5MB is rejected with 400 Bad Request
- `H1.5`: Spoofed file (`.jpg` containing text/HTML) rejected via magic-byte mismatch
- `H1.6`: SVG file rejected (XSS vector prevention)
- `H1.7`: HTML file rejected
- `H1.8`: Executable (`.exe`) file rejected
- `H1.9`: PDF document rejected (only images allowed)
- `H1.10`: Path traversal attempt in filename sanitized to safe UUID name
- `H1.11`: Empty/zero-byte file rejected with 400 Bad Request
- `H1.12`: Uploaded image URL links to custom cake inquiry successfully
- `H1.13`: Cross-shop inquiry isolation verified
- `H1.14`: Missing reference image handled cleanly without NPE
- `H1.15`: Existing owner media upload remains functional and backwards compatible

##### Suite 2: `DeliverySlotCapacityTest.java` (15 tests, 100% Pass)
- `H2.1`: Slot with capacity 5 and 0 booked shows remaining 5 and available=true
- `H2.2`: Slot with capacity 5 and 2 booked shows remaining 3 and available=true
- `H2.3`: Slot with capacity 5 and 5 booked shows remaining 0 and available=false
- `H2.4`: Last available slot (4 of 5 booked) places order successfully
- `H2.5`: Overbooking attempt when slot is full throws `DeliverySlotFullException` with `SLOT_FULL`
- `H2.6`: Cancelled order releases slot capacity and enables subsequent booking
- `H2.7`: Inactive delivery slot is rejected with 400 Bad Request
- `H2.8`: Booking for a past delivery date is rejected with 400 Bad Request
- `H2.9`: Booking delivery slot from a different shop rejected (tenant isolation)
- `H2.10`: Day-of-week mismatch (slot for SUNDAY, date on SATURDAY) is rejected
- `H2.11`: Everyday slot accepts order on any day of the week
- `H2.12`: Owner reducing capacity below existing bookings is rejected with 400 Bad Request
- `H2.13`: Owner reducing capacity above existing bookings succeeds
- `H2.14`: Non-owner modifying delivery slot rejected with 403 Forbidden
- `H2.15`: Concurrent booking simulation: when 1 capacity remains, exactly 1 order succeeds and competitor receives `SLOT_FULL`

#### 5.3 Frontend Verification Summary
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors (clean build)
- `npm run build`: 31/31 routes compiled statically/dynamically without error

---

### 6. Security & Tenant Isolation Analysis

1. **Guest Media Upload Security:**
   - Public endpoint permits guest inquiries without account creation friction.
   - Arbitrary file execution is completely blocked via magic-byte inspection (not relying on `Content-Type` header or file extension).
   - Filenames are replaced with server-side UUIDs to thwart directory traversal attacks (`../../`).
   - Media root is isolated under `/uploads/custom-cake-references/`.

2. **Delivery Slot Tenant Isolation:**
   - Pessimistic query requires `s.id = :slotId AND s.shop.id = :shopId`. An attacker cannot supply a valid slot ID belonging to another bakery to lock or deplete their capacity.
   - Owner capacity modification queries verify owner tenancy via `ShopAccessValidator`.

3. **Concurrency & Deadlock Prevention:**
   - Slot locks are acquired briefly during the order placement transaction.
   - Count queries run against indexed `(delivery_slot_id, delivery_date)` fields, ensuring sub-millisecond execution times and avoiding row lock exhaustion.

---

### 7. Frontend Integration Review

| Component | Changes Made | Behavior Verified |
|:---|:---|:---|
| `frontend_v2/lib/api/media.ts` | Added `uploadGuestReferenceImage` | Sends `multipart/form-data` to public `/api/storefront/media/upload-reference` |
| `frontend_v2/types/deliverySlot.ts` | Extended interface | Added `bookedOrders`, `remainingCapacity`, `available` fields |
| `frontend_v2/lib/api/deliverySlots.ts` | Added `date` query parameter | Passes `?date=YYYY-MM-DD` to fetch real-time slot availability for specific delivery day |
| `frontend_v2/components/ui/Select.tsx` | Added `disabled?: boolean` on options | Renders greyed-out unclickable options with `(Full)` badges |
| `StorefrontCustomCakesTab.tsx` | Wired public upload | Shows real-time uploading spinner, preview thumbnail, and sends server URL in custom inquiry |
| `CustomCakeInquiryModal.tsx` | Wired public upload | Allows customer to attach reference image; validates 5MB limit on client before upload |
| `StorefrontCheckoutTab.tsx` | Real-time capacity display | Displays remaining capacity badges (`Only 2 slots left!`, `Fully Booked`), disables full slots, handles 409 `SLOT_FULL` gracefully |

---

### 8. Deferred Items Confirmation

As instructed:
- **Payments:** Razorpay webhook verification, payment gateway routing, and mock toggles remain untouched and deferred.
- **Notifications:** External SMS gateway dispatchers and WhatsApp business webhooks remain untouched and deferred.
- All tests mock or isolate notifications cleanly using safe exception isolation without failing orders or inquiries.

---

### 9. Files Created, Modified, or Touched

#### Backend Files Created:
1. `backend/src/main/java/com/cakeplatform/api/exception/DeliverySlotFullException.java`
2. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerMediaController.java`
3. `backend/src/test/java/com/cakeplatform/api/modules/media/GuestMediaUploadSecurityTest.java`
4. `backend/src/test/java/com/cakeplatform/api/modules/shop/DeliverySlotCapacityTest.java`

#### Backend Files Modified:
1. `backend/src/main/java/com/cakeplatform/api/exception/GlobalExceptionHandler.java` (Added `DeliverySlotFullException` handler)
2. `backend/src/main/java/com/cakeplatform/api/modules/shop/ShopDeliverySlotRepository.java` (Added `findByIdAndShopIdWithLock`)
3. `backend/src/main/java/com/cakeplatform/api/modules/order/OrderRepository.java` (Added `countActiveOrdersForSlotAndDate` and `findMaxActiveOrdersOnAnyUpcomingDate`)
4. `backend/src/main/java/com/cakeplatform/api/modules/storefront/dto/StorefrontDeliverySlotResponse.java` (Added capacity and availability fields)
5. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontController.java` (Added `date` parameter support)
6. `backend/src/main/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontService.java` (Added pessimistic capacity check and null-safe notification triggers)
7. `backend/src/main/java/com/cakeplatform/api/modules/shop/OwnerDeliverySlotController.java` (Added capacity reduction check)
8. `backend/src/main/java/com/cakeplatform/api/modules/interaction/service/InteractionService.java` (Made notification reference IDs null-safe)
9. `backend/src/test/java/com/cakeplatform/api/modules/storefront/CustomerStorefrontServiceTest.java` (Added `deliverySlotRepository` mock)

#### Frontend Files Modified:
1. `frontend_v2/lib/api/media.ts`
2. `frontend_v2/types/deliverySlot.ts`
3. `frontend_v2/lib/api/deliverySlots.ts`
4. `frontend_v2/components/ui/Select.tsx`
5. `frontend_v2/components/customer/storefront/tabs/StorefrontCustomCakesTab.tsx`
6. `frontend_v2/components/customer/storefront/CustomCakeInquiryModal.tsx`
7. `frontend_v2/components/customer/storefront/tabs/StorefrontCheckoutTab.tsx`

---

### 10. Final Verification Verdict

```
======================================================================
                 CAKESTORE PHASE H VERIFICATION MATRIX
======================================================================
Backend Unit & Integration Tests : 250 / 250 PASSED (0 Failures, 0 Errors)
H1 Security & Media Test Suite   : 15 / 15 PASSED
H2 Capacity & Concurrency Suite  : 15 / 15 PASSED
Next.js TypeScript Compiler      : 0 Errors (Clean)
Next.js Linter                   : 0 Errors (Clean)
Next.js Production Build         : 31 / 31 Routes Generated Successfully
Payment / Notification Boundary  : PRESERVED (Zero regressions)
======================================================================
OVERALL STATUS                   : PASS — LAUNCH HARDENING COMPLETE
======================================================================
```

---

### 11. Recommendations for Phase I (Next Steps)

With the core Storefront 2.0 and launch hardening items (H1 & H2) fully operational and verified:
1. **Phase I1 — Production Payment Gateway Integration:** Configure Razorpay webhook secrets and live keys for online payments with automatic fallback to COD.
2. **Phase I2 — Production Notification Dispatchers:** Connect WhatsApp Business Cloud API / Twilio SMS gateway for automated order receipts and status updates.
3. **Phase I3 — Final Production Smoke Test & Deployment:** Staging environment deployment, migration verification against live Postgres, and end-to-end smoke testing.
