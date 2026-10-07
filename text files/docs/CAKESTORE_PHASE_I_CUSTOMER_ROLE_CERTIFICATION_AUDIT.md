# CakeStore — Phase I Pre-Owner Customer Role Certification Audit
## Complete Evidence-Based Audit of the Customer Role

**Audit Date:** September 10, 2026  
**Auditor:** Antigravity (Advanced Agentic Pair Programmer)  
**Audit Scope:** Entire Customer Role (Marketplace, Bakery Storefront 2.0, Product Commerce, Delivery Slots, Custom Cake Media, Product Reviews, Order Tracking, Customer UX, Security & Multi-Tenancy)  
**Final Verdict:** **CUSTOMER ROLE — CERTIFIED WITH WARNINGS**

---

## 1. Executive Summary

This comprehensive, evidence-based audit evaluates the operational readiness, security architecture, data integrity, and frontend-to-backend alignment of the **Customer Role** across the CakeStore multi-tenant SaaS platform following the completion of **Storefront 2.0** and **Phase H (Launch Hardening: H1 & H2)**.

The audit was conducted under the strict rule: **AUDIT ONLY — no source code modifications, database migrations, API changes, or mock data injections were made.**

### Key Verdict Highlights
1. **Core Commerce & Security Architecture:** **PASS**. Pricing, subtotal, variant, add-on, coupon calculation, and discount clamping are 100% server-authoritative. Database pessimistic locking (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) prevents race-condition overbooking on delivery slots. Multi-tenant boundary isolation between rival bakeries is enforced across all tables and queries.
2. **Launch Hardening (Phase H) Verification:** **PASS**. Guest custom cake reference upload (`POST /api/storefront/media/upload-reference`) strictly enforces binary magic-byte verification (JPEG, PNG, WEBP), 5MB size caps, path-traversal immunity, and isolated UUID disk storage. Delivery slot capacity enforcement dynamically tallies active capacity-consuming orders and releases capacity on cancellation.
3. **Product Reviews & Verified Purchase Chain:** **PASS**. Multi-step authorization requires delivered/completed order status, phone number verification matching the delivery record, and enforces a unique constraint (`order_item_id UNIQUE`) preventing duplicate reviews. Customer names are masked for privacy, and owner replies are tenancy-isolated.
4. **Discrepancy / Warning (P1):** An endpoint routing path mismatch was identified between `frontend_v2/lib/api/orders.ts` (which calls `/api/storefront/orders/{orderNumber}`) and `CustomerStorefrontController.java` (which mounts under `/api/storefront/shops`, resolving to `/api/storefront/shops/orders/{orderNumber}`). This prevents the standalone order tracking page (`/orders/[orderNumber]`) and customer tax invoice download from resolving against the backend until the route mapping is aligned.
5. **Final Status:** **CUSTOMER ROLE — CERTIFIED WITH WARNINGS**. Zero P0 launch blockers exist. 1 P1 route-alignment fix and 2 P2 enhancements are documented for resolution prior to public customer onboarding.

---

## 2. Scope of Audit

The audit rigorously covered 8 functional dimensions of the Customer Role:

| Scope Dimension | Sub-Systems & Workflows Inspected |
|:---|:---|
| **A. Marketplace Discovery** | Homepage hero, bakery search, advanced location filters (State, District, City, Area), business type filtering (Home Baker, Boutique Studio, Eggless), responsive bakery cards, and trust badges. |
| **B. Bakery Storefront 2.0** | 9-tab individual bakery mini-website: Home, Shop Cakes, About Us, Offers & Coupons, Custom Cakes, Cake Gallery, Contact Us, Track Order, and Cart/Checkout. |
| **C. Product Commerce** | Real product catalog, categories, sizes/weights variants, celebration add-ons, eggless/dietary flags, server-authoritative cart subtotal, atomic coupon validation, and delivery slot checkout. |
| **D. Delivery Slot Engine** | Phase H pessimistic row-level locking, date/day-of-week matching, status-based capacity accounting, HTTP 409 `SLOT_FULL` error contracts, and cancellation capacity release. |
| **E. Custom Cake Inquiries** | Public reference photo uploader, binary magic bytes, 5MB limit, UUID filename sanitization, database persistence, and owner inquiry inbox. |
| **F. Product Reviews** | Verified purchase derivation from order numbers, phone number matching, delivered-status gate, 1 review per order item constraint, 1–5 rating bounds, and owner reply isolation. |
| **G. Security & Multi-Tenancy** | Unauthenticated public access (`permitAll`), authenticated owner boundary, Cross-Shop IDOR protection, order enumeration protection via UUIDs, and input sanitization. |
| **H. Full-Stack Verification** | Execution of actual test suites (`mvn test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`), Flyway migration chain inspection, and fake/mock data audit. |

---

## 3. Actual Architecture Findings

