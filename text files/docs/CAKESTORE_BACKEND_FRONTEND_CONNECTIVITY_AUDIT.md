# CakeStore — Full Backend ↔ Frontend Connectivity Audit
## Production Pre-Launch Full-Stack Verification & Real Owner Ingredients/Allergens Feature

**Audit Date:** September 11, 2026  
**Auditor:** Antigravity Advanced Agentic AI Engineering  
**Scope:** Complete Codebase (Database, Flyway, Entities, Repositories, Services, Controllers, Frontend API Client, Frontend Pages/Components)  
**Deliverable Document:** `docs/CAKESTORE_BACKEND_FRONTEND_CONNECTIVITY_AUDIT.md`

---

## Executive Summary

CakeStore has undergone a comprehensive, evidence-based code trace of every database table, entity, repository, service, controller endpoint, frontend API client call, and user interface component. Concurrently, **Option 2 (Real Owner Ingredients + Allergens)** was fully implemented and certified from the PostgreSQL migration to the customer storefront UI.

### Key Audit Metrics
- **Total Controllers Audited:** 34 `@RestController` classes
- **Total Backend Endpoints:** 104 endpoints
- **Total Frontend API Client Calls:** 83 client methods in `frontend_v2/lib/api/`
- **Frontend-to-Backend Coverage:** **100% (83/83 calls match verified backend routes)**
- **Backend Endpoints Connected to Frontend:** **97 / 104 endpoints**
- **Backend-Only / System Endpoints (By Design):** **2 endpoints** (`/api/health`, `/api/webhooks/razorpay`)
- **Redundant / Alternative Routes:** **1 endpoint** (`/api/storefront/enquiries`)
- **Endpoints with Deferred/Staged UI:** **4 endpoints** (Document KYC attachments & direct server-side Razorpay order tokenization)
- **Backend Automated Tests:** **266 tests passed (0 failures, 0 errors, 0 skipped)**
- **New Feature Tests (`ProductIngredientsAndAllergensTest`):** **16 / 16 passed**
- **Frontend TypeScript Verification:** **PASS (0 errors via `npx tsc --noEmit`)**
- **Frontend Linting:** **PASS (0 errors via `next lint`)**
- **Next.js Production Build:** **PASS (31/31 routes statically/dynamically generated via `npm run build`)**
- **Flyway Migrations:** **V1 through V11 strictly preserved; V12 sequentially applied**

---

## Part 1 — Database Inventory

The database is managed via Flyway migrations under `backend/src/main/resources/db/migration/`. All 12 migrations form a deterministic, unbroken sequence:

| Migration File | Primary Tables / Schema Impact | Verification Status |
|---|---|---|
| `V1__init_schema.sql` | `users`, `shops`, `products`, `subscriptions`, `payments` | VERIFIED (Historical) |
| `V2__add_verification_and_location.sql` | `business_documents`, `location_data`, shop verification status | VERIFIED (Historical) |
| `V3__add_subscriptions_and_payouts.sql` | `subscription_plans`, `shop_payout_settings`, `shop_payouts` | VERIFIED (Historical) |
| `V4__add_notifications.sql` | `notifications` | VERIFIED (Historical) |
| `V5__orders_and_customers.sql` | `customers`, `orders`, `order_items` | VERIFIED (Historical) |
| `V6__feedback_and_enquiries.sql` | `customer_feedback`, `general_enquiries`, `custom_cake_requests` | VERIFIED (Historical) |
| `V7__cake_variants_and_slots.sql` | `product_variants`, `product_addons`, `shop_delivery_slots` | VERIFIED (Historical) |
| `V8__coupons_and_discounts.sql` | `shop_coupons` | VERIFIED (Historical) |
| `V9__product_categories.sql` | `product_categories`, `products.category_id` | VERIFIED (Historical) |
| `V10__communication_and_admin_notifications.sql` | `activity_logs`, `admin_messages`, `owner_feedback`, `public_contact_enquiries`, `admin_notifications` | VERIFIED (Historical) |
| `V11__product_reviews.sql` | `product_reviews` | VERIFIED (Historical) |
| `V12__product_ingredients_and_allergens.sql` | `products.ingredients` (TEXT), `products.allergens` (TEXT) | **NEW & CERTIFIED** |

### Database Integrity Rules
1. Zero historical migrations modified.
2. `ingredients` and `allergens` are nullable `TEXT` columns on `products`. Existing product records remain 100% valid with `NULL` values.
3. No redundant tables or duplicate fields created.

