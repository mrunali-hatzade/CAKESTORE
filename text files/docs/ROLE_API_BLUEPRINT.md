# CakeStore SaaS Platform — Role API Blueprint

**Document Version:** 1.0 (Phase 1 Baseline)  
**Date:** September 2026  
**Audience:** Frontend Engineers, Backend Engineers, API Integrators  
**Scope:** Complete cross-role mapping between UI screens, frontend services, REST endpoints, backend controllers/services, database tables, RBAC roles, and operational status.

---

## 1. Customer Role API Blueprint

| Screen / Feature | Frontend Route | Frontend API Service | Method | Backend Endpoint | Backend Controller | Backend Service | DB Entity / Table | Role | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Marketplace Home & Search** | `/` | `lib/api/storefront.ts` (`fetchShops`) | `GET` | `/api/storefront/shops/search` | `CustomerStorefrontController` | `CustomerStorefrontService` | `Shop` / `shops` | `PUBLIC` | **DONE ✅** |
| **Bakery Storefront Profile** | `/shop/[id]` | `lib/api/storefront.ts` (`fetchShopDetails`) | `GET` | `/api/storefront/shops/{shopId}` | `CustomerStorefrontController` | `CustomerStorefrontService` | `Shop` / `shops` | `PUBLIC` | **DONE ✅** |
| **Bakery Products Showcase** | `/shop/[id]` | `lib/api/storefront.ts` (`fetchShopProducts`) | `GET` | `/api/storefront/shops/{shopId}/products` | `CustomerStorefrontController` | `CustomerStorefrontService` | `Product` / `products` | `PUBLIC` | **DONE ✅** |
| **Product Detail View** | `/shop/[id]` (Modal) | `lib/api/storefront.ts` (`fetchProductDetails`) | `GET` | `/api/storefront/shops/{shopId}/products/{productId}` | `CustomerStorefrontController` | `CustomerStorefrontService` | `Product` / `products` | `PUBLIC` | **DONE ✅** |
| **Customer Cake Enquiry** | `/shop/[id]` (Modal) | `lib/api/storefront.ts` (`submitProductEnquiry`) | `POST` | `/api/storefront/enquiries` | `CustomerStorefrontEnquiryController` | `CustomerStorefrontService` | `CustomCakeRequest` / `custom_cake_requests` | `PUBLIC` | **DONE ✅** |
| **Storefront Custom Cake Form** | `/shop/[id]/custom-cake` | `lib/api/storefront.ts` | `POST` | `/api/storefront/shops/{shopId}/custom-cakes` | `CustomerInteractionController` | `InteractionService` | `CustomCakeRequest` / `custom_cake_requests` | `PUBLIC` | **BACKEND ONLY** |
| **General Bakery Enquiry** | `/shop/[id]/contact` | `lib/api/storefront.ts` | `POST` | `/api/storefront/shops/{shopId}/enquiries` | `CustomerInteractionController` | `InteractionService` | `Enquiry` / `enquiries` | `PUBLIC` | **BACKEND ONLY** |
| **Checkout Delivery Slots** | `/checkout` | `lib/api/storefront.ts` | `GET` | `/api/storefront/shops/{shopId}/delivery-slots` | `CustomerStorefrontController` | `CustomerStorefrontService` | `ShopDeliverySlot` / `shop_delivery_slots` | `PUBLIC` | **BACKEND ONLY** |
| **Guest Order Placement** | `/checkout` | `lib/api/storefront.ts` | `POST` | `/api/storefront/shops/{shopId}/orders` | `CustomerStorefrontController` | `CustomerStorefrontService` | `Order`, `OrderItem` / `orders`, `order_items` | `PUBLIC` | **BACKEND ONLY** |
| **Customer Order Tracking** | `/orders/[orderNumber]` | `lib/api/storefront.ts` | `GET` | `/api/storefront/shops/orders/{orderNumber}/invoice` | `CustomerStorefrontController` | `CustomerStorefrontService` | `Order` / `orders` | `PUBLIC` | **BACKEND ONLY** |
| **Storefront Reviews List** | `/shop/[id]#reviews` | `lib/api/storefront.ts` | `GET` | `/api/storefront/shops/{shopId}/feedback` | `CustomerInteractionController` | `InteractionService` | `Feedback` / `feedback` | `PUBLIC` | **BACKEND ONLY** |
| **Submit Customer Review** | `/shop/[id]#write-review` | `lib/api/storefront.ts` | `POST` | `/api/storefront/shops/{shopId}/feedback` | `CustomerInteractionController` | `InteractionService` | `Feedback` / `feedback` | `ROLE_CUSTOMER` | **BACKEND ONLY** |