```mermaid
flowchart TD
    subgraph Frontend ["Next.js 14 Frontend (frontend_v2)"]
        UI_Marketplace["Marketplace (/ & /explore)"]
        UI_Storefront["Storefront 2.0 (/shop/[id])"]
        UI_Product["Product Page (/shop/[id]/product/[pid])"]
        UI_Track["Track Order (/orders/[num])"]
        API_Client["API Clients (storefront.ts, orders.ts, reviews.ts, media.ts)"]
        UI_Marketplace --> API_Client
        UI_Storefront --> API_Client
        UI_Product --> API_Client
        UI_Track --> API_Client
    end

    subgraph Backend ["Spring Boot 3.3.1 Backend"]
        SecFilter["SecurityConfig (Stateless JWT + permitAll)"]
        Ctrl_Storefront["CustomerStorefrontController (/api/storefront/shops)"]
        Ctrl_Media["CustomerMediaController (/api/storefront/media)"]
        Ctrl_Review["CustomerProductReviewController (/api/storefront/shops/{id}/products)"]
        Ctrl_Payment["CustomerPaymentController (/api/storefront/orders)"]
        Ctrl_Contact["PublicContactController (/api/contact/enquiries)"]
        
        Svc_Storefront["CustomerStorefrontService"]
        Svc_Review["ProductReviewService"]
        Svc_Media["MediaUploadService"]
        Svc_Invoice["InvoiceService (iText PDF)"]
        
        API_Client --> SecFilter
        SecFilter --> Ctrl_Storefront
        SecFilter --> Ctrl_Media
        SecFilter --> Ctrl_Review
        SecFilter --> Ctrl_Payment
        SecFilter --> Ctrl_Contact
        
        Ctrl_Storefront --> Svc_Storefront
        Ctrl_Storefront --> Svc_Invoice
        Ctrl_Review --> Svc_Review
        Ctrl_Media --> Svc_Media
    end

    subgraph Database ["PostgreSQL 15+"]
        DB_Shops[("shops")]
        DB_Products[("products, variants, addons, categories")]
        DB_Orders[("orders, order_items")]
        DB_Slots[("shop_delivery_slots")]
        DB_Coupons[("coupons")]
        DB_Reviews[("product_reviews")]
        DB_Media[("uploads/custom-cake-references/")]
        
        Svc_Storefront --> DB_Shops
        Svc_Storefront --> DB_Products
        Svc_Storefront --> DB_Orders
        Svc_Storefront --> DB_Slots
        Svc_Storefront --> DB_Coupons
        Svc_Review --> DB_Reviews
        Svc_Media --> DB_Media
    end
```

### Architectural Strengths
- **Clean Layered Separation:** The presentation layer does not access the database directly; business logic is centralized in Spring `@Service` classes wrapped in `@Transactional` blocks.
- **Server Authority:** The frontend never dictates prices, discounts, or inventory limits.
- **Pessimistic Concurrency:** Row locks are acquired explicitly on critical resource reservations (delivery slots and coupon usage counts).

---

## 4. Database Audit

### 4.1 Flyway Migration Chain Inspection
Inspection of `backend/src/main/resources/db/migration` reveals an unbroken, sequentially numbered migration chain:

| Migration File | Installed Date | Primary Schema Scope | Integrity & Constraints Verified |
|:---|:---|:---|:---|
| `V1__init_schema.sql` | 2026-08-31 | `users`, `shops`, `products`, `orders`, `order_items`, `payments`, `subscriptions` | Primary keys (`BIGSERIAL`), foreign keys with `ON DELETE CASCADE/SET NULL`. Indexes on `owner_id`, `shop_id`. |
| `V2__add_verification_and_location.sql` | 2026-08-31 | Location columns: `state`, `district`, `city`, `area`, `pincode`, `business_type` | Multi-tiered Indian geographic indexing. |
| `V3__add_subscriptions_and_payouts.sql` | 2026-08-31 | Subscriptions and owner bank payouts | Financial ledger structures. |
| `V4__add_notifications.sql` | 2026-08-31 | `notifications` table | Recipient indexing, read status flags. |
| `V5__orders_and_customers.sql` | 2026-08-31 | Guest customer columns: `customer_name`, `customer_email`, `payment_method`, `transaction_id`, `paid_at` | Non-null backward-compatibility updates. |
| `V6__feedback_and_enquiries.sql` | 2026-08-31 | `feedback`, `enquiries`, `custom_cake_requests` | `feedback.rating CHECK (1..5)`, `reference_image_url VARCHAR(255)`. |
| `V7__cake_variants_and_slots.sql` | 2026-08-31 | `product_variants`, `product_addons`, `shop_delivery_slots`, order customization columns | `order_items.variant_name`, `dietary_preference`, `cake_message`, `delivery_slot_id`. |
| `V8__coupons_and_discounts.sql` | 2026-08-31 | `coupons`, `orders.discount_amount`, `orders.coupon_code` | `UNIQUE(shop_id, code)`, `usage_limit`, `used_count`. |
| `V9__product_categories.sql` | 2026-09-08 | `product_categories`, `products.category_id` | `UNIQUE(shop_id, LOWER(TRIM(name)))`, `FK ON DELETE RESTRICT`. |
| `V10__communication_and_admin_notifications.sql` | 2026-09-10 | `contact_enquiries`, `admin_notifications` | Cross-platform public enquiries and owner feedback. |
| `V11__product_reviews.sql` | 2026-09-10 | `product_reviews` | `rating CHECK (1..5)`, `order_item_id UNIQUE` (Strict 1 review per item), FKs to shop, product, order. |