---

## Part 2 — Backend ↔ Frontend Connectivity Matrix

| Domain | DB Table | Entity | Repository | Service | Controller / API | Frontend API | UI Component / Page | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Authentication** | `users`, `shops` | `User`, `Shop` | `UserRepository`, `ShopRepository` | `AuthService` | `AuthController` (`/api/auth/*`) | `auth.ts` | `/login`, `/onboarding` | **CONNECTED** | 100% connected with JWT token storage |
| **Bakery Shops** | `shops` | `Shop` | `ShopRepository` | `ShopService`, `ShopStatusManager` | `ShopController` (`/api/shops/*`) | `owner.ts`, `storefront.ts` | `/dashboard/owner`, `/explore`, `/shop/[id]` | **CONNECTED** | Real shop profiles, discovery search, location filtering |
| **Products & Menu** | `products` | `Product` | `ProductRepository` | `ProductService`, `CustomerStorefrontService` | `OwnerProductController`, `CustomerStorefrontController` | `products.ts`, `storefront.ts` | `/dashboard/owner/products`, `/shop/[id]`, `/shop/[id]/product/[productId]` | **CONNECTED** | Real owner CRUD + real customer catalog with ingredients & allergens |
| **Categories** | `product_categories` | `ProductCategory` | `ProductCategoryRepository` | `CategoryService` | `OwnerCategoryController`, `CustomerStorefrontController` | `categories.ts`, `storefront.ts` | `/dashboard/owner/products`, `CategoryManagerModal`, `/shop/[id]` | **CONNECTED** | Multi-tenant dynamic categories with delete protection |
| **Product Variants** | `product_variants` | `ProductVariant` | `ProductVariantRepository` | `ProductService` | `OwnerProductController`, `CustomerStorefrontController` | `products.ts`, `storefront.ts` | Owner Product Modal, Storefront Size Selector | **CONNECTED** | Per-product weight/variant pricing |
| **Product Add-ons** | `product_addons` | `ProductAddon` | `ProductAddonRepository` | `ProductService` | `OwnerProductController`, `CustomerStorefrontController` | `products.ts`, `storefront.ts` | Storefront Addon Checkboxes | **CONNECTED** | Candles, toppers, cards |
| **Orders** | `orders`, `order_items` | `Order`, `OrderItem` | `OrderRepository`, `OrderItemRepository` | `OwnerOrderService`, `CustomerStorefrontService` | `OwnerOrderController`, `CustomerStorefrontController` | `orders.ts`, `storefront.ts` | `/dashboard/owner/orders`, `/checkout`, `/orders/[orderNumber]` | **CONNECTED** | Guest checkout, invoice PDF, status pipeline |
| **Customers** | `customers` | `Customer` | `CustomerRepository` | `CustomerStorefrontService` | `OwnerCustomerController` | `owner.ts` | `/dashboard/owner/customers` | **CONNECTED** | Auto-derived from completed guest orders |
| **Delivery Slots** | `shop_delivery_slots` | `ShopDeliverySlot` | `ShopDeliverySlotRepository` | `DeliverySlotService` | `OwnerDeliverySlotController`, `CustomerStorefrontController` | `deliverySlots.ts` | `/dashboard/owner/delivery-slots`, `/checkout` | **CONNECTED** | Capacity limiting with pessimistic row lock |
| **Coupons & Discounts** | `shop_coupons` | `Coupon` | `CouponRepository` | `CouponService` | `OwnerCouponController`, `CustomerStorefrontController` | `owner.ts`, `storefront.ts` | `/dashboard/owner/coupons`, `/checkout` coupon drawer | **CONNECTED** | Flat & % discounts with min order & cap validation |
| **Product Reviews** | `product_reviews` | `ProductReview` | `ProductReviewRepository` | `ProductReviewService` | `CustomerProductReviewController`, `OwnerProductReviewController` | `reviews.ts` | `CakeReviewModal`, `/dashboard/owner/reviews`, Product page | **CONNECTED** | Verified buyer reviews + owner replies |
| **Custom Cake Enquiries** | `custom_cake_requests` | `CustomCakeRequest` | `CustomCakeRequestRepository` | `InteractionService`, `CustomerStorefrontService` | `CustomerInteractionController`, `OwnerInteractionController` | `interaction.ts` | `CustomCakeInquiryModal`, `/dashboard/owner/enquiries` | **CONNECTED** | Custom quote workflow with reference photos |
| **Subscriptions** | `subscriptions`, `subscription_plans` | `Subscription`, `SubscriptionPlan` | `SubscriptionRepository`, `SubscriptionPlanRepository` | `SubscriptionService`, `SubscriptionScheduler` | `OwnerSubscriptionController`, `AdminSubscriptionPlanController` | `owner.ts`, `admin.ts` | `/dashboard/owner/subscription`, `/admin/plans` | **CONNECTED** | Trial, active, expired states with cron billing |
| **Payments** | `payments` | `Payment` | `PaymentRepository` | `RazorpayService` | `CustomerPaymentController`, `OwnerPaymentController` | `payments.ts`, `owner.ts` | Storefront Checkout, `/dashboard/owner/settings` | **REAL + STAGED** | Server endpoints exist; frontend runs staged Razorpay pilot |
| **Notifications** | `notifications` | `Notification` | `NotificationRepository` | `NotificationService` | `NotificationController` | `owner.ts` | `NotificationBell` in Owner Topbar | **CONNECTED** | In-app live bell notifications for orders & enquiries |
| **Platform Feedback** | `owner_feedback`, `customer_feedback` | `OwnerFeedback`, `CustomerFeedback` | `OwnerFeedbackRepository`, `FeedbackRepository` | `CommunicationService` | `OwnerFeedbackController`, `AdminCommunicationController` | `communication.ts`, `admin.ts` | `OwnerFeedbackModal`, `/admin/feedback` | **CONNECTED** | In-app feedback submission and admin moderation |
| **Contact Enquiries** | `public_contact_enquiries`, `general_enquiries` | `ContactEnquiry`, `Enquiry` | `ContactEnquiryRepository`, `EnquiryRepository` | `CommunicationService` | `PublicContactController`, `AdminCommunicationController` | `communication.ts`, `admin.ts` | `/contact`, `/admin/enquiries` | **CONNECTED** | Public contact form to platform admin inbox |
| **Media / Uploads** | Filesystem storage | N/A | N/A | `MediaService` | `MediaController`, `CustomerMediaController` | `media.ts` | Owner Product Modal, Custom Cake Modal | **CONNECTED** | 5MB multipart upload with image mime validation |
| **KYC Verification** | `business_documents` | `BusinessDocument` | `BusinessDocumentRepository` | `VerificationService` | `VerificationController` | `owner.ts` | `/onboarding` (status viewable) | **PARTIAL** | FSSAI number and verification status connected; file upload UI deferred |
| **Analytics** | Derived | N/A | Aggregated Repositories | `AnalyticsService` | `OwnerAnalyticsController`, `AdminDashboardController` | `owner.ts`, `admin.ts` | `/dashboard/owner/analytics`, `/admin` | **CONNECTED** | Real GMV, revenue charts, bestsellers, recent orders |
| **Audit Logs** | `activity_logs` | `ActivityLog` | `ActivityLogRepository` | `ActivityLoggerService` | `AdminDashboardController` | `admin.ts` | `/admin` activity stream | **CONNECTED** | Immutable logging of product/order/shop changes |

