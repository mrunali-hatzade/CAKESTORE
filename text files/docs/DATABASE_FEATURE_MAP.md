# CakeStore SaaS Platform — Database Feature Map & Gap Analysis

**Document Version:** 1.0 (Phase 1 Baseline)  
**Database:** PostgreSQL 18  
**Flyway Version:** V1 through V9  
**Total Active Tables:** 21

---

## 1. Table-to-Role Mapping & Operational State

| Table Name | Primary Role | Secondary Roles | Current Usage Status | Description & Feature Mapping |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `COMMON` | `CUSTOMER`, `OWNER`, `ADMIN` | **ACTIVE (In Use)** | Stores platform user accounts, encrypted password hashes, and assigned roles. |
| **`shops`** | `OWNER` | `CUSTOMER`, `ADMIN` | **ACTIVE (In Use)** | Core bakery tenant entity containing location coordinates, FSSAI accreditation, and status lifecycle. |
| **`products`** | `OWNER` | `CUSTOMER` | **ACTIVE (In Use)** | Bakery catalog items with price, description, photo URL, and active availability toggle. |
| **`product_variants`** | `OWNER` | `CUSTOMER` | **ACTIVE (In Use)** | Cake size and weight variations (e.g. 0.5 kg, 1 kg, 2 kg) with incremental pricing. |
| **`product_addons`** | `OWNER` | `CUSTOMER` | **ACTIVE (In Use)** | Optional celebration extras (e.g. Sparkle Candles, Photo Prints) with unit pricing. |
| **`shop_delivery_slots`**| `OWNER` | `CUSTOMER` | **ACTIVE (In Use)** | Weekly recurring delivery and pickup time windows with order capacity caps. |
| **`orders`** | `OWNER` | `CUSTOMER`, `ADMIN` | **ACTIVE (In Use)** | Order master record capturing order number, subtotal, delivery charge, total, payment method, and status. |
| **`order_items`** | `OWNER` | `CUSTOMER`, `ADMIN` | **ACTIVE (In Use)** | Order line items with snapshot of product name, unit price, variant, cake message, and addons summary. |
| **`order_status_history`**| `OWNER`| `ADMIN` | **API EXISTS / FE PENDING** | Historical audit trail of order status transitions (NEW $\rightarrow$ PREPARING $\rightarrow$ READY $\rightarrow$ COMPLETED). |
| **`coupons`** | `OWNER` | `CUSTOMER` | **API EXISTS / FE PENDING** | Promotional discount codes with flat or percentage value, min order requirement, and expiry date. |
| **`custom_cake_requests`**| `OWNER` | `CUSTOMER` | **ACTIVE (In Use)** | Custom celebration cake leads, budget quotes, servings, inspiration photos, and delivery preferences. |
| **`enquiries`** | `OWNER` | `CUSTOMER` | **API EXISTS / FE PENDING** | General bakery customer contact inquiries and owner replies. |
| **`feedback`** | `CUSTOMER` | `OWNER`, `ADMIN` | **API EXISTS / FE PENDING** | Customer star ratings (1-5), written reviews, and owner responses. |
| **`subscriptions`** | `OWNER` | `ADMIN` | **API EXISTS / FE PENDING** | Bakery SaaS subscription instances, start date, expiry date, auto-renew flag, and status. |
| **`subscription_plans`** | `ADMIN` | `OWNER` | **API EXISTS / FE PENDING** | Platform SaaS pricing tiers (e.g. ₹350/mo Starter, Annual Pro), prices, validity days, and features. |
| **`payments`** | `ADMIN` | `OWNER` | **API EXISTS / FE PENDING** | Payment transaction audit ledger with provider order ID, payment ID, status, and failure reason. |
| **`shop_payout_details`**| `OWNER` | `ADMIN` | **API EXISTS / FE PENDING** | Bakery settlement information including bank account number, IFSC code, and UPI ID. |
| **`business_documents`** | `OWNER` | `ADMIN` | **API EXISTS / FE PENDING** | Verification documents (FSSAI license, owner government ID) uploaded during onboarding. |
| **`notifications`** | `COMMON` | `OWNER`, `ADMIN` | **API EXISTS / FE PENDING** | In-app notification alerts with recipient ID, title, message, reference link, and read status. |
| **`activity_logs`** | `ADMIN` | None | **API EXISTS / FE PENDING** | System-wide administrative and security audit trail. |
| **`flyway_schema_history`**| `SYSTEM` | None | **SYSTEM ACTIVE** | Flyway migration tracker (Rank 1 through 9 applied). |

---

## 2. Table Classification Summary

- **Tables Currently In Active End-to-End Use (Frontend + Backend + DB):**
  - `users`, `shops`, `products`, `product_variants`, `product_addons`, `shop_delivery_slots`, `orders`, `order_items`, `custom_cake_requests`, `flyway_schema_history` (10 tables).
- **Tables With Full Backend APIs But Awaiting Frontend Screens:**
  - `coupons`, `enquiries`, `feedback`, `subscriptions`, `subscription_plans`, `payments`, `shop_payout_details`, `business_documents`, `notifications`, `activity_logs`, `order_status_history` (11 tables).
- **Tables Not Mapped to Any Feature:**
  - **Zero (0).** Every single table in the database is explicitly linked to a domain feature and backend service.

---

## 3. Database Schema Gaps & Future Migration Roadmap

| Potential Schema Modification | Affected Table | Business Requirement | Proposed Flyway Version | Recommended Action in Phase 1 |
| :--- | :--- | :--- | :--- | :--- |
| **Dietary Tag on Products** | `products` | Support direct eggless / pure-veg badges per cake item without relying on order customization. | `V10__add_product_dietary_flag.sql` | **Defer to Phase 2+ (Do not execute now per freeze rules).** |
| **Shop Operating Hours JSON** | `shops` | Store structured day-by-day open/close hours (e.g. Monday: 09:00 - 21:00). | `V11__add_shop_operating_hours.sql` | **Defer to Phase 5 (Shop Settings).** |
| **Customer Delivery Coordinates** | `orders` | Store GPS lat/lng for customer delivery address to calculate precise delivery radius. | `V12__add_order_delivery_coordinates.sql` | **Defer to Phase 11 (Customer Checkout).** |