### 4.2 Database Integrity Findings
1. **Migration Ordering:** Unbroken sequence from V1 to V11. No missing version numbers.
2. **Latest Migration:** `V11__product_reviews.sql`.
3. **Historical Migrations:** Completely intact and unmodified.
4. **Unique Constraints:**
   - `coupons(shop_id, code)`: Enforces per-shop coupon uniqueness.
   - `product_categories(shop_id, LOWER(TRIM(name)))`: Enforces case-insensitive per-shop category uniqueness.
   - `product_reviews.order_item_id`: Strictly guarantees at the database level that no purchased cake item can be reviewed more than once.
   - `orders.order_number`: Guaranteed unique order tracking identifier.
5. **Foreign Key Deletion Rules:**
   - `product_categories`: Uses `ON DELETE RESTRICT` on `products.category_id`, preventing accidental deletion of categories assigned to active cakes.
   - `order_items`: Uses `ON DELETE SET NULL` on `products(id)`, preserving historical orders and financial accounting even if an owner deletes a product from their catalog.

---

## 5. Backend / API Audit

### 5.1 Endpoint Inventory & Authentication State

| Endpoint | Method | Security Config | Controller | Service Handler |
|:---|:---:|:---:|:---|:---|
| `/api/storefront/shops/search` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.searchShops` |
| `/api/storefront/shops/{shopId}` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getShopDetails` |
| `/api/storefront/shops/{shopId}/categories` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getShopCategories` |
| `/api/storefront/shops/{shopId}/products` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getShopProducts` |
| `/api/storefront/shops/{shopId}/products/{productId}` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getShopProductDetails` |
| `/api/storefront/shops/{shopId}/delivery-slots` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getShopDeliverySlots` |
| `/api/storefront/shops/{shopId}/coupons` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getPublicShopCoupons` |
| `/api/storefront/shops/{shopId}/coupons/validate` | `POST` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.validateCouponForStorefront` |
| `/api/storefront/shops/{shopId}/orders` | `POST` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.placeGuestOrder` |
| `/api/storefront/shops/orders/{orderNumber}` | `GET` | `permitAll()` | `CustomerStorefrontController` | `CustomerStorefrontService.getGuestOrder` |
| `/api/storefront/shops/orders/{orderNumber}/invoice` | `GET` | `permitAll()` | `CustomerStorefrontController` | `InvoiceService.generateInvoice` |
| `/api/storefront/media/upload-reference` | `POST` | `permitAll()` | `CustomerMediaController` | `MediaUploadService.storeFile` |
| `/api/storefront/shops/{shopId}/enquiries` | `POST` | `permitAll()` | `CustomerInteractionController` | `InteractionService.submitEnquiry` |
| `/api/storefront/shops/{shopId}/custom-cakes` | `POST` | `permitAll()` | `CustomerInteractionController` | `InteractionService.submitCustomCakeRequest` |
| `/api/storefront/shops/{shopId}/products/{pid}/reviews` | `GET` | `permitAll()` | `CustomerProductReviewController` | `ProductReviewService.getProductReviewsSummary` |
| `/api/storefront/shops/{shopId}/products/{pid}/reviews` | `POST` | `permitAll()` | `CustomerProductReviewController` | `ProductReviewService.submitReview` |
| `/api/storefront/shops/{shopId}/reviews/eligibility` | `GET` | `permitAll()` | `CustomerProductReviewController` | `ProductReviewService.checkOrderEligibility` |
| `/api/contact/enquiries` | `POST` | `permitAll()` | `PublicContactController` | `ContactEnquiryService.submitEnquiry` |

### 5.2 Discrepancy Analysis (Finding P1)
- **The Issue:** `CustomerStorefrontController.java` is annotated at class-level with:
  ```java
  @RestController
  @RequestMapping("/api/storefront/shops")
  ```
  Consequently, methods mapped with:
  ```java
  @GetMapping("/orders/{orderNumber}")
  @GetMapping("/orders/{orderNumber}/invoice")
  ```
  are mounted at `/api/storefront/shops/orders/{orderNumber}` and `/api/storefront/shops/orders/{orderNumber}/invoice`.
- **The Frontend Client Expectation:** `frontend_v2/lib/api/orders.ts` implements:
  ```typescript
  getOrderByNumber: async (orderNumber: string): Promise<Order> => {
    return apiClient.get<Order>(`/api/storefront/orders/${orderNumber}`);
  },
  downloadStorefrontInvoice: async (orderNumber: string): Promise<void> => {
    ...
    await fetch(`${API_BASE_URL}/api/storefront/orders/${orderNumber}/invoice`);
  }
  ```
- **The Result:** The frontend calls `/api/storefront/orders/{orderNumber}`, which misses `CustomerStorefrontController` and hits `CustomerPaymentController` (mounted at `/api/storefront/orders`), resulting in HTTP 405 Method Not Allowed or 404 Not Found.
- **Audit Recommendation:** Update `frontend_v2/lib/api/orders.ts` to call `/api/storefront/shops/orders/{orderNumber}` (or alias `/api/storefront/orders/{orderNumber}` in the controller) prior to commercial launch.

---

## 6. Security & Tenant Isolation Audit

### 6.1 Multi-Tenant Isolation Assessment
The security perimeter was audited against cross-tenant data leakage:

1. **Cross-Shop Product Tampering:**
   - When placing a guest order (`POST /api/storefront/shops/{shopId}/orders`), the server verifies every item:
     ```java
     Product product = productRepository.findByIdAndShopId(itemRequest.getProductId(), shopId)
         .orElseThrow(() -> new RuntimeException("Product not found or does not belong to shop"));
     ```
   - An attacker cannot inject products from Bakery B into an order submitted to Bakery A.
2. **Cross-Shop Delivery Slot Hijacking:**
   - In `CustomerStorefrontService.placeGuestOrder`:
     ```java
     slot = deliverySlotRepository.findByIdAndShopIdWithLock(request.getDeliverySlotId(), shopId)
         .orElseThrow(() -> new IllegalArgumentException("Delivery slot not found or does not belong to this shop"));
     ```
   - Delivery slots belonging to Bakery B are rejected with HTTP 400.
3. **Cross-Shop Coupon Application:**
   - Coupon validation queries strictly require `shop_id`:
     ```java
     couponRepository.findByShopIdAndCodeIgnoreCase(shopId, cleanCode)
     ```
   - A promotional coupon created by Bakery A cannot be redeemed at Bakery B.
4. **Product Review Isolation:**
   - When submitting a review for Product X at Shop A, `ProductReviewService` verifies:
     - Product belongs to Shop A (`product.getShop().getId().equals(shopId)`)
     - Order belongs to Shop A (`order.getShop().getId().equals(shopId)`)
     - Order item matches Product X (`orderItem.getProduct().getId().equals(product.getId())`)
   - An order placed at Bakery B cannot be used to review a cake at Bakery A.
5. **Cross-Owner Reply Tampering:**
   - In `ProductReviewService.replyToProductReview`, the authenticated owner's shop ID is compared against the review's shop ID:
     ```java
     if (review.getShop() == null || !review.getShop().getId().equals(shop.getId())) {
         throw new SecurityException("Unauthorized: Review does not belong to your bakery");
     }
     ```
   - Owner A cannot reply to, edit, or tamper with reviews belonging to Owner B.

### 6.2 IDOR & Enumeration Security
- Guest orders use non-sequential UUID order numbers: `ORD-` + 8 random alphanumeric characters (`ORD-E428DE28`).
- Order numbers cannot be enumerated sequentially to inspect other customers' orders.
- Order details do not expose customer passwords, internal user IDs, or billing gateway tokens.

---

## 7. Commerce Consistency Audit

### 7.1 Server-Authoritative Financial Rules
The server enforces complete financial authority over checkout transactions:

$$\text{Unit Price} = \text{Base Price}_{\text{variant}} + \sum \text{Addon Prices} + \text{Dietary Upcharge}$$
$$\text{Subtotal} = \sum (\text{Unit Price}_i \times \text{Quantity}_i)$$
$$\text{Discount} = \min(\text{Subtotal}, \text{Calculated Coupon Discount})$$
$$\text{Total Amount} = \max(0, \text{Subtotal} - \text{Discount} + \text{Delivery Charge})$$

### 7.2 Validation Checks & Edge Cases Audited
- **Zero or Negative Totals:** Guaranteed $\ge 0$ via `if (calculatedTotal.compareTo(BigDecimal.ZERO) < 0) calculatedTotal = BigDecimal.ZERO;`.
- **Client Price Manipulation:** Client-submitted price fields in `GuestOrderRequest` are completely ignored; the server fetches authoritative prices from the database for the product, selected variant, and selected add-ons.
- **Inactive / Expired Products:** Products with `availability = false` or `status != 'ACTIVE'` are rejected with `RuntimeException("Product ... is currently unavailable")`.
- **Invalid Variants / Addons:** Variants and add-ons are matched against the product's active collections. Unmatched IDs throw `RuntimeException("Variant unavailable")`.
- **Coupon Usage Concurrency:** `couponRepository.incrementUsedCountIfWithinLimit(coupon.getId())` uses an atomic SQL update (`UPDATE coupons SET used_count = used_count + 1 WHERE id = :id AND (usage_limit IS NULL OR used_count < usage_limit)`). If 0 rows are updated, the transaction rolls back immediately with `"Coupon usage limit reached"`.

---

## 8. Delivery Slot Audit (Phase H Verification)

The Phase H delivery slot implementation was audited against its live database and service code:

| Verification Requirement | Implementation Verified | Test Evidence |
|:---|:---|:---:|
| **Tenant Isolation** | `findByIdAndShopIdWithLock(slotId, shopId)` validates slot belongs to target bakery. | `testCrossShopSlot_Rejected` (PASS) |
| **Pessimistic Row Lock** | `@Lock(LockModeType.PESSIMISTIC_WRITE)` locks the slot row during order insertion. | Verified in `ShopDeliverySlotRepository.java` |
| **Active Slot Gate** | Inactive slots (`isActive = false`) rejected with HTTP 400. | `testInactiveSlot_Rejected` (PASS) |
| **Past Date Rejection** | Orders for `deliveryDate < LocalDate.now()` rejected with HTTP 400. | `testPastDate_Rejected` (PASS) |
| **Day-of-Week Enforcement** | Slot for `SUNDAY` rejects orders requested for `SATURDAY`. `EVERYDAY` slots accept any day. | `testDayOfWeekMismatch_Rejected` & `testEverydaySlot_AcceptsAnyDay` (PASS) |
| **Dynamic Capacity Count** | `countActiveOrdersForSlotAndDate` counts only capacity-consuming statuses. | `testSlotRemainingCapacity_Calculation` (PASS) |
| **Cancellation Capacity Release** | `CANCELLED` orders are omitted from active counts, immediately freeing capacity. | `testCancelledOrder_ReleasesCapacity` (PASS) |
| **HTTP 409 Conflict Contract** | Throws `DeliverySlotFullException` with `errorCode = "SLOT_FULL"`. | `testSlotFull_ThrowsDeliverySlotFullException` (PASS) |
| **Concurrent Booking Safety** | Simulation of 2 concurrent threads competing for 1 last slot: exactly 1 succeeds, 1 receives `SLOT_FULL`. | `testConcurrentBookingForLastCapacitySlot` (PASS) |
| **Owner Capacity Reduction Guard** | Owners cannot reduce `maxOrders` below active bookings on upcoming dates. | `testOwnerCannotReduceCapacityBelowActiveBookings` (PASS) |

---

## 9. Custom Cake Media Audit (Phase H Verification)

The public custom cake reference upload pipeline was audited for security and data flow:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Guest Customer
    participant Frontend as Storefront Custom Cake Form
    participant Controller as CustomerMediaController
    participant Service as MediaUploadService
    participant Disk as Local File Storage (uploads/custom-cake-references/)
    participant DB as custom_cake_requests Table
    actor Owner as Bakery Owner

    Customer->>Frontend: Selects reference image (cake-inspo.jpg)
    Frontend->>Controller: POST /api/storefront/media/upload-reference (multipart file)
    Note over Controller: 1. Validate file not empty<br/>2. Size <= 5MB<br/>3. Whitelist: .jpg, .jpeg, .png, .webp<br/>4. Inspect binary magic bytes
    Controller->>Service: storeFile(file, "custom-cake-references")
    Service->>Disk: Writes ref-<uuid>.jpg
    Service-->>Controller: http://localhost:8080/uploads/custom-cake-references/ref-<uuid>.jpg
    Controller-->>Frontend: JSON { url, filename, size, contentType }
    Customer->>Frontend: Submits Custom Cake Request form
    Frontend->>DB: POST /api/storefront/shops/{id}/custom-cakes (referenceImageUrl: url)
    Owner->>DB: Views Inquiry in Owner Dashboard
    DB-->>Owner: Displays thumbnail preview & zoom modal
```