---

## 2. Shop Owner Role API Blueprint

| Screen / Feature | Frontend Route | Frontend API Service | Method | Backend Endpoint | Backend Controller | Backend Service | DB Entity / Table | Role | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Owner Login** | `/(auth)/login` | `lib/api/auth.ts` (`loginOwner`) | `POST` | `/api/auth/login` | `AuthController` | `AuthService` | `User` / `users` | `PUBLIC` | **DONE ✅** |
| **Owner Onboarding** | `/onboarding/step-4` | `lib/api.ts` (`registerOwner`) | `POST` | `/api/auth/register` (mapped from `/api/auth`) | `AuthController` | `AuthService` | `User`, `Shop` / `users`, `shops` | `PUBLIC` | **DONE ✅** |
| **Dashboard Overview Stats** | `/dashboard/owner` | `lib/api/client.ts` | `GET` | `/api/shops/my-shop/stats` | `ShopController` | `OwnerDashboardService` | `Product`, `Order` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Owner Product List** | `/dashboard/owner/products` | `lib/api/products.ts` (`getOwnerProducts`) | `GET` | `/api/owner/products` | `OwnerProductController` | `ProductService` | `Product` / `products` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Create Product** | `/dashboard/owner/products` | `lib/api/products.ts` (`createOwnerProduct`) | `POST` | `/api/owner/products` | `OwnerProductController` | `ProductService` | `Product`, `ProductVariant`, `ProductAddon` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Update Product** | `/dashboard/owner/products` | `lib/api/products.ts` (`updateOwnerProduct`) | `PUT` | `/api/owner/products/{id}` | `OwnerProductController` | `ProductService` | `Product`, `ProductVariant`, `ProductAddon` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Delete Product** | `/dashboard/owner/products` | `lib/api/products.ts` (`deleteOwnerProduct`) | `DELETE` | `/api/owner/products/{id}` | `OwnerProductController` | `ProductService` | `Product` / `products` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Product Media Upload** | `/dashboard/owner/products` | `lib/api/products.ts` (`uploadProductImage`) | `POST` | `/api/owner/media/upload` | `MediaController` | `CloudinaryService` | Local / Cloudinary | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Owner Orders List** | `/dashboard/owner/orders` | `lib/api/orders.ts` (`getOwnerOrders`) | `GET` | `/api/owner/orders` | `OwnerOrderController` | `OrderService` | `Order` / `orders` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Order Details** | `/dashboard/owner/orders` | `lib/api/orders.ts` (`getOrderDetails`) | `GET` | `/api/owner/orders/{id}` | `OwnerOrderController` | `OrderService` | `Order`, `OrderItem` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Update Order Status** | `/dashboard/owner/orders` | `lib/api/orders.ts` (`updateOrderStatus`) | `PATCH` | `/api/owner/orders/{id}/status` | `OwnerOrderController` | `OrderService` | `Order` / `orders` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Download Invoice** | `/dashboard/owner/orders` | `lib/api/orders.ts` (`downloadInvoice`) | `GET` | `/api/owner/orders/{id}/invoice` | `OwnerOrderController` | `OrderService` | `Order` / `orders` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **List Delivery Slots** | `/dashboard/owner/delivery-slots` | `lib/api/deliverySlots.ts` (`getSlots`) | `GET` | `/api/owner/delivery-slots` | `OwnerDeliverySlotController` | `DeliverySlotService` | `ShopDeliverySlot` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Create Delivery Slot** | `/dashboard/owner/delivery-slots` | `lib/api/deliverySlots.ts` (`createSlot`) | `POST` | `/api/owner/delivery-slots` | `OwnerDeliverySlotController` | `DeliverySlotService` | `ShopDeliverySlot` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Update Delivery Slot** | `/dashboard/owner/delivery-slots` | `lib/api/deliverySlots.ts` (`updateSlot`) | `PUT` | `/api/owner/delivery-slots/{id}` | `OwnerDeliverySlotController` | `DeliverySlotService` | `ShopDeliverySlot` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Toggle Slot Status** | `/dashboard/owner/delivery-slots` | `lib/api/deliverySlots.ts` (`updateStatus`) | `PATCH` | `/api/owner/delivery-slots/{id}/status` | `OwnerDeliverySlotController` | `DeliverySlotService` | `ShopDeliverySlot` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Delete Delivery Slot** | `/dashboard/owner/delivery-slots` | `lib/api/deliverySlots.ts` (`deleteSlot`) | `DELETE` | `/api/owner/delivery-slots/{id}` | `OwnerDeliverySlotController` | `DeliverySlotService` | `ShopDeliverySlot` | `ROLE_SHOP_OWNER` | **DONE ✅** |
| **Custom Cake Requests** | `/dashboard/owner/enquiries` | `lib/api/enquiries.ts` (Planned) | `GET` | `/api/owner/custom-cakes` | `OwnerInteractionController` | `OwnerInteractionService` | `CustomCakeRequest` / `custom_cake_requests` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Respond to Custom Cake** | `/dashboard/owner/enquiries` | `lib/api/enquiries.ts` (Planned) | `POST` | `/api/owner/custom-cakes/{id}/respond` | `OwnerInteractionController` | `OwnerInteractionService` | `CustomCakeRequest` / `custom_cake_requests` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **General Enquiries List** | `/dashboard/owner/enquiries` | `lib/api/enquiries.ts` (Planned) | `GET` | `/api/owner/enquiries` | `OwnerInteractionController` | `OwnerInteractionService` | `Enquiry` / `enquiries` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Reply to General Enquiry** | `/dashboard/owner/enquiries` | `lib/api/enquiries.ts` (Planned) | `POST` | `/api/owner/enquiries/{id}/reply` | `OwnerInteractionController` | `OwnerInteractionService` | `Enquiry` / `enquiries` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Owner Customer List** | `/dashboard/owner/customers` | `lib/api/customers.ts` (Planned) | `GET` | `/api/owner/customers` | `OwnerCustomerController` | `ShopService` | `User`, `Order` / `users`, `orders` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Customer Detail Profile** | `/dashboard/owner/customers/[email]` | `lib/api/customers.ts` (Planned) | `GET` | `/api/owner/customers/{email}` | `OwnerCustomerController` | `ShopService` | `User`, `Order` / `users`, `orders` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Owner Reviews List** | `/dashboard/owner/reviews` | `lib/api/reviews.ts` (Planned) | `GET` | `/api/owner/feedback` | `OwnerInteractionController` | `OwnerInteractionService` | `Feedback` / `feedback` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Reply to Review** | `/dashboard/owner/reviews` | `lib/api/reviews.ts` (Planned) | `POST` | `/api/owner/feedback/{id}/reply` | `OwnerInteractionController` | `OwnerInteractionService` | `Feedback` / `feedback` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Delete/Moderate Review** | `/dashboard/owner/reviews` | `lib/api/reviews.ts` (Planned) | `DELETE` | `/api/owner/feedback/{id}` | `OwnerInteractionController` | `OwnerInteractionService` | `Feedback` / `feedback` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Coupons List** | `/dashboard/owner/coupons` | `lib/api/coupons.ts` (Planned) | `GET` | `/api/owner/coupons` | `OwnerCouponController` | `ShopService` | `Coupon` / `coupons` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Create Coupon** | `/dashboard/owner/coupons` | `lib/api/coupons.ts` (Planned) | `POST` | `/api/owner/coupons` | `OwnerCouponController` | `ShopService` | `Coupon` / `coupons` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Analytics Dashboard** | `/dashboard/owner/analytics` | `lib/api/analytics.ts` (Planned) | `GET` | `/api/owner/analytics/dashboard` | `OwnerAnalyticsController` | `ShopService` | `Order`, `OrderItem` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Shop Profile Settings** | `/dashboard/owner/settings` | `lib/api/owner.ts` (Planned) | `GET` | `/api/shops/my-shop` | `ShopController` | `ShopService` | `Shop` / `shops` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Update Shop Profile** | `/dashboard/owner/settings` | `lib/api/owner.ts` (Planned) | `PUT` | `/api/shops/my-shop` | `ShopController` | `ShopService` | `Shop` / `shops` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Payout Bank Details** | `/dashboard/owner/settings` | `lib/api/owner.ts` (Planned) | `GET` | `/api/shops/my-shop/payouts` | `ShopPayoutController` | `ShopService` | `ShopPayoutDetails` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Save Payout Details** | `/dashboard/owner/settings` | `lib/api/owner.ts` (Planned) | `POST` | `/api/shops/my-shop/payouts` | `ShopPayoutController` | `ShopService` | `ShopPayoutDetails` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Current Subscription** | `/dashboard/owner/subscription` | `lib/api/subscription.ts` (Planned) | `GET` | `/api/owner/subscriptions/current` | `OwnerSubscriptionController` | `SubscriptionService` | `Subscription`, `SubscriptionPlan` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Mock Checkout Renewal** | `/dashboard/owner/subscription` | `lib/api/subscription.ts` (Planned) | `POST` | `/api/owner/payments/mock-checkout` | `OwnerPaymentController` | `PaymentService` | `Payment`, `Subscription` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **In-App Notifications** | `/dashboard/owner` (Bell) | `lib/api/notifications.ts` (Planned) | `GET` | `/api/notifications` | `NotificationController` | `NotificationService` | `Notification` / `notifications` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Notification Unread Count** | `/dashboard/owner` (Bell) | `lib/api/notifications.ts` (Planned) | `GET` | `/api/notifications/unread-count` | `NotificationController` | `NotificationService` | `Notification` / `notifications` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |
| **Mark Notification Read** | `/dashboard/owner` (Bell) | `lib/api/notifications.ts` (Planned) | `PATCH` | `/api/notifications/{id}/read` | `NotificationController` | `NotificationService` | `Notification` / `notifications` | `ROLE_SHOP_OWNER` | **BACKEND ONLY** |