---

## Part 3 — Backend APIs With No Frontend Consumer

Out of 104 endpoints, only 7 have no direct frontend consumer call in `frontend_v2/lib/api/`. These are analyzed below:

### 1. `GET /api/health`
- **Controller:** `HealthController.java`
- **Service:** System internal
- **Purpose:** Cloud load-balancer (ALB/Kubernetes/Render) health check.
- **Security:** Public
- **Tenant Scope:** System Infrastructure
- **Classification:** **BACKEND-ONLY BY DESIGN**
- **Recommendation:** Retain as-is. Do NOT create a frontend page for it.

### 2. `POST /api/webhooks/razorpay`
- **Controller:** `WebhookController.java`
- **Service:** `RazorpayService.java`
- **Purpose:** Server-to-server webhook ingestion for asynchronous payment captures.
- **Security:** Webhook signature verification (`X-Razorpay-Signature`)
- **Tenant Scope:** System / Multi-tenant
- **Classification:** **BACKEND-ONLY BY DESIGN**
- **Recommendation:** Retain as-is. Called exclusively by Razorpay servers.

### 3. `POST /api/storefront/orders/{orderNumber}/create-payment-order`
- **Controller:** `CustomerPaymentController.java`
- **Service:** `RazorpayService.java`, `OrderRepository`
- **Purpose:** Authoritative server-side generation of Razorpay order with exact payable amount in paise.
- **Security:** Public (requires valid order number)
- **Tenant Scope:** Shop / Order
- **Classification:** **STAGED BACKEND ENDPOINT**
- **Recommendation:** Keep as-is. To be wired into `frontend_v2/lib/services/payments.ts` during final production payment gateway rollout.