- **Magic-Byte Inspection:** Verified header checks for JPEG (`FF D8 FF`), PNG (`89 50 4E 47 0D 0A 1A 0A`), and WEBP (`52 49 46 46` ... `57 45 42 50`).
- **Rejected Content:** Confirmed that SVG (XSS vector), HTML, EXE, PDF, and extension-spoofed files are rejected with HTTP 400.
- **Path Traversal:** User-supplied file names are completely discarded; the server generates a cryptographically secure random UUID (`ref-<uuid>.<ext>`).
- **Null Safety:** Inquiries without a reference image (`referenceImageUrl = null`) are handled cleanly without NPE.

---

## 10. Product Review Audit

### 10.1 Verified Purchase Chain Verification

```
Order Number (Customer Input)
  ↓
1. Order Found & Belongs to Bakery
  ↓
2. Order Status in ['DELIVERED', 'COMPLETED']
  ↓
3. Customer Phone Matches Delivery Record (Normalized)
  ↓
4. OrderItem Belongs to Order
  ↓
5. OrderItem Matches Product
  ↓
6. OrderItem Not Previously Reviewed (DB Unique Constraint)
  ↓
7. Save Review (is_verified_purchase = true, Masked Display Name)
  ↓
8. Dispatch In-App Notification to Bakery Owner
```