---

## 3. Platform Admin Role API Blueprint

| Screen / Feature | Planned Frontend Route | Frontend API Service | Method | Backend Endpoint | Backend Controller | Backend Service | DB Entity / Table | Role | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Overview Stats** | `/admin` | `lib/api/admin.ts` (Planned) | `GET` | `/api/admin/dashboard/stats` | `AdminDashboardController` | `AdminDashboardService` | All entities | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Admin Bakery Directory** | `/admin/shops` | `lib/api/admin.ts` (Planned) | `GET` | `/api/admin/shops` | `AdminDashboardController` | `AdminDashboardService` | `Shop` / `shops` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Bakery Audit Details** | `/admin/shops/[id]` | `lib/api/admin.ts` (Planned) | `GET` | `/api/admin/shops/{shopId}` | `AdminDashboardController` | `AdminDashboardService` | `Shop`, `BusinessDocument` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Update Shop Status** | `/admin/shops/[id]` | `lib/api/admin.ts` (Planned) | `PATCH` | `/api/admin/shops/{shopId}/status` | `AdminDashboardController` | `AdminDashboardService` | `Shop` / `shops` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **List Subscription Plans** | `/admin/plans` | `lib/api/admin.ts` (Planned) | `GET` | `/api/admin/plans` | `AdminSubscriptionPlanController` | `SubscriptionService` | `SubscriptionPlan` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Create Subscription Plan** | `/admin/plans` | `lib/api/admin.ts` (Planned) | `POST` | `/api/admin/plans` | `AdminSubscriptionPlanController` | `SubscriptionService` | `SubscriptionPlan` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Update Subscription Plan** | `/admin/plans` | `lib/api/admin.ts` (Planned) | `PUT` | `/api/admin/plans/{id}` | `AdminSubscriptionPlanController` | `SubscriptionService` | `SubscriptionPlan` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Toggle Plan Active Status**| `/admin/plans` | `lib/api/admin.ts` (Planned) | `PATCH` | `/api/admin/plans/{id}/status` | `AdminSubscriptionPlanController` | `SubscriptionService` | `SubscriptionPlan` | `ROLE_ADMIN` | **BACKEND ONLY** |
| **Broadcast Admin Message** | `/admin/messages` | `lib/api/admin.ts` (Planned) | `POST` | `/api/admin/messages` | `AdminMessageController` | `NotificationService` | `Notification` | `ROLE_ADMIN` | **BACKEND ONLY** |