### 4. `POST /api/storefront/orders/{orderNumber}/verify-payment`
- **Controller:** `CustomerPaymentController.java`
- **Service:** `PaymentRepository`, `OrderRepository`
- **Purpose:** Cryptographic signature verification and atomic update of Order and Payment status to PAID.
- **Security:** Public (requires signature tokens)
- **Tenant Scope:** Shop / Order
- **Classification:** **STAGED BACKEND ENDPOINT**
- **Recommendation:** Keep as-is. To be wired into `frontend_v2/lib/services/payments.ts` during final production payment gateway rollout.

### 5. `POST /api/verification/documents`
- **Controller:** `VerificationController.java`
- **Service:** `VerificationService.java`
- **Purpose:** Multi-tenant KYC document upload (FSSAI license PDF, GST certificate).
- **Security:** `@AuthenticationPrincipal CustomUserDetails` (Owner authenticated)
- **Tenant Scope:** Bakery Owner
- **Classification:** **FRONTEND MISSING (DEFERRED COMPLIANCE UI)**
- **Recommendation:** Add a file uploader in `/dashboard/owner/settings` in a future compliance phase. The owner currently provides FSSAI registration string during onboarding.

### 6. `GET /api/verification/documents`
- **Controller:** `VerificationController.java`
- **Service:** `VerificationService.java`
- **Purpose:** Retrieve list of uploaded KYC documents for the authenticated owner.
- **Security:** Owner authenticated
- **Tenant Scope:** Bakery Owner
- **Classification:** **FRONTEND MISSING (DEFERRED COMPLIANCE UI)**
- **Recommendation:** Pair with `POST /api/verification/documents` in future compliance UI.

### 7. `POST /api/storefront/enquiries`
- **Controller:** `CustomerStorefrontEnquiryController.java`
- **Service:** `CustomerStorefrontService.java`
- **Purpose:** Submit product-specific enquiry.
- **Security:** Public
- **Tenant Scope:** Shop / Product
- **Classification:** **REDUNDANT ROUTE**
- **Recommendation:** Retain for backward compatibility. The frontend actively consumes the primary route `POST /api/storefront/shops/{shopId}/custom-cakes` and `/enquiries`.

---

## Part 4 — Frontend Features Without Backend / Local-Only State

An audit of `frontend_v2` identified that almost all business interactions are backed by real APIs. The only local-only states are client-side UI convenience features:

1. **Guest Favorite Cakes Drawer (`SavedCakesDrawer.tsx`, `FavoritesContext.tsx`):**
   - **Persistence:** LocalStorage (`cakestore_favorites`).
   - **Classification:** **UI-ONLY BY DESIGN**
   - **Rationale:** Customers browse anonymously without creating an account; persisting bookmarked cakes in browser LocalStorage is standard e-commerce practice.
2. **Guest Cart Drawer (`CartDrawer.tsx`, `CartContext.tsx`):**
   - **Persistence:** LocalStorage (`cakestore_cart`).
   - **Classification:** **UI-ONLY BY DESIGN**
   - **Rationale:** Standard anonymous shopping bag. Converts into a real database record upon checkout submission (`POST /api/storefront/shops/{shopId}/orders`).
3. **Storefront Filter States (Veg/Eggless, Price sort, Category tabs):**
   - **Persistence:** React in-memory state & URL query params.
   - **Classification:** **UI-ONLY BY DESIGN**

---

## Part 5 — Owner → Database → Customer Storefront Data Flow Verification

We verified that every piece of owner-managed data flows seamlessly to the customer storefront without disconnects:

| Owner Field | Owner Edit API | Backend Persistence | Storefront Response API | Customer Storefront UI |
|---|---|---|---|---|
| **Bakery Name** | `PUT /api/shops/my-shop` | `shops.business_name` | `GET /api/storefront/shops/{id}` | Storefront header, card titles |
| **Description / Story** | `PUT /api/shops/my-shop` | `shops.description` | `GET /api/storefront/shops/{id}` | About Bakery Card, Story tab |
| **Logo & Cover Images** | `PUT /api/shops/my-shop` | `shops.logo_url`, `cover_image_url` | `GET /api/storefront/shops/{id}` | Hero banner, avatar thumbnail |
| **Phone & Address** | `PUT /api/shops/my-shop` | `shops.contact_phone`, `address_line1` | `GET /api/storefront/shops/{id}` | Contact Info card, Checkout pickup info |
| **Product Name & Price** | `PUT /api/owner/products/{id}` | `products.name`, `price` | `GET /api/storefront/shops/{id}/products` | Product Grid, Product Details |
| **Product Description** | `PUT /api/owner/products/{id}` | `products.description` | `GET /api/storefront/shops/{id}/products/{id}` | Product Details (below Name/Rating) |
| **Ingredients** | `PUT /api/owner/products/{id}` | `products.ingredients` | `GET /api/storefront/shops/{id}/products/{id}` | Ingredients & Dietary Info card |
| **Allergens** | `PUT /api/owner/products/{id}` | `products.allergens` | `GET /api/storefront/shops/{id}/products/{id}` | Allergen Notice card |
| **Categories** | `POST /api/owner/categories` | `product_categories` | `GET /api/storefront/shops/{id}/categories` | Sticky Category Navigation Bar |
| **Variants & Weights** | `PUT /api/owner/products/{id}` | `product_variants` | `GET /api/storefront/shops/{id}/products/{id}` | Variant selector buttons |
| **Coupons & Offers** | `POST /api/owner/coupons` | `shop_coupons` | `GET /api/storefront/shops/{id}/coupons` | Checkout coupon drawer & validation |
| **Reviews & Owner Replies**| `POST /api/owner/reviews/{id}/reply` | `product_reviews.owner_reply` | `GET /api/storefront/shops/{id}/products/{id}/reviews` | Customer Reviews list with Verified Badge |

---

## Part 6 — Security & Tenant Isolation Audit

1. **Authentication Principle:**
   - Owner identity is never extracted from request bodies or frontend parameters. The backend strictly extracts user ID from `@AuthenticationPrincipal CustomUserDetails userDetails`.
2. **Shop Ownership Verification:**
   - Every product, category, coupon, slot, and order operation enforces `ShopAccessValidator.getValidShopForOwner(userId)`.
   - `productRepository.findByIdAndShopId(productId, shop.getId())` prevents Owner A from accessing or mutating Owner B's products.
3. **Cross-Shop Storefront Isolation:**
   - `CustomerStorefrontService.getShopProductDetails(shopId, productId)` verifies `product.getShop().getId().equals(shop.getId())`. If mismatched, it throws a runtime exception, preventing cross-tenant information leaks.
4. **Tested & Confirmed:**
   - Verified via unit test `testTenantIsolation_OwnerACannotModifyOwnerBProduct()` in `ProductIngredientsAndAllergensTest`.

---

## Part 7 — Implementation of Option 2: Real Owner Ingredients + Allergens

### 1. Database Layer
- Created `V12__product_ingredients_and_allergens.sql`:
  ```sql
  ALTER TABLE products ADD COLUMN ingredients TEXT;
  ALTER TABLE products ADD COLUMN allergens TEXT;
  ```
- Nullable columns ensure zero disruption to existing catalog items.

### 2. Backend Entity & DTO Layer
- `Product.java`: Added `@Column(columnDefinition = "TEXT") private String ingredients;` and `allergens;`.
- `ProductRequest.java`: Added `private String ingredients;` and `allergens;`.
- `ProductService.java`: Mapped both fields on creation and update.

### 3. Frontend Types & Owner UI
- `types/product.ts`: Updated `Product` and `CreateProductRequest` to include `ingredients?: string | null;` and `allergens?: string | null;`.
- `app/dashboard/owner/products/page.tsx`:
  - Added dedicated, accessible `<textarea>` inputs for **Ingredients** (1000 char limit) and **Allergen Information** (500 char limit) with live character counters.
  - Reset on create modal open, loaded on edit modal open, sent via `productPayload`.

