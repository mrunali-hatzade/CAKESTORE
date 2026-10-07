# CakeStore SaaS — Updated Backend PRD

## 1. Document Purpose

This PRD defines the next backend development phase for the existing CakeStore SaaS platform.

The existing Spring Boot backend is already implemented with:

- Spring Boot 3.3.2
- Java 17
- PostgreSQL
- JPA/Hibernate
- Flyway
- Spring Security
- Stateless JWT authentication
- BCrypt
- Role-based authorization
- Multi-tenant shop isolation
- IDOR protection
- Product CRUD
- Guest order creation
- Mock subscription/payment flow
- Admin shop suspension
- Activity logging

### Critical implementation rule

**Do not rebuild working functionality.**

Before creating any new class, entity, controller, service, repository, DTO, migration, or configuration file:

1. Inspect the existing project.
2. Determine whether the requirement can safely be implemented by modifying an existing file.
3. Reuse existing entities, enums, services, repositories, DTOs, controllers, utilities, and configuration whenever possible.
4. Create a new file only when a new responsibility genuinely requires a separate class/file.
5. Do not create duplicate versions of existing functionality.
6. Do not rename/move existing files unnecessarily.
7. Do not rewrite working authentication, security, multi-tenant, Flyway, product, order, or payment code without a demonstrated requirement.
8. Preserve existing API contracts unless a requirement explicitly requires a change.
9. Before changing an existing file, inspect its current implementation and integrate the new behavior instead of replacing unrelated logic.
10. Keep the project clean and minimal.

---

# 2. Product Goal

CakeStore is a multi-tenant SaaS platform for cake businesses.

The platform allows:

- Cake businesses to register and become verified automatically.
- Verified businesses to operate their own online storefront.
- Customers to browse businesses by location.
- Customers to order without creating an account.
- Customers to choose COD or online payment.
- Owners to manage cakes, orders, customers, feedback, enquiries, and subscriptions.
- Owners to receive real-time notifications.
- Admins to manage the platform, subscription plans, pricing, business status, and platform messages.
- Automated subscription renewal and expiry notifications.
- Automated business-document verification without normal admin approval.

---

# 3. Existing Architecture — Preserve

The existing implementation contains:

```text
User
Shop
Product
Order
Payment
Subscription
ActivityLog
Authentication/JWT
Spring Security
Flyway
JPA/Hibernate
```

Existing working functionality must remain operational.

The new implementation must extend the existing architecture instead of creating a parallel architecture.

---

# 4. Roles

The platform has three primary roles:

```text
ADMIN
SHOP_OWNER
CUSTOMER
```

Customers do not need a traditional account for MVP guest checkout.

## ADMIN

Admin can:

- Manage subscription plans.
- Change subscription pricing.
- Change plan features/duration.
- Activate/deactivate plans.
- View platform statistics.
- Suspend/reactivate businesses where platform policy requires it.
- Send platform messages to owners.
- Manage/moderate platform-level content where permitted.

Admin does **not** manually approve normal business registrations.

## SHOP_OWNER

Owner can:

- Register a cake business.
- Upload verification documents.
- Manage business profile/location.
- Manage cakes/products.
- Manage orders.
- View customer information associated with their orders.
- View payment information.
- Manage enquiries.
- Manage feedback and replies.
- Manage custom cake requests.
- View notifications.
- Manage subscription.
- Enable/disable auto-renewal.

Owners can access only their own business/shop data.

## CUSTOMER

Customers can:

- Browse public verified/active businesses.
- Search nearby businesses.
- Browse cakes.
- Use guest checkout.
- Enter contact details.
- Choose COD or online payment.
- Place orders.
- Submit feedback.
- Submit contact/enquiry forms.
- Submit custom cake requests.

Customers do not need to create an account for MVP.

---

# 5. Business Registration

The existing registration flow must be upgraded.

Current simplified flow:

```text
Register
→ Create User
→ Create Shop
→ Payment
→ ACTIVE
```

New flow:

```text
Owner Registration
→ Email/Mobile Verification
→ Business Information
→ Business Location
→ Required Documents
→ Automated Verification
→ VERIFIED
→ Subscription Payment
→ ACTIVE
```

Payment must not itself prove that a business is legitimate.

---

# 6. Owner Registration Fields

## Owner information

Required:

- Full name
- Email
- Mobile number
- Password
- Confirm password

Verification:

- Email verification
- Mobile OTP verification where implemented

Do not collect unnecessary personal information.

## Business information

Required/conditional:

- Business/brand name
- Business type
- Business description
- Business phone
- Business email
- Years in business
- FSSAI registration/license information where applicable

Business types may include:

```text
HOME_BAKERY
BAKERY_SHOP
CAKE_STUDIO
ONLINE_CAKE_BUSINESS
OTHER
```

Use an existing enum if one already exists. Create a new enum only if the existing model cannot represent this safely.

---

# 7. Business Documents

Businesses must provide applicable proof before becoming active.

Potential documents:

```text
FSSAI_CERTIFICATE
IDENTITY_PROOF
GST_CERTIFICATE
SHOP_LICENSE
BUSINESS_REGISTRATION
OTHER
```

Do not make every document mandatory for every business.

Requirements should depend on the business type and applicable legal requirements.

Store document metadata securely.

Do not expose private document URLs publicly.

Do not store raw identity documents unnecessarily.

---

# 8. Automated Document Verification

Normal business verification must not require an Admin to click Approve.

Flow:

```text
UPLOAD
↓
PROCESSING
↓
File validation
↓
OCR/document data extraction
↓
Document integrity checks
↓
Expiry/status checks
↓
Business information matching
↓
Owner information matching where applicable
↓
Duplicate/fraud checks
↓
Authoritative verification where an appropriate official/authorized verification mechanism exists
↓
Decision
```

Verification statuses:

```text
PROCESSING
VERIFIED
ACTION_REQUIRED
REJECTED
```

## VERIFIED

Business may proceed to subscription/payment.

## ACTION_REQUIRED

The system must tell the owner what needs correction.

Example:

```text
Your FSSAI certificate could not be read clearly.
Please upload a clear PDF or image.
```

## REJECTED

The system must provide a useful reason without exposing sensitive internal fraud/risk logic.

Example:

```text
The submitted document could not be verified.
Please upload a valid and readable document.
```

Do not implement a simplistic "AI image = real/fake" decision.

Use authoritative verification where available plus document/OCR/risk checks.

---

# 9. Business Location

Business address is mandatory during registration.

Fields:

- Address line 1
- Address line 2
- Area/locality
- City
- District
- State
- PIN code
- Latitude
- Longitude

Business can update the address later.

Address changes must update the location used for nearby search.

## Home businesses

Support:

```text
HOME_BAKERY
```

Home businesses must be able to operate from their residential location.

Do not publicly expose an exact residential address by default.

Store exact address securely, but public search can show:

```text
Akurdi, Pune
```

rather than a complete home address.

Additional options:

- Pickup available
- Delivery available
- Public address visibility

---

# 10. Nearby Business Search

Only businesses that are:

```text
VERIFIED
+
ACTIVE
+
SUBSCRIPTION ACTIVE
```

should appear in public business discovery.

Support location-based search such as:

```http
GET /api/storefront/shops/nearby?latitude={lat}&longitude={lng}&radius={km}
```

If an equivalent endpoint already exists, extend it instead of creating a duplicate.

Search should support:

- Radius
- Area/locality
- City
- Distance sorting

---

# 11. Subscription Plans

Admin controls subscription plans.

Plan data should be database-driven.

Plan fields may include:

- Name
- Description
- Price
- Currency
- Duration
- Features
- Active/inactive
- Created date
- Updated date

Admin can:

- Create plan
- Edit plan
- Change price
- Change duration
- Change features
- Activate/deactivate plan

Do not hardcode pricing in frontend or business logic.

---

# 12. Existing Subscription Compatibility

Existing subscriptions must continue to work.

When pricing changes:

```text
Existing subscription:
₹699
```

must retain its original paid amount until that subscription ends.

New subscriptions use the new plan price.

Payment history must preserve the actual amount paid.

---

# 13. Subscription Lifecycle

Recommended statuses:

```text
ACTIVE
EXPIRING_SOON
EXPIRED
GRACE_PERIOD
SUSPENDED
```

Lifecycle:

```text
ACTIVE
↓
EXPIRING_SOON
↓
EXPIRED
↓
GRACE_PERIOD
↓
SUSPENDED
```

The grace period duration must be configurable.

---

# 14. Subscription Access Control

Subscription status must be checked on the backend.

Owner dashboard access requires:

```text
Valid authentication
+
SHOP_OWNER role
+
Verified business
+
Active subscription
```

If subscription is expired/suspended:

- Owner must not access protected dashboard/business-management APIs.
- Login must not grant normal dashboard access.
- API must return a clear subscription-related response.
- Frontend should show renewal action.

After successful renewal:

```text
Payment success
→ Subscription ACTIVE
→ Owner can immediately access dashboard
```

Do not rely only on frontend route guards.

---

# 15. Grace Period

Do not permanently suspend the business immediately at expiry.

Recommended:

```text
Expiry
↓
Grace period
↓
Final warning
↓
SUSPENDED
```

During grace period, platform behavior should be configurable.

Recommended restrictions:

- Prevent new business operations if required by subscription policy.
- Allow owner to login enough to renew.
- Allow access to billing/subscription information.
- Preserve existing data.

---

# 16. Auto-Renewal

Subscription must support optional auto-renewal.

Fields may include:

```text
autoRenew
```

Owner can:

```text
Enable Auto-Renew
Disable Auto-Renew
```

Turning auto-renew off does not immediately cancel the current subscription.

It only prevents the next automatic renewal.

## Successful renewal

```text
Scheduled renewal
→ Payment gateway
→ Payment successful
→ Subscription extended
→ Payment recorded
```

## Failed renewal

```text
Payment failed
→ Owner notified
→ Retry according to payment provider capabilities
→ Grace period
```

Never store raw card numbers or CVV.

Use payment gateway subscription/tokenization mechanisms.

---

# 17. Subscription Notifications

Automated email reminders:

```text
7 days before expiry
5 days before expiry
3 days before expiry
1 day before expiry
Expiry day
Grace-period reminders
Final warning
```

Do not send unlimited daily emails.

Notification frequency should stop once:

- Subscription is renewed.
- Subscription is suspended.
- Notification campaign is completed.

Every automated notification must be idempotent.

Do not send the same notification multiple times if the scheduler runs repeatedly.

---

# 18. Notification System

Create or extend one centralized notification mechanism.

Do not create separate notification tables/services for every feature unless genuinely necessary.

Notification types may include:

```text
NEW_ORDER
NEW_ENQUIRY
NEW_FEEDBACK
CUSTOM_ORDER_REQUEST
ADMIN_MESSAGE
SUBSCRIPTION_EXPIRING
SUBSCRIPTION_EXPIRED
PAYMENT_SUCCESS
PAYMENT_FAILED
DOCUMENT_VERIFICATION
```

Notification fields:

```text
id
recipientId
type
title
message
referenceId
isRead
createdAt
```

Reuse the existing notification implementation if one already exists.

---

# 19. Unread Notification Count

Owner dashboard must show unread notifications.

Example:

```text
New order → 1
Another unseen order → 2
```

Use stored notification state:

```text
isRead = false
```

Do not maintain only a manually incremented integer.

Unread count:

```text
COUNT(notifications WHERE recipientId = owner AND isRead = false)
```

When opened/marked read:

```text
isRead = true
```

The count decreases accordingly.

---

# 20. Real-Time Notifications

Use the existing WebSocket infrastructure if already available.

If WebSocket is not currently implemented, create it only when necessary.

Events include:

- New order
- New enquiry
- New feedback
- Custom cake request
- Admin message

Flow:

```text
Customer action
→ Backend saves data
→ Notification created
→ Real-time event
→ Owner dashboard updates
```

No page refresh should be required.

---

# 21. Admin Messages

Admin can send messages to:

```text
ALL_OWNERS
SPECIFIC_OWNER
```

Owners receive:

- Dashboard notification
- Message
- Optional email

Admin messaging must not bypass authorization.

---

# 22. Guest Checkout

Customers do not need to register/login.

Flow:

```text
Browse
→ Cart
→ Guest Checkout
→ Contact details
→ Address
→ Payment method
→ Order
```

Required:

- Name
- Valid mobile
- Valid email
- Delivery/pickup address as applicable

Do not require the email to already have a CakeStore account.

A new customer must be able to order.

---

# 23. Customer Contact Validation

Validate:

- Email format
- Mobile format

Prefer:

- Mobile OTP verification
- Email verification where appropriate

Invalid details must immediately show a clear error.

Example:

```text
Please enter a valid mobile number.
```

Do not reject a valid new email merely because it does not already exist in the database.

---

# 24. Payment Methods

Customer can choose:

```text
COD
ONLINE_PAYMENT
```

Online payment can later expose supported methods such as:

- UPI
- Debit/Credit Card
- Net Banking
- Other gateway-supported methods

MVP can begin with:

```text
COD
Online Payment
```

Payment status must be stored separately from order status.

---

# 25. Order Payment Information

Owner must be able to see payment information for each order.

Example:

```text
Payment Method: UPI
Payment Status: PAID
Transaction ID: XXXXX
Paid At: XXXXX
```

COD:

```text
Payment Method: COD
Payment Status: PENDING
```

Never expose sensitive payment credentials.

---

# 26. Owner Order Dashboard

Owner sees:

```text
New Orders
Processing
Ready
Completed
Cancelled
```

Order details include:

- Order ID
- Customer name
- Mobile
- Email
- Address
- Products
- Quantities
- Prices
- Total
- Payment method
- Payment status
- Order status
- Date/time

New orders generate an unread notification.

---

# 27. Customer Profile

Owner can click a customer name and see the customer's information associated with their shop.

Display:

- Name
- Verified/contact mobile
- Email
- Address where appropriate
- Total orders
- Order history
- Total spending
- Last order

Owner must only see customers/orders belonging to that owner's shop.

No cross-shop customer access.

---

# 28. Order Status

Do not implement live delivery tracking in this phase.

Use only internal order status:

```text
NEW
ACCEPTED
PREPARING
READY
DELIVERED
CANCELLED
```

No delivery-agent GPS tracking.

---

# 29. Product/Cake Management

Owner must be able to:

- Add cake/product
- View cake/product
- Edit
- Update
- Delete
- Activate/deactivate
- Manage availability

Owner can modify only their own shop's products.

Existing IDOR protection must remain intact.

---

# 30. Feedback

Customer can submit feedback without creating an account.

Flow:

```text
Submit
→ Save feedback
→ Return success
→ Update UI immediately
```

If WebSocket is enabled, connected users can see new approved/public feedback without refreshing.

Feedback can include:

- Rating
- Comment
- Customer display name
- Order reference where applicable

---

# 31. Feedback Replies

Owner can:

- View feedback
- Reply
- Hide/delete where allowed

Admin can moderate platform content if required.

Use soft deletion where possible:

```text
deletedAt
deletedBy
```

Do not destroy records unnecessarily.

---

# 32. Contact / Enquiry Forms

Support:

```text
Contact Us
General Enquiry
Business Enquiry
```

Flow:

```text
Submit
→ Validate
→ Save
→ Owner notification where applicable
→ Thank-you response
→ Email acknowledgement
```

Owner can:

- View
- Reply
- Delete/archive

---

# 33. Custom Cake Requests

Customer can submit:

- Occasion
- Cake type
- Flavour
- Servings
- Design description
- Reference image
- Budget
- Required date
- Delivery/pickup preference
- Mobile
- Email

Owner receives a notification.

Owner can review and respond.

Do not implement full delivery tracking.

---

# 34. Email Automation

Centralize email sending.

Email events include:

### Registration

- Email verification
- Business verification result

### Subscription

- Expiry reminders
- Expired notification
- Payment success
- Payment failure
- Renewal confirmation

### Orders

- New order to owner
- Order confirmation to customer
- Relevant order status updates

### Forms

- Feedback thank-you
- Contact acknowledgement
- Enquiry acknowledgement
- Custom order acknowledgement

### Admin

- Platform message where appropriate

Email sending should be asynchronous where practical.

---

# 35. Data Security

The backend must enforce:

- JWT authentication
- Role-based authorization
- Shop-level tenant isolation
- IDOR protection
- Input validation
- Server-side price calculation
- Server-side subscription checks
- Secure document access
- Secure payment handling
- No sensitive document exposure
- No raw card/CVV storage
- Audit logging for important administrative actions

Never trust:

- `shopId`
- `ownerId`
- `price`
- `paymentStatus`
- `subscriptionStatus`
- `role`

from the frontend.

These must be derived/validated server-side.

---

# 36. API Design Principles

Before adding an endpoint:

1. Search existing controllers.
2. Reuse existing endpoint if appropriate.
3. Extend existing service if responsibility matches.
4. Create a new controller/service only when responsibility is genuinely new.
5. Maintain REST conventions.
6. Validate all request bodies.
7. Return appropriate HTTP status codes.
8. Do not expose entities directly if the existing architecture uses DTOs.

---

# 37. Database Migration Rules

Flyway must remain enabled.

Every database schema change requires a new migration only when the existing schema cannot support the requirement.

Before creating a migration:

1. Inspect current migrations.
2. Check current database schema.
3. Avoid duplicate columns/tables.
4. Use the next correct Flyway version.
5. Never edit an already-applied production migration.
6. Test migration locally before continuing.

---

# 38. Testing Requirements

For every new module, test:

### Positive case

Expected valid request succeeds.

### Negative case