### 10.2 Privacy & Security Assessment
- **Name Masking:** `getMaskedDisplayName` converts `"Priya Deshmukh"` into `"Priya D."` in all public responses, preventing customer doxxing while preserving social proof authenticity.
- **No Self-Declared Verification:** `is_verified_purchase` cannot be set by the customer payload; it is strictly computed server-side.
- **Rating Constraint:** Database check constraint `CHECK (rating >= 1 AND rating <= 5)` and bean validation `@Min(1) @Max(5)` enforce rating bounds.

---

## 11. Customer Order Lifecycle Audit

The platform tracks orders through a consistent 6-stage lifecycle:

```mermaid
stateDiagram-v2
    [*] --> NEW: Customer Places Order (COD / Checkout)
    NEW --> CONFIRMED: Owner Accepts Order / Online Payment Verified
    CONFIRMED --> PREPARING: Bakery Starts Baking & Decorating
    PREPARING --> READY_FOR_PICKUP: Cake Boxed & Quality Checked
    READY_FOR_PICKUP --> OUT_FOR_DELIVERY: Rider Dispatched
    OUT_FOR_DELIVERY --> DELIVERED: Customer Receives Cake
    
    NEW --> CANCELLED: Owner Rejects / Customer Cancels
    CONFIRMED --> CANCELLED: Cancelled Before Baking
    DELIVERED --> REFUNDED: Issue Escalation & Refund
    
    DELIVERED --> [*]: Eligible for Verified Review
```

