# Data Model

This is an inventory of the current persistence model, not a schema redesign. Entity and table names below are from the JPA source annotations; field lists are the declared entity fields. Flyway is configured as the schema authority, with 40 numbered migrations present (`V1`–`V40`). Hibernate is configured to validate the mapped schema.

## Entity inventory

### Identity and access

- **User** (`users`): `id: Long`, `isDeleted: boolean`, `email: String`, `passwordHash: String`, `role: UserRole`, `fullName: String`, `mobile: String`, `status: UserStatus`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **OtpVerification** (`otp_verifications`): `id: Long`, `phoneNumber: String`, `otpHash: String`, `expiresAt: LocalDateTime`, `attempts: int`, `createdAt: LocalDateTime`.
- **PasswordResetToken** (`password_reset_tokens`): `id: Long`, `user: User`, `tokenHash: String`, `expiryDate: LocalDateTime`, `used: boolean`, `createdAt: LocalDateTime`.

### Bakery, storefront, and catalogue

- **Shop** (`shops`): `id: Long`, `isDeleted: boolean`, `owner: User`, `businessName: String`, `description: String`, `phone: String`, `email: String`, `address: String`, `city: String`, `state: String`, `pincode: String`, `businessCategory: String`, `businessType: BusinessType`, `yearsInBusiness: Integer`, `fssaiRegistration: String`, `addressLine1: String`, `addressLine2: String`, `area: String`, `district: String`, `latitude: Double`, `longitude: Double`, `logoUrl: String`, `coverImageUrl: String`, `aboutStory: String`, `aboutImageUrl: String`, `showAboutImage: Boolean`, `whatsappNumber: String`, `mapLocationUrl: String`, `status: ShopStatus`, `verificationStatus: VerificationStatus`, `inactiveReason: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`, `deliverySlots: List<ShopDeliverySlot>`, `deliveryConfig: ShopDeliveryConfig`, `storefrontSettings: ShopStorefrontSettings`, `banners: List<ShopBanner>`, `businessHours: List<ShopBusinessHours>`, `customFormFields: List<ShopCustomFormField>`.
- **BusinessDocument** (`business_documents`): `id: Long`, `shop: Shop`, `documentType: DocumentType`, `fileUrl: String`, `status: VerificationStatus`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopBanner** (`shop_banners`): `id: Long`, `shop: Shop`, `imageUrl: String`, `title: String`, `subtitle: String`, `buttonText: String`, `buttonUrl: String`, `displayOrder: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopBusinessHours** (`shop_business_hours`): `id: Long`, `shop: Shop`, `dayOfWeek: String`, `isOpen: Boolean`, `openTime: LocalTime`, `closeTime: LocalTime`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopCustomFormField** (`shop_custom_form_fields`): `id: Long`, `shop: Shop`, `fieldKey: String`, `fieldLabel: String`, `fieldType: String`, `isRequired: Boolean`, `isEnabled: Boolean`, `optionsJson: String`, `displayOrder: Integer`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopDeliveryConfig** (`shop_delivery_configs`): `id: Long`, `shop: Shop`, `deliveryChargeType: String`, `fixedChargeAmount: BigDecimal`, `minOrderForFreeDelivery: BigDecimal`, `deliveryNotes: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopDeliverySlot** (`shop_delivery_slots`): `id: Long`, `shop: Shop`, `dayOfWeek: String`, `startTime: LocalTime`, `endTime: LocalTime`, `maxOrders: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopGalleryItem** (`shop_gallery_items`): `id: Long`, `shop: Shop`, `title: String`, `caption: String`, `imageUrl: String`, `categoryName: String`, `displayOrder: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopPayoutDetails** (`shop_payout_details`): `id: Long`, `shop: Shop`, `bankAccountNumber: String`, `ifscCode: String`, `beneficiaryName: String`, `upiId: String`, `razorpayAccountId: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ShopStorefrontSettings** (`shop_storefront_settings`): `id: Long`, `shop: Shop`, `heroBannerEnabled: Boolean`, `topRatedEnabled: Boolean`, `reviewsEnabled: Boolean`, `bakeryInfoEnabled: Boolean`, `categoriesEnabled: Boolean`, `filtersEnabled: Boolean`, `ratingsEnabled: Boolean`, `aboutStoryEnabled: Boolean`, `aboutImageEnabled: Boolean`, `fulfillmentEnabled: Boolean`, `leadTimeDays: Integer`, `leadTimeMessage: String`, `customCakesEnabled: Boolean`, `ccFieldOccasionEnabled: Boolean`, `ccFieldFlavourEnabled: Boolean`, `ccFieldServingsEnabled: Boolean`, `ccFieldDateEnabled: Boolean`, `ccFieldBudgetEnabled: Boolean`, `ccFieldDeliveryEnabled: Boolean`, `ccFieldDesignEnabled: Boolean`, `ccFieldReferenceEnabled: Boolean`, `whatsappEnabled: Boolean`, `phoneEnabled: Boolean`, `emailEnabled: Boolean`, `addressEnabled: Boolean`, `mapEnabled: Boolean`, `businessHoursEnabled: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **Coupon** (`coupons`): `id: Long`, `shop: Shop`, `code: String`, `discountType: DiscountType`, `discountValue: BigDecimal`, `minOrderValue: BigDecimal`, `maxDiscountCap: BigDecimal`, `startDate: LocalDateTime`, `expiryDate: LocalDateTime`, `usageLimit: Integer`, `usedCount: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **Product** (`products`): `id: Long`, `isDeleted: boolean`, `shop: Shop`, `category: ProductCategory`, `name: String`, `description: String`, `ingredients: String`, `allergens: String`, `price: BigDecimal`, `originalPrice: BigDecimal`, `allowEggChoice: Boolean`, `eggPreferenceDefault: String`, `egglessPriceDiff: BigDecimal`, `imageUrl: String`, `availability: Boolean`, `status: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`, `images: List<ProductImage>`, `highlights: List<ProductHighlight>`, `variants: List<ProductVariant>`, `addons: List<ProductAddon>`.
- **ProductAddon** (`product_addons`): `id: Long`, `product: Product`, `name: String`, `price: BigDecimal`, `isAvailable: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ProductCategory** (`product_categories`): `id: Long`, `shop: Shop`, `name: String`, `slug: String`, `displayOrder: Integer`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ProductHighlight** (`product_highlights`): `id: Long`, `product: Product`, `highlightText: String`, `displayOrder: Integer`, `createdAt: LocalDateTime`.
- **ProductImage** (`product_images`): `id: Long`, `product: Product`, `imageUrl: String`, `displayOrder: Integer`, `altText: String`, `createdAt: LocalDateTime`.
- **ProductVariant** (`product_variants`): `id: Long`, `product: Product`, `name: String`, `price: BigDecimal`, `originalPrice: BigDecimal`, `imageUrl: String`, `description: String`, `displayOrder: Integer`, `variantType: String`, `isAvailable: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.

### Orders, payments, and subscriptions

- **Order** (`orders`): `id: Long`, `shop: Shop`, `customer: User`, `orderNumber: String`, `subtotal: BigDecimal`, `deliveryCharge: BigDecimal`, `totalAmount: BigDecimal`, `paymentStatus: String`, `orderStatus: String`, `deliveryAddress: String`, `customerName: String`, `customerEmail: String`, `customerPhone: String`, `paymentMethod: String`, `transactionId: String`, `paidAt: LocalDateTime`, `items: List<OrderItem>`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`, `deliverySlot: ShopDeliverySlot`, `deliveryDate: LocalDate`, `discountAmount: BigDecimal`, `couponCode: String`.
- **OrderItem** (`order_items`): `id: Long`, `order: Order`, `product: Product`, `productNameSnapshot: String`, `unitPrice: BigDecimal`, `quantity: Integer`, `totalPrice: BigDecimal`, `variantName: String`, `dietaryPreference: String`, `cakeMessage: String`, `photoReferenceUrl: String`, `addonsSummary: String`, `productImageUrl: String`, `originalPrice: BigDecimal`.
- **Payment** (`payments`): `id: Long`, `shop: Shop`, `subscription: Subscription`, `plan: SubscriptionPlan`, `amount: BigDecimal`, `currency: String`, `provider: String`, `providerOrderId: String`, `providerPaymentId: String`, `status: String`, `failureReason: String`, `paidAt: LocalDateTime`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **WebhookEvent** (`webhook_events`): `id: Long`, `eventId: String`, `eventType: String`, `processedAt: LocalDateTime`.
- **Subscription** (`subscriptions`): `id: Long`, `shop: Shop`, `plan: SubscriptionPlan`, `autoRenew: Boolean`, `status: SubscriptionStatus`, `amount: BigDecimal`, `startDate: LocalDateTime`, `expiryDate: LocalDateTime`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **SubscriptionPlan** (`subscription_plans`): `id: Long`, `name: String`, `description: String`, `billingCycle: String`, `price: BigDecimal`, `currency: String`, `durationDays: Integer`, `features: String`, `isActive: Boolean`, `displayOrder: Integer`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.