Invalid request is rejected.

### Authorization case

Unauthorized request fails.

### Tenant isolation

Owner A cannot access Owner B's data.

### Subscription case

Expired owner cannot access protected dashboard APIs.

### Renewal case

Successful renewal immediately restores access.

### Notification case

Unread count increments and read state works.

### Duplicate notification case

Scheduler does not send the same scheduled notification twice.

### Guest checkout case

New customer can order without an account.

### Payment case

COD and online payment states are correctly represented.

---

# 39. Implementation Order

Implement in this exact order unless an existing dependency requires otherwise:

```text
1. Inspect existing project
2. Business Registration changes
3. Document Verification
4. Business Location
5. Subscription Plans/Pricing
6. Subscription lifecycle
7. Owner subscription access control
8. Auto-renewal
9. Subscription email scheduler
10. Central notification system
11. WebSocket real-time events
12. Guest checkout validation
13. Payment method improvements
14. Order/payment details
15. Customer profile/order history
16. Product CRUD improvements
17. Feedback/replies
18. Contact/enquiries
19. Custom cake requests
20. Admin → Owner messaging
21. Integration testing
22. Regression testing
```

---

# 40. Strict Antigravity Development Rules

Before every implementation task:

```text
INSPECT → REUSE → MODIFY → CREATE ONLY IF NECESSARY → TEST
```

Antigravity must not:

- Generate duplicate classes.
- Generate duplicate entities.
- Generate duplicate services.
- Generate duplicate repositories.
- Generate duplicate controllers.
- Create unnecessary DTOs.
- Create unnecessary migrations.
- Replace working implementations without evidence.
- Change database technology.
- Disable Flyway to hide errors.
- Disable Spring Security to make tests pass.
- Disable tenant isolation.
- Hardcode subscription prices.
- Hardcode subscription status.
- Trust frontend-provided shop/owner IDs.
- Store raw card/CVV information.
- Make Admin part of normal document verification.
- Implement live delivery tracking in this phase.

If an existing file can safely support the requirement, **edit that file**.

If a new file is genuinely required because the responsibility is independent or cannot reasonably belong in an existing class, create it.

Before creating a new file, explicitly determine:

```text
Existing file that could be extended:
[filename]

Why modification is insufficient:
[reason]

New file required:
[filename]
```

Only then create the new file.

---

# 41. Definition of Done

A feature is complete only when:

- Backend compiles.
- Flyway starts successfully.
- Application starts successfully.
- Existing tests still pass.
- New feature tests pass.
- Authorization works.
- Tenant isolation works.
- Error responses are appropriate.
- No duplicate files/classes were introduced.
- No unrelated existing functionality was changed.
- Database migrations work from a clean database.
- Existing APIs remain functional unless intentionally changed.
- Documentation/comments are updated where necessary.

---

# 42. Final MVP Scope

The CakeStore backend MVP should provide:

```text
AUTHENTICATION
✓ JWT
✓ Roles
✓ Owner authentication
✓ Guest customer checkout

BUSINESS
✓ Registration
✓ Automated verification
✓ Business documents
✓ Business location
✓ Home bakery support
✓ Nearby discovery

SUBSCRIPTION
✓ Plans
✓ Admin pricing
✓ Payment
✓ Expiry
✓ Grace period
✓ Auto-renewal
✓ Renewal
✓ Email reminders
✓ Access restriction

PRODUCTS
✓ Add
✓ Edit
✓ Update
✓ Delete
✓ Availability

ORDERS
✓ Guest orders
✓ COD
✓ Online payment
✓ Payment details
✓ Customer details
✓ Order history
✓ Owner notifications

COMMUNICATION
✓ Feedback
✓ Feedback replies
✓ Contact
✓ Enquiries
✓ Custom cake requests
✓ Admin messages
✓ Email notifications

REAL-TIME
✓ Unread notification counts
✓ New order notifications
✓ New enquiry notifications
✓ Feedback notifications
✓ Custom request notifications
✓ Admin messages

SECURITY
✓ JWT
✓ RBAC
✓ Tenant isolation
✓ IDOR protection
✓ Server-side validation
✓ Secure document handling
✓ Secure payment handling

NOT INCLUDED IN THIS PHASE
✗ Live delivery GPS tracking
✗ Delivery agent application
✗ Customer account requirement
✗ Manual Admin business verification
```

---

## Final principle

**Extend the existing CakeStore backend; do not rebuild it.**

The current implementation is the foundation. Every new feature should integrate into that foundation with the smallest safe change possible.