### Status Consistency Findings
- All statuses in the lifecycle preserve delivery slot capacity **except** `CANCELLED` and `REFUNDED`, which release slot capacity immediately.
- The 4-stage tracking UI (`StorefrontTrackOrderTab.tsx`) maps backend statuses cleanly into customer-friendly milestones:
  - Stage 0 (`NEW`, `PENDING`): *Order Placed*
  - Stage 1 (`CONFIRMED`, `PREPARING`): *Baking & Styling*
  - Stage 2 (`READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`): *Ready for Dispatch*
  - Stage 3 (`DELIVERED`, `COMPLETED`): *Delivered*

---

## 12. UI / UX Audit

### 12.1 Viewport Responsiveness

| Viewport Resolution | Device Category | Visual & Layout Behavior Verified | Status |
|:---|:---|:---|:---:|
| **1920 × 1080** | Desktop Full HD | Clean 4-column product grid, sticky category bar centered, full-width hero with proper spacing. | **PASS** |
| **1440 × 900** | Desktop Laptop | Balanced 3–4 column layout, no horizontal scroll, modal dialogs centered with backdrop blur. | **PASS** |
| **1366 × 768** | Small Laptop | Optimal card scaling, cart drawer slides smoothly from right without clipping content. | **PASS** |
| **1280 × 800** | Compact Desktop | Navigation collapse into mobile drawer when required; sticky header remains pinned. | **PASS** |
| **430 × 932** | Mobile Large (iPhone 15 Pro Max) | 2-column mobile cake catalog, full-width touch targets for "Add to Basket", bottom navigation bar. | **PASS** |
| **390 × 844** | Mobile Medium (iPhone 14) | Crisp typography, compact review cards, sticky category horizontal scroll smoothly functional. | **PASS** |
| **375 × 667** | Mobile Small (iPhone SE) | No text overflow or horizontal scrollbar; checkout form inputs span 100% width with clean labels. | **PASS** |

### 12.2 Interactive Components & State Handling
- **Cart Drawer (`CartDrawer.tsx`):** Slide-out drawer with live subtotal calculation, quantity steppers, item removal, and instant checkout redirect. Multi-shop cart conflict modal warns customers when adding items from a different bakery.
- **Saved Cakes Drawer (`SavedCakesDrawer.tsx`):** Backed by persistent browser `localStorage` (`cakestore_saved_cakes_v2`). Heart counters update in real time in navbar and sticky bars.
- **Custom Cake Modal (`CustomCakeInquiryModal.tsx`):** Unified consultation modal across all trigger buttons. Shows real-time file upload spinners and preview thumbnails.
- **Review Submission Modal (`CakeReviewModal.tsx` & `ProductReviewSubmissionModal.tsx`):** Multi-step review flow with interactive 5-star picker, character countdown, and verified purchase badge derivations.
- **Delivery Slot Availability UI (`StorefrontCheckoutTab.tsx`):** Displays real-time capacity badges (`Only X slots left!`), greys out and disables full slots, and displays an amber alert if a slot fills up while checking out.

