# CAKESTORE API CONTRACT MAP

## Admin Dashboard (`/api/admin`)
*   `GET /api/admin` - AdminDashboardController
*   `GET /api/admin/plans` - AdminSubscriptionPlanController
*   `GET /api/admin/chat` - AdminChatController
*   `GET /api/admin/messages` - AdminMessageController
*   `GET /api/admin/notifications` - AdminNotificationController
*   `GET /api/admin/settings` - AdminSettingsController

## Owner Dashboard (`/api/owner`)
*   `GET /api/owner` - OwnerInteractionController
*   `GET /api/owner/chat` - OwnerChatController
*   `GET /api/owner/feedback` - OwnerFeedbackController
*   `GET /api/owner/media` - MediaController
*   `GET /api/owner/orders` - OwnerOrderController
*   `GET /api/owner/payments` - OwnerPaymentController
*   `GET /api/owner/categories` - OwnerCategoryController
*   `GET /api/owner/products` - OwnerProductController
*   `GET /api/owner/product-reviews` - OwnerProductReviewController
*   `GET /api/owner/analytics` - OwnerAnalyticsController
*   `GET /api/owner/coupons` - OwnerCouponController
*   `GET /api/owner/customers` - OwnerCustomerController
*   `GET /api/owner/delivery-slots` - OwnerDeliverySlotController
*   `GET /api/owner/gallery` - OwnerGalleryController
*   `GET /api/owner/storefront` - OwnerStorefrontController
*   `GET /api/owner/subscriptions` - OwnerSubscriptionController
*   `GET /api/owner/account` - OwnerAccountController

## Customer / Storefront (`/api/storefront`, `/api/customer`)
*   `GET /api/storefront/shops/{shopId}` - CustomerInteractionController
*   `GET /api/storefront/orders` - CustomerPaymentController
*   `GET /api/storefront/shops/{shopId}/reviews` - CustomerProductReviewController
*   `GET /api/storefront/shops/{shopId}/gallery` - CustomerGalleryController
*   `GET /api/storefront/media` - CustomerMediaController
*   `GET /api/storefront/shops`, `/api/customer/storefront` - CustomerStorefrontController
*   `GET /api/storefront/enquiries` - CustomerStorefrontEnquiryController
*   `GET /api/customer/storefront/tracking` - GuestTrackingController
*   `GET /api/storefront/plans` - PublicPlanController

## General / System
*   `GET /api/auth` - AuthController
*   `GET /api` - HealthController
*   `GET /api/contact/enquiries` - PublicContactController
*   `GET /api/webhooks` - WebhookController, RazorpayWebhookController
*   `GET /api/shops` - ShopController
*   `GET /api/shops/my-shop/payouts` - ShopPayoutController
*   `GET /api/verification` - VerificationController

*(Further iterations will map HTTP Methods, Request DTOs, and Response Types to detect precise mismatches with Frontend interfaces).*