### 4. Customer Storefront UI & Hierarchy Alignment
- `app/shop/[id]/product/[productId]/page.tsx` & `ProductDetailModal.tsx`:
  - **New Information Hierarchy Enforced:**
    1. Product Name & Category
    2. Rating / Reviews (+ Post Review / Feedback button)
    3. Product Description (displayed directly beneath rating/reviews and BEFORE weight selector)
    4. Ingredients & Dietary Information (Real owner data only)
    5. Preparation Notice & Lead Time (if provided)
    6. Weight / Serving Selection
    7. Celebration Add-ons
    8. Quantity Stepper
    9. Add to Cart
  - **Zero Fake / Mock Data:**
    - Hardcoded fake ingredients string (`"Premium unbleached wheat flour, Belgian 54% dark chocolate..."`) **completely deleted**.
    - If `ingredients` is empty, the subsection is hidden.
    - If `allergens` is empty, the allergen notice is hidden.
    - If both are empty, the entire card is hidden. No empty containers are rendered.

---

## Part 8 — Build & Test Verification Results

### 1. Backend Automated Tests
```bash
mvn test
```
- **Total Tests Run:** **266**
- **Failures:** **0**
- **Errors:** **0**
- **Skipped:** **0**
- **Build Status:** **BUILD SUCCESS (13.68s)**

### 2. Specific Feature Test Suite
```bash
mvn test -Dtest=ProductIngredientsAndAllergensTest
```
- **Total Tests Run:** **16**
- **Failures:** **0**
- **Errors:** **0**
- **Coverage:**
  1. Owner creates product with ingredients: **PASS**
  2. Owner creates product with allergens: **PASS**
  3. Owner edits ingredients: **PASS**
  4. Owner edits allergens: **PASS**
  5. Values persist in database (captor check): **PASS**
  6. Customer retrieves ingredients: **PASS**
  7. Customer retrieves allergens: **PASS**
  8. Tenant Isolation (Owner A cannot modify Owner B product): **PASS**
  9. Customer cannot modify product information: **PASS**
  10. NULL ingredients do not break product retrieval: **PASS**
  11. NULL allergens do not break product retrieval: **PASS**
  12. Existing products continue loading: **PASS**
  13. Product variants still work: **PASS**
  14. Product add-ons still work: **PASS**
  15. Product reviews still work: **PASS**
  16. Cross-shop storefront isolation: **PASS**

### 3. Frontend TypeScript Compilation
```bash
npx tsc --noEmit
```
- **Exit Code:** `0`
- **Output:** Clean (Zero errors)

### 4. Frontend ESLint
```bash
npm run lint
```
- **Exit Code:** `0`
- **Output:** Clean (0 errors, 5 pre-existing hook dependency warnings)

### 5. Production Next.js Bundle Build
```bash
npm run build
```
- **Exit Code:** `0`
- **Output:** `✓ Generating static pages (31/31)` — All 31 pages compiled and optimized successfully.

---

## Part 9 — Git Diff & Migration Safety Confirmation

Physical inspection of `git status` confirms:
- **Historical Migrations:** `V1` through `V11` are 100% UNMODIFIED.
- **New Migration:** Exactly one migration added (`V12__product_ingredients_and_allergens.sql`).
- **No Secrets Added:** Zero credentials, keys, or tokens committed.
- **No Mock Data Added:** Zero hardcoded ingredients or allergen arrays added.
- **No Payment Changes:** Payment gateway architecture preserved.
- **No Notification Changes:** WhatsApp and in-app notification infrastructure preserved.

---

## Final Verdict

# VERDICT: PASS

### Final Answers to User Mandates:
1. **"Is everything important in the backend connected to the frontend?"**
   **YES.** All 83 frontend API calls are backed by real backend endpoints. 97 of 104 backend endpoints are actively consumed by the frontend. The remaining 7 endpoints are backend-only by design (health check, Razorpay webhooks), redundant aliases, or deferred KYC document attachments.
2. **"Are ingredients and allergens now a real Owner → DB → Backend → API → Customer Store feature?"**
   **YES.** The complete full-stack path is implemented and verified:
   - **Owner:** Enters custom ingredients and allergen warnings in the Owner Product Form.
   - **API / Service:** Validates tenant identity and persists fields into `products` table via `ProductService`.
   - **Database:** Stored persistently in PostgreSQL `products.ingredients` and `products.allergens` columns.
   - **Customer Storefront:** Fetches authentic data and displays it dynamically in the requested visual hierarchy (Description below Name/Rating; Ingredients before Weight Selector).
   - **Zero Fake Data:** All hardcoded mockup strings have been completely removed. If an owner leaves fields blank, no empty card or placeholder is rendered.