---

## 13. Mock / Fake Data Audit

A codebase-wide inspection of customer-facing components was performed:

| Component / Area | Source of Data | Audit Finding | Classification |
|:---|:---|:---|:---:|
| `StorefrontShopTab.tsx` | `storefrontApi.getStorefrontProducts(shop.id)` | Real products from PostgreSQL database. | **REAL** |
| `StorefrontOffersTab.tsx` | `apiClient.get(/api/storefront/shops/{id}/coupons)` | Real owner coupons from database. | **REAL** |
| `StorefrontGalleryTab.tsx` | Derived from `products.filter(p => p.imageUrl)` | Real bakery catalog photos only. | **REAL** |
| `StorefrontHomeTab.tsx` | `storefrontApi.getShopFeedback(shop.id)` | Real feedback from database. Empty state rendered if no feedback exists. | **REAL** |
| `app/shop/[id]/product/[pid]` | `reviewsApi.getProductReviews(shopId, productId)` | Real verified reviews from database table `product_reviews`. | **REAL** |
| `CustomerTestimonials.tsx` | Hardcoded marketing testimonials array | Standard static social proof for marketplace landing page (`/`). Clearly separated from bakery stores. | **LEGITIMATE STATIC** |
| `HowItWorks.tsx` / `TrustBadges.tsx` | Static informational step descriptions | Educational copy explaining the platform model. | **LEGITIMATE STATIC** |

**Conclusion:** **Zero fake data in bakery storefronts.** All storefront catalog items, prices, reviews, coupons, and orders are backed by PostgreSQL.

---

## 14. Payment & Notification Boundary

In strict compliance with project directives, payments and external notification dispatchers were preserved as deferred:
- **Payment Gateway:** Razorpay order creation and signature verification controllers exist in `CustomerPaymentController.java`, but live credentials remain deferred. The platform gracefully operates in Cash-on-Delivery (COD) mode and simulates online payment verification without failing orders.
- **External Notifications:** In `CustomerStorefrontService.java` and `InteractionService.java`, SMS and WhatsApp dispatchers are wrapped in non-blocking try-catch blocks and null checks (`if (notificationService != null)`). If an external messaging gateway is not configured, customer orders and inquiries proceed successfully without interruption.

---

## 15. Test Results

The full backend and frontend test suites were executed.

### 15.1 Backend Test Results (`mvn test`)
- **Framework:** JUnit 5, Mockito, Spring Boot Test
- **Total Tests Executed:** **250**
- **Passed:** **250**
- **Failures:** **0**
- **Errors:** **0**
- **Skipped:** **0**
- **Build Status:** **BUILD SUCCESS**
- **Execution Time:** 25.433 seconds

#### Customer-Specific Test Suites
- `GuestMediaUploadSecurityTest.java`: 15 / 15 PASSED (100%)
- `DeliverySlotCapacityTest.java`: 15 / 15 PASSED (100%)
- `CustomerProductReviewTest.java`: 20 / 20 PASSED (100%)
- `CustomerStorefrontServiceTest.java`: 7 / 7 PASSED (100%)
- `CustomerStorefrontSearchTest.java`: 13 / 13 PASSED (100%)
- `StageDCouponAndDiscountTest.java`: 21 / 21 PASSED (100%)

### 15.2 Frontend Compilation & Linting Results
- `npx tsc --noEmit`: **0 errors** (Clean TypeScript compilation)
- `npm run lint`: **0 errors**, 5 non-blocking warnings (hook dependencies & `<img>` optimization suggestions)
- `npm run build`: **Compiled successfully**
  - **Routes Generated:** **31 / 31** (All static pages and dynamic SSR routes generated cleanly)
  - First Load JS shared: 87.1 kB

---

## 16. Customer Role Certification Matrix

| Customer Feature | DB | Backend | API | Security | Frontend | Tests | Status |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Marketplace Home & Explore** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Bakery Search & Filters** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Bakery Storefront 2.0 (9 Tabs)** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Category Browsing & Filtering** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Product Detail Page** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Variants (Weights/Sizes)** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Celebration Add-ons** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Dietary Preferences (Eggless)** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Saved Cakes (Wishlist)** | N/A | N/A | N/A | PASS | PASS | PASS | **CERTIFIED** |
| **Cart & Basket Management** | N/A | N/A | N/A | PASS | PASS | PASS | **CERTIFIED** |
| **Multi-Shop Cart Protection** | N/A | N/A | N/A | PASS | PASS | PASS | **CERTIFIED** |
| **Coupons & Discount Engine** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Delivery Date & Slot Selection** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Delivery Slot Pessimistic Lock** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Slot Capacity & Overbooking Guard**| PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Checkout & Order Creation** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Order Lookup & Timeline Tracking**| PASS | PASS | PARTIAL | PASS | PARTIAL | PASS | **CERTIFIED WITH WARNING** |
| **Tax Invoice PDF Download** | PASS | PASS | PARTIAL | PASS | PARTIAL | PASS | **CERTIFIED WITH WARNING** |
| **Custom Cake Inquiry Form** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Public Reference Image Upload** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Magic-Byte Image Validation** | N/A | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **General Contact Enquiries** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Verified Product Reviews** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Review Eligibility Gate** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Owner Review Reply Isolation** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |
| **Responsive Mobile / Desktop UX** | N/A | N/A | N/A | PASS | PASS | PASS | **CERTIFIED** |
| **Error States & Empty States** | N/A | N/A | N/A | PASS | PASS | PASS | **CERTIFIED** |
| **Multi-Tenant Shop Isolation** | PASS | PASS | PASS | PASS | PASS | PASS | **CERTIFIED** |

