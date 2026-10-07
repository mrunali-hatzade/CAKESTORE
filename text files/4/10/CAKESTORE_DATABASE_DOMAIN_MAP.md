# CAKESTORE DATABASE DOMAIN MAP

## Migration History
*   **V1__init_schema.sql** - Core schema (`users`, `roles`)
*   **V2__add_verification_and_location.sql** - Identity and physical address models
*   **V3__add_subscriptions_and_payouts.sql** - Financial subscriptions mapping to shops
*   **V4__add_notifications.sql** - Activity logs and system notifications
*   **V5__orders_and_customers.sql** - `orders`, `order_items`, `customers`
*   **V6-13** - Reviews, enquiries, gallery, allergens, communications
*   **V14-34** - Storefront upgrades, spatial search, seed plans, webhooks
*   **V35-39** - Soft deletes (`is_deleted` on `users`, `shops`)

## Core Domain Relationships

### User & Identity
`users`
→ **PK:** `id`
→ **Important Columns:** `email`, `password_hash`, `role`, `status`, `is_deleted`
→ **Relationships:** `1:1` or `1:M` with `shops`

### Shops & Tenants
`shops`
→ **PK:** `id`
→ **FK:** `owner_id` -> `users(id)`
→ **Important Columns:** `name`, `status` (ACTIVE, SUSPENDED, DELETED), `inactive_reason`
→ **Relationships:** `1:M` with `products`, `orders`, `subscriptions`

### Products
`products`
→ **PK:** `id`
→ **FK:** `shop_id` -> `shops(id)`
→ **Relationships:** `1:M` with `cake_variants` (V7)

### Commerce
`orders`
→ **PK:** `id`
→ **FK:** `shop_id` -> `shops(id)`, `customer_id` -> `users(id)`
→ **Important Columns:** `total_amount`, `payment_status`, `order_status`

`order_items`
→ **PK:** `id`
→ **FK:** `order_id` -> `orders(id)`, `product_id` -> `products(id)`

### Subscriptions
`subscriptions`
→ **PK:** `id`
→ **FK:** `shop_id` -> `shops(id)`, `plan_id`
→ **Important Columns:** `status`, `expiry_date`

### Payments
`payments`
→ **PK:** `id`
→ **FK:** `order_id` / `subscription_id`
→ **Important Columns:** `razorpay_order_id`, `razorpay_payment_id`, `signature`, `status`

## Constraints & Soft Deletes
*   **Users:** V39 adds `is_deleted` BOOLEAN DEFAULT FALSE
*   **Shops:** V38 adds `is_deleted` BOOLEAN DEFAULT FALSE
*   **Unique Constraints:** `users.email`
*   **Enums:** `Role` (ADMIN, SHOP_OWNER, CUSTOMER), `Status` (ACTIVE, PENDING, SUSPENDED), `Order Status`, `Payment Status`.

*(This map will be expanded with exact Java entity mappings upon deeper code inspection).*