### Customer interactions and communications

- **CustomCakeRequest** (`custom_cake_requests`): `id: Long`, `shop: Shop`, `customerName: String`, `customerEmail: String`, `customerMobile: String`, `occasion: String`, `cakeType: String`, `flavour: String`, `servings: Integer`, `designDescription: String`, `referenceImageUrl: String`, `budget: BigDecimal`, `requiredDate: LocalDate`, `deliveryPreference: String`, `status: String`, `ownerResponse: String`, `convertedOrderId: Long`, `convertedOrderNumber: String`, `fieldValues: List<CustomCakeRequestFieldValue>`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **CustomCakeRequestFieldValue** (`custom_cake_request_field_values`): `id: Long`, `request: CustomCakeRequest`, `fieldKey: String`, `fieldLabel: String`, `fieldValue: String`, `createdAt: LocalDateTime`.
- **Enquiry** (`enquiries`): `id: Long`, `shop: Shop`, `customerName: String`, `customerEmail: String`, `customerMobile: String`, `enquiryType: String`, `message: String`, `ownerReply: String`, `status: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **Feedback** (`feedback`): `id: Long`, `shop: Shop`, `customerDisplayName: String`, `rating: Integer`, `comment: String`, `orderReference: String`, `product: Product`, `productName: String`, `recommendationText: String`, `cakeImageUrl: String`, `cakeVideoUrl: String`, `customerEmail: String`, `editToken: String`, `isApproved: Boolean`, `ownerReply: String`, `deletedAt: LocalDateTime`, `deletedBy: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ProductReview** (`product_reviews`): `id: Long`, `shop: Shop`, `product: Product`, `order: Order`, `orderItem: OrderItem`, `customerName: String`, `customerPhone: String`, `rating: Integer`, `reviewText: String`, `isVerifiedPurchase: Boolean`, `ownerReply: String`, `ownerRepliedAt: LocalDateTime`, `cakeImageUrl: String`, `cakeVideoUrl: String`, `editToken: String`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **ContactEnquiry** (`contact_enquiries`): `id: Long`, `name: String`, `email: String`, `phone: String`, `subject: String`, `message: String`, `user: User`, `isRead: Boolean`, `adminReply: String`, `repliedAt: LocalDateTime`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **PlatformFeedback** (`platform_feedback`): `id: Long`, `owner: User`, `shop: Shop`, `rating: Integer`, `category: PlatformFeedbackCategory`, `message: String`, `isRead: Boolean`, `adminReply: String`, `repliedAt: LocalDateTime`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **Conversation** (`conversations`): `id: Long`, `owner: User`, `status: ConversationStatus`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`, `messages: List<Message>`.
- **Message** (`messages`): `id: Long`, `conversation: Conversation`, `sender: User`, `senderRole: String`, `messageText: String`, `isRead: Boolean`, `createdAt: LocalDateTime`.

### Notifications, audit, and settings

- **ActivityLog** (`activity_logs`): `id: Long`, `actorUserId: Long`, `shopId: Long`, `action: String`, `entityType: String`, `entityId: Long`, `metadata: String`, `timestamp: LocalDateTime`.
- **AdminNotification** (`admin_notifications`): `id: Long`, `type: AdminNotificationType`, `title: String`, `message: String`, `priority: AdminNotificationPriority`, `category: AdminNotificationCategory`, `recipient: User`, `isRead: Boolean`, `readAt: LocalDateTime`, `referenceId: String`, `referenceType: String`, `actionUrl: String`, `createdAt: LocalDateTime`.
- **BroadcastHistory** (`broadcast_history`): `id: Long`, `title: String`, `message: String`, `targetType: String`, `targetOwnerId: Long`, `recipientCount: Integer`, `sentEmail: Boolean`, `sentAt: LocalDateTime`.
- **Notification** (`notifications`): `id: Long`, `recipient: User`, `type: NotificationType`, `title: String`, `message: String`, `referenceId: String`, `isRead: Boolean`, `createdAt: LocalDateTime`.
- **GlobalSettings** (`global_settings`): `id: Long`, `platformName: String`, `supportEmail: String`, `razorpayKeyId: String`, `razorpayKeySecret: String`, `razorpayWebhookSecret: String`, `platformCurrency: String`, `updatedAt: LocalDateTime`.

### Location reference data

- **LocationCountry** (`location_countries`): `id: Integer`, `code: String`, `name: String`, `phoneCode: String`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **LocationState** (`location_states`): `id: Integer`, `country: LocationCountry`, `code: String`, `name: String`, `normalizedName: String`, `type: String`, `lgdCode: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **LocationDistrict** (`location_districts`): `id: Integer`, `state: LocationState`, `name: String`, `normalizedName: String`, `lgdCode: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **LocationCity** (`location_cities`): `id: Integer`, `district: LocationDistrict`, `name: String`, `normalizedName: String`, `tier: String`, `lgdUlbCode: Integer`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **LocationLocality** (`location_localities`): `id: Integer`, `city: LocationCity`, `name: String`, `normalizedName: String`, `latitude: Double`, `longitude: Double`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **LocationPincode** (`location_pincodes`): `pincode: String`, `district: LocationDistrict`, `primaryOfficeName: String`, `officeType: String`, `deliveryStatus: String`, `isActive: Boolean`, `createdAt: LocalDateTime`, `updatedAt: LocalDateTime`.
- **LocationDatasetMetadata** (`location_dataset_metadata`): `id: Integer`, `datasetName: String`, `sourceAuthority: String`, `sourceVersion: String`, `sourceUrl: String`, `checksumSha256: String`, `statesCount: Integer`, `districtsCount: Integer`, `citiesCount: Integer`, `localitiesCount: Integer`, `pincodesCount: Integer`, `unresolvedCount: Integer`, `status: String`, `loaderSummary: String`, `startedAt: LocalDateTime`, `completedAt: LocalDateTime`.

## Relationships

The relationship annotations and typed fields show these principal associations:

- A `User` owns/participates in `Shop`, `Order`, `Conversation`, `Message`, `Notification`, `AdminNotification`, `ContactEnquiry`, and `PlatformFeedback` records; password reset tokens reference a user.
- A `Shop` is the central owner of storefront settings, banners, hours, delivery configuration/slots, gallery items, payout details, documents, products, coupons, orders, subscriptions, reviews, and customer interaction records.
- A `Product` belongs to a shop/category and has collections of images, highlights, variants, and add-ons. Reviews and order items can refer to products.
- An `Order` belongs to a shop and optionally a customer, contains order items, and can refer to a delivery slot. Payments/subscriptions reference the shop and plan/payment state.
- A `Conversation` belongs to an owner and contains messages; each message also references its sender.
- Custom cake request field values belong to their parent request.
- Location hierarchy is country → state → district → city → locality; pincodes reference a district.
- Several records deliberately store denormalized snapshots/IDs or strings (for example, `OrderItem.productNameSnapshot`, `ActivityLog` IDs, `CustomCakeRequest.convertedOrderId`). Their current representation is retained as declared.

## Transaction boundaries

Transactions are declared at service-method level with Spring `@Transactional` (including read-only query methods); this is visible, for example, in the chat service. The exact transactional methods differ by domain service. Database schema changes are separately sequenced through Flyway; no attempt is made here to infer transaction scope for unannotated methods.

## Key entities

1. **User** — platform identity and role/status information.
2. **Shop** — bakery profile, ownership, verification, and storefront configuration anchor.
3. **Product** — bakery catalogue item with category, pricing, ingredients/allergens, variants, images, highlights, and add-ons.
4. **Order** — customer purchase, pricing/payment/order state, delivery details, and line items.
5. **Subscription** — shop plan enrollment and renewal/expiry state.
6. **Payment** — payment-provider transaction record associated with shop/plan/subscription state.
7. **CustomCakeRequest** — customer bespoke-cake request and owner response/conversion metadata.
8. **ProductReview** — customer product/order review with verified-purchase, owner-reply, and media/edit-token fields.