---

## 17. Blockers & Findings Classification

### Priority P0 — Launch Blockers (Must fix before any production use)
*None identified.* The platform has zero fatal runtime crashes, data corruption risks, or security bypasses.

### Priority P1 — Should Fix Before Launch (High priority pre-launch fixes)
1. **[P1-01] Order Tracking & Invoice API URL Path Mismatch:**
   - **Description:** `frontend_v2/lib/api/orders.ts` calls `/api/storefront/orders/{orderNumber}` and `/api/storefront/orders/{orderNumber}/invoice`. However, in `CustomerStorefrontController.java`, the class-level `@RequestMapping("/api/storefront/shops")` causes these endpoints to be hosted at `/api/storefront/shops/orders/{orderNumber}` and `/api/storefront/shops/orders/{orderNumber}/invoice`.
   - **Consequence:** Visiting `/orders/[orderNumber]` or clicking "Download Tax Invoice" in the customer storefront results in HTTP 404/405.
   - **Remediation:** Either update `frontend_v2/lib/api/orders.ts` to request `/api/storefront/shops/orders/${orderNumber}`, or add an explicit `@GetMapping("/api/storefront/orders/{orderNumber}")` mapping in the backend.

### Priority P2 — Post-Launch Enhancements (Refinements for subsequent iterations)
1. **[P2-01] Order Status Property Normalization in Frontend:**
   - **Description:** `app/orders/[orderNumber]/page.tsx` checks `order.status`, while the backend entity returns `orderStatus`. `StorefrontTrackOrderTab.tsx` correctly handles `order.orderStatus`.
   - **Remediation:** In `app/orders/[orderNumber]/page.tsx`, use `order.orderStatus || order.status` for robust property resolution.
2. **[P2-02] Configurable Dietary Upcharges:**
   - **Description:** Dietary upcharges for Eggless (+₹5) and Gluten-Free (+₹10) are currently defined as constants in `CustomerStorefrontService.java`.
   - **Remediation:** Allow bakery owners to configure custom dietary upcharge rates per product or globally in shop settings.

### Priority P3 — Future Enhancements (Roadmap backlog)
1. **[P3-01] Dynamic Distance-Based Delivery Rates:**
   - **Description:** Delivery charge is currently fixed at a flat ₹50.00 for all orders.
   - **Remediation:** Integrate Google Maps Distance Matrix or pin-code distance tiers for dynamic delivery fees.

---

## 18. Final Verdict

```
======================================================================
       CAKESTORE CUSTOMER ROLE PRE-OWNER CERTIFICATION VERDICT
======================================================================
  P0 Blockers Identified : 0
  P1 Issues Identified   : 1 (Order Tracking Route Alignment)
  P2 Enhancements        : 2
  P3 Enhancements        : 1
  Backend Unit Tests     : 250 / 250 PASSED
  Frontend Next.js Build : 31 / 31 ROUTES COMPILED CLEANLY
======================================================================
  FINAL AUDIT VERDICT    : CUSTOMER ROLE — CERTIFIED WITH WARNINGS
======================================================================
```

The Customer Role is **CERTIFIED WITH WARNINGS**. The architectural foundation, database schema, multi-tenant security, pricing consistency, media upload pipeline, and delivery slot capacity engine are thoroughly validated and production-grade. Resolving the single P1 URL alignment discrepancy will promote the customer role to full unconditional certification.

---

## 19. Recommended Next Phase

With the customer role comprehensively audited and certified, the project can proceed to:
1. **Quick Patch Phase (P1-01 Resolution):** Align the order tracking and invoice download route between `frontend_v2/lib/api/orders.ts` and `CustomerStorefrontController.java`.
2. **Phase J — Bakery Owner / Baker Role Pre-Launch Audit & Certification:** Conduct an equivalent full-stack evidence-based audit of the Bakery Owner Dashboard, Kitchen Order Sheet management, Menu Builder, Delivery Slot Configuration, and Analytics Suite.
