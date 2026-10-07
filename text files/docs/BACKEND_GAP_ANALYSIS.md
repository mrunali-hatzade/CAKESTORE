# CakeStore SaaS Platform — Backend Gap Analysis

**Document Version:** 1.0 (Phase 1 Baseline)  
**Date:** September 2026  
**Audience:** Backend Engineers, System Architects  
**Rule:** NO backend modifications permitted during Phase 1. This document identifies frontend readiness against existing backend capabilities.

---

## 1. Screens That Can Be Built Immediately (Zero Backend Changes Required)

The following 12 major frontend screens can be built immediately because their corresponding Spring Boot REST controllers, domain services, JPA repositories, DTO validations, and database tables are **already 100% implemented, compiled, and unit-tested**:

| Screen / Feature | Route | Existing Backend Endpoint(s) | Controller | Ready Status |
| :--- | :--- | :--- | :--- | :--- |
| **Owner Enquiries & Custom Cakes** | `/dashboard/owner/enquiries` | `GET /api/owner/custom-cakes`<br>`POST /api/owner/custom-cakes/{id}/respond`<br>`GET /api/owner/enquiries`<br>`POST /api/owner/enquiries/{id}/reply` | `OwnerInteractionController` | **100% READY ✅** |
| **Owner Customer Directory (CRM)** | `/dashboard/owner/customers` | `GET /api/owner/customers`<br>`GET /api/owner/customers/{email}` | `OwnerCustomerController` | **100% READY ✅** |
| **Owner Coupons & Discounts** | `/dashboard/owner/coupons` | `GET /api/owner/coupons`<br>`POST /api/owner/coupons` | `OwnerCouponController` | **100% READY ✅** |
| **Owner Reviews & Feedback** | `/dashboard/owner/reviews` | `GET /api/owner/feedback`<br>`POST /api/owner/feedback/{id}/reply`<br>`DELETE /api/owner/feedback/{id}` | `OwnerInteractionController` | **100% READY ✅** |
| **Owner Analytics Dashboard** | `/dashboard/owner/analytics` | `GET /api/owner/analytics/dashboard` | `OwnerAnalyticsController` | **100% READY ✅** |
| **Owner Profile & Settings** | `/dashboard/owner/settings` | `GET /api/shops/my-shop`<br>`PUT /api/shops/my-shop`<br>`GET /api/shops/my-shop/payouts`<br>`POST /api/shops/my-shop/payouts` | `ShopController`, `ShopPayoutController` | **100% READY ✅** |
| **Owner Subscription Status** | `/dashboard/owner/subscription` | `GET /api/owner/subscriptions/current`<br>`POST /api/owner/payments/mock-checkout` | `OwnerSubscriptionController`, `OwnerPaymentController` | **100% READY ✅** |
| **Admin Overview Dashboard** | `/admin` | `GET /api/admin/dashboard/stats` | `AdminDashboardController` | **100% READY ✅** |
| **Admin Bakery Moderation** | `/admin/shops`, `/admin/shops/[id]` | `GET /api/admin/shops`<br>`GET /api/admin/shops/{shopId}`<br>`PATCH /api/admin/shops/{shopId}/status` | `AdminDashboardController` | **100% READY ✅** |
| **Admin SaaS Plans CRUD** | `/admin/plans` | `GET /api/admin/plans`<br>`POST /api/admin/plans`<br>`PUT /api/admin/plans/{id}`<br>`PATCH /api/admin/plans/{id}/status` | `AdminSubscriptionPlanController` | **100% READY ✅** |
| **Admin Broadcast Messaging** | `/admin/messages` | `POST /api/admin/messages` | `AdminMessageController` | **100% READY ✅** |
| **Customer Storefront Checkout** | `/checkout` | `GET /api/storefront/shops/{id}/delivery-slots`<br>`POST /api/storefront/shops/{id}/orders` | `CustomerStorefrontController` | **100% READY ✅** |

---

## 2. Screens Requiring Minor Backend Enhancements

| Screen / Feature | Route | Missing Element in Existing API | Recommended Backend Action |
| :--- | :--- | :--- | :--- |
| **Owner Overview Trends** | `/dashboard/owner` | `GET /api/shops/my-shop/stats` returns scalar counters (totalOrders, totalRevenue, activeProducts, pendingOrders). It does not return day-by-day array for weekly chart. | The frontend can currently consume the daily array from `GET /api/owner/analytics/dashboard` to populate the trend line chart. |
| **Customer Order Tracking** | `/orders/[orderNumber]` | Endpoint `GET /api/storefront/shops/orders/{orderNumber}/invoice` returns the PDF binary. | Add a lightweight JSON endpoint `GET /api/storefront/orders/{orderNumber}` returning order status (`PREPARING`, `READY`, `OUT_FOR_DELIVERY`), estimated delivery date, and items snapshot. |

---

## 3. Screens Requiring New APIs

| Screen / Feature | Route | Necessary New Endpoint | Reason |
| :--- | :--- | :--- | :--- |
| **Admin Users Management** | `/admin/users` | `GET /api/admin/users`<br>`PATCH /api/admin/users/{id}/status` | Currently `UserRepository` has methods, but a dedicated paginated REST controller is needed to view all customers and owners platform-wide. |
| **Admin Global Orders** | `/admin/orders` | `GET /api/admin/orders` | An admin-level endpoint aggregating orders across all bakeries is required for platform supervision. |
| **Admin Payments Ledger** | `/admin/payments` | `GET /api/admin/payments` | A paginated listing of all `payments` table rows is needed for financial auditing. |

---

## 4. Screens Requiring New Database Columns / Tables

| Feature | Proposed Database Change | Necessity Level | Implementation Window |
| :--- | :--- | :--- | :--- |
| **Product Dietary Filter** | Add `dietary_type VARCHAR(50)` to `products` table | Low (Nice-to-have). Currently dietary tags are captured on `order_items` and bakery level (`shops.business_category`). | Future Flyway Migration `V10` (Post Phase 2). |
| **Order Status Audit Entity** | Map JPA `@Entity` for existing `order_status_history` table | Low. The table already exists in PostgreSQL (created by V9). Mapping the entity in Java will enable typed auditing. | Future Backend Polish. |
