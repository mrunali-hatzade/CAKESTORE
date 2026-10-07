# Cake Business SaaS Platform — Product Requirements Document

**Version:** 2.0  
**Status:** Development Baseline  
**Updated:** 23 August 2026

---

## 1. Background

The Cake Business SaaS Platform is a multi-tenant web platform that allows independent cake/bakery business owners to create and manage an online storefront.

The platform is designed around three primary areas:

1. **Customer Storefront** — customers browse products and place orders.
2. **Shop Owner Dashboard** — owners manage their business, products, orders and subscription.
3. **Platform Admin Panel** — the platform administrator manages registered shops, subscriptions, payments and platform activity.

The platform follows a subscription-based business model. A shop owner registers, completes payment, receives an active subscription, and gets access to the owner dashboard.

A key business rule is that **Inactive and Suspended have different meanings**:

- **Active:** The shop has a valid paid subscription and can use the owner dashboard.
- **Inactive:** The subscription has ended because the owner did not renew for the next period. This is a normal subscription state, not a disciplinary action.
- **Suspended:** The platform administrator has deliberately suspended the shop, for example because of a policy issue or because the owner requested to stop continuing the service.
- **Pending:** Registration exists but the required payment/activation process has not been completed.

---

# 2. Product Vision

Build a professional, reusable SaaS platform that can onboard multiple cake businesses while keeping each business's data logically isolated.

The platform should be designed so that the same architecture can later support other local businesses such as bakeries, food businesses or salons.

---

# 3. Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- REST API integration using `fetch` or Axios

## Backend

- Java
- Spring Boot
- Maven
- Spring Web
- Spring Data JPA
- Hibernate
- Spring Security
- JWT authentication
- Bean Validation
- Flyway
- PostgreSQL JDBC Driver

## Database

- Supabase PostgreSQL

## Image Storage

- Cloudinary

## Payment

- Razorpay

## API Testing

- Postman

## Version Control

- Git
- GitHub

## Deployment

- Frontend: Vercel or equivalent
- Backend: Spring Boot-compatible production hosting
- Database: Supabase PostgreSQL
- Images: Cloudinary

---

# 4. High-Level Architecture

```text
Customer / Shop Owner / Admin
             |
             v
       Next.js Frontend
             |
          REST API
             |
             v
       Spring Boot Backend
             |
      --------------------
      |        |         |
   Security  Business  Payment
             Logic     Integration
      |        |
      ---------
          |
      JPA / Hibernate
          |
          v
   Supabase PostgreSQL

External Services:
Spring Boot ---> Razorpay
Spring Boot ---> Cloudinary
Spring Boot ---> Supabase PostgreSQL
```

The browser must not directly connect to PostgreSQL for this architecture.

---

# 5. User Roles

## 5.1 ADMIN

Platform administrator.

Responsibilities:

- View all registered shops.
- View registration date/time.
- View payment history.
- View subscription history.
- View current shop status.
- View shop activity.
- Activate shops where appropriate.
- Suspend shops where appropriate.
- View platform-level statistics.
- Monitor subscriptions and payments.

## 5.2 SHOP_OWNER

Business owner.

Responsibilities:

- Register a business.
- Complete business profile.
- Purchase subscription.
- Log in.
- Manage products.
- Upload product images.
- Manage orders.
- View customers/order information.
- View subscription information.
- Renew subscription.

## 5.3 CUSTOMER

End customer.

Responsibilities:

- Visit a shop storefront.
- Browse products.
- Search/filter products.
- View product details.
- Add products to cart.
- Checkout.
- Place orders.

Customer login can be optional for the MVP.

---

# 6. Shop Status Model

This is an important business rule.

The shop status must use the following values:

```text
PENDING
ACTIVE
INACTIVE
SUSPENDED
```

## PENDING

Meaning:

- Owner registration exists.
- Required payment/activation is not completed.

Access:

- Owner dashboard: No full access.
- Payment/activation flow: Allowed.

Transition:

```text
PENDING -> ACTIVE
```

after successful backend-verified payment and subscription activation.

---

## ACTIVE

Meaning:

- Shop has a valid subscription.
- Owner is allowed to use the dashboard.

Access:

- Owner dashboard: Yes.
- Product management: Yes.
- Order management: Yes.
- Business settings: Yes.

Possible transitions:

```text
ACTIVE -> INACTIVE
ACTIVE -> SUSPENDED
```

---

## INACTIVE

Meaning:

- Subscription period ended.
- Owner did not renew for the next period.
- This is a normal subscription state, NOT a disciplinary state.

Access:

- Owner dashboard: Blocked/restricted.
- Renewal page: Allowed.
- Payment renewal: Allowed.

The owner should see a clear message such as:

> Your subscription has expired. Renew your subscription to continue using your owner dashboard.

Possible transition:

```text
INACTIVE -> ACTIVE
```

after successful renewal and backend payment verification.

Important:

**A shop becoming INACTIVE does not automatically mean that the shop has been banned or suspended.**

The exact customer storefront behavior after expiry must be configurable. The initial business rule is that the customer's public storefront may remain visible unless the business explicitly requires it to be hidden.

---

## SUSPENDED

Meaning:

- Admin deliberately suspended the shop.
- Possible reasons:
  - Policy violation.
  - Platform rules violation.
  - Owner requested service suspension/termination.
  - Administrative/business decision.

Access:

- Owner dashboard: Blocked.
- Renewal flow: Normally blocked until admin resolves the suspension.
- Customer storefront: Configurable based on suspension reason.

The system should display:

> Your shop has been suspended. Please contact support.

Possible transition:

```text
SUSPENDED -> ACTIVE
```

only through an authorized admin action after the issue is resolved.

---

# 7. Registration Flow

```text
Owner opens Register
        |
        v
Enter owner information
        |
        v
Enter business information
        |
        v
Frontend validation
        |
        v
Backend validation
        |
        v
Create owner + shop
        |
        v
Shop = PENDING
        |
        v
Payment / subscription selection
        |
        v
Razorpay payment
        |
        v
Backend verifies payment
        |
        v
Subscription activated
        |
        v
Shop = ACTIVE
        |
        v
Owner can access dashboard
```

The frontend must never directly set `ACTIVE`.

---

# 8. Registration Fields

## Owner Information

- Full name
- Email
- Mobile number
- Password
- Confirm password

## Business Information

- Business name
- Business description
- Business phone
- Business email
- Address
- City
- State
- Pincode
- Business category
- Logo
- Cover image

## System Information

- Registration date/time
- Current shop status
- Subscription ID
- Subscription start date
- Subscription expiry date
- Created timestamp
- Updated timestamp

---

# 9. Registration Security

Frontend validation:

- Required fields.
- Valid email.
- Password strength.
- Password confirmation.
- Mobile validation.

Backend validation:

- Required fields.
- Email uniqueness.
- Mobile validation.
- Password strength.
- Duplicate business checks where required.
- Business rules.
- Role assignment.

The backend must be authoritative.

Never trust the frontend alone.

---

# 10. Password Security

Passwords must never be stored in plain text.

Use a secure password hashing algorithm supported by Spring Security, such as BCrypt or Argon2.

Database example:

```text
password_hash
-----------------------------
$2a$10$.....................
```

Never store:

```text
password = MyPassword123
```

---

# 11. Login Flow

```text
Owner opens Login
       |
       v
Email + Password
       |
       v
POST /api/auth/login
       |
       v
Spring Security
       |
       v
Find user
       |
       v
Verify password hash
       |
       v
Check user status
       |
       v
Check shop status
       |
       +------ ACTIVE ------> Generate authentication
       |
       +------ INACTIVE ----> Renewal page
       |
       +------ SUSPENDED ---> Support / suspension page
       |
       +------ PENDING -----> Complete activation/payment
```

Login must not simply check whether an email/password pair exists.

It must also enforce account and shop status rules.

---

# 12. JWT Authentication

After successful authentication, the backend provides an authentication token/session mechanism.

The system will use JWT-based authentication for the initial architecture.

JWT should have:

- Short/controlled expiration.
- Secure signing secret/key.
- User identity.
- Role information where appropriate.

The backend must validate the JWT on protected requests.

JWT secrets must be stored in environment/deployment secrets.

Never commit JWT secrets to GitHub.

---

# 13. Role-Based Authorization

The following roles exist:

```text
ADMIN
SHOP_OWNER
CUSTOMER
```

Examples:

```text
ADMIN
  -> /api/admin/**

SHOP_OWNER
  -> /api/owner/**

CUSTOMER / PUBLIC
  -> customer storefront APIs where permitted
```

Authorization must be enforced on the backend.

A user must never gain access simply by changing a URL or request body.

---

# 14. Multi-Tenant Security

This is critical.

If:

```text
Owner A -> Shop A
Owner B -> Shop B
```

Owner A must never be able to access Shop B's:

- Products
- Orders
- Customers
- Payments
- Subscription
- Business settings

Every owner resource must be checked against the authenticated owner's shop.

Example:

```text
Authenticated User
       |
       v
Find owner shop
       |
       v
Request resource
       |
       v
Compare resource.shopId
with authenticated shopId
       |
   -------------
   |           |
 MATCH       NOT MATCH
   |           |
 Allow        Reject
```

Return `403 Forbidden` or an appropriate response when access is not allowed.

---

# 15. Subscription Flow

Example subscription cycle:

```text
Registration
    |
    v
Payment
    |
    v
Subscription ACTIVE
    |
    v
Subscription reaches expiry
    |
    v
Shop becomes INACTIVE
    |
    v
Owner renews
    |
    v
Payment verified
    |
    v
Subscription ACTIVE again
```

The subscription duration must be configurable.

Do not hardcode business assumptions such as exactly 30 days throughout the codebase.

---

# 16. Payment Flow

```text
Owner selects plan
       |
       v
Backend creates payment/order request
       |
       v
Razorpay checkout
       |
       v
Payment completed
       |
       v
Backend verifies payment
       |
       v
Payment record saved
       |
       v
Subscription activated
       |
       v
Shop status = ACTIVE
```

The frontend payment-success screen is NOT sufficient proof of payment.

The backend must verify the payment.

Production should support Razorpay webhooks for reliable payment-state synchronization.

---

# 17. Payment History

Every payment should have a permanent database record.

Suggested fields:

- id
- shop_id
- subscription_id
- provider
- provider_order_id
- provider_payment_id
- amount
- currency
- payment_status
- paid_at
- failure_reason
- created_at
- updated_at

Payment history should not be overwritten when a new payment occurs.

Each transaction is a separate record.

---

# 18. Subscription History

A separate subscription record/history should make it possible for the admin to answer:

- Which plan did the owner use?
- When did it start?
- When did it expire?
- When was it renewed?
- What amount was paid?
- What was the status?

The platform should retain historical subscription records rather than keeping only the latest subscription.

---

# 19. Owner Dashboard

After successful login and authorization, an ACTIVE owner enters the dashboard.

## Dashboard Overview

Cards:

- Total products
- Active products
- Total orders
- Pending orders
- Today's revenue
- Monthly revenue
- Subscription status
- Subscription expiry

## Navigation

```text
Dashboard
Products
Categories
Orders
Customers
Analytics
Subscription
Business Profile
Settings
Logout
```

---

# 20. Subscription Warning in Owner Dashboard

If the subscription is close to expiry, show a warning.

Example:

> Your subscription expires in 5 days. Renew now to avoid losing dashboard access.

If the shop becomes INACTIVE:

> Your subscription has expired. Renew to restore dashboard access.

If SUSPENDED:

> Your shop is currently suspended. Please contact support.

---

# 21. Product Management

Owner can:

- Add product.
- Edit product.
- Deactivate product.
- Delete product where allowed.
- Upload product image.
- Set price.
- Set category.
- Add description.
- Set availability.

Every product must belong to exactly one shop.

---

# 22. Customer Storefront

Customer-facing pages:

- Home
- Business information
- Product categories
- Product listing
- Product detail
- Search
- Cart
- Checkout
- Order confirmation
- Contact information

The storefront should be responsive for mobile devices.

---

# 23. Order Flow

```text
Customer
   |
   v
Browse Products
   |
   v
Add to Cart
   |
   v
Checkout
   |
   v
Create Order
   |
   v
Owner Dashboard
   |
   v
New
   |
   v
Preparing
   |
   v
Ready / Out for Delivery
   |
   v
Completed
```

Possible order statuses:

```text
PENDING
CONFIRMED
PREPARING
READY
OUT_FOR_DELIVERY
COMPLETED
CANCELLED
```

Exact statuses can be simplified for MVP.

---

# 24. Admin Dashboard

The admin panel is the platform control center.

## Overview Cards

- Total shops
- Active shops
- Inactive shops
- Suspended shops
- Pending registrations
- Today's registrations
- Active subscriptions
- Expired subscriptions
- Today's payments
- Monthly revenue

---

# 25. Admin Shop Table

Columns:

- Shop name
- Owner name
- Email
- Mobile
- Registration date/time
- Shop status
- Subscription status
- Subscription expiry
- Total products
- Total orders
- Actions

Status badges must clearly distinguish:

```text
PENDING
ACTIVE
INACTIVE
SUSPENDED
```

Do not use the same label for subscription expiry and administrative suspension.

---

# 26. Admin Shop Details

Clicking a shop opens a detailed page.

Sections:

## Overview

- Business information
- Owner information
- Current status
- Registration timestamp

## Subscription

- Current plan
- Start date
- Expiry date
- Current status
- Renewal history

## Payments

- Payment history
- Amount
- Payment provider ID
- Status
- Payment date

## Products

- Product count
- Active products
- Inactive products

## Orders

- Total orders
- Recent orders
- Order status summary

## Activity

Full timeline of important events.

---

# 27. Shop Activity Timeline

Example:

```text
23 Aug 2026 08:15 PM
Owner registered

23 Aug 2026 08:16 PM
Shop created

23 Aug 2026 08:20 PM
Payment initiated

23 Aug 2026 08:21 PM
Payment verified

23 Aug 2026 08:21 PM
Subscription activated

23 Aug 2026 08:22 PM
Shop status changed to ACTIVE

23 Aug 2026 08:30 PM
First product created
```

Later:

```text
22 Sep 2026 11:59 PM
Subscription expired

23 Sep 2026 12:00 AM
Shop status changed to INACTIVE
```

If admin suspends:

```text
24 Sep 2026 10:15 AM
Admin suspended shop
Reason: Policy violation
```

Activity records should be append-only where possible.

---

# 28. Admin Actions

Allowed actions depend on status.

Examples:

### PENDING
- View
- View payment/activation state

### ACTIVE
- View
- Suspend

### INACTIVE
- View
- View renewal history
- Allow normal renewal flow
- Suspend if necessary

### SUSPENDED
- View
- Reactivate after authorized review

Admin actions should require confirmation for destructive or access-changing operations.

---

# 29. Database Model

Core tables:

```text
users
shops
product_categories
products
orders
order_items
subscriptions
payments
activity_logs
```

Optional later:

```text
plans
customers
notifications
coupons
reviews
```

---

# 30. Users Table

Suggested fields:

```text
id
full_name
email
mobile
password_hash
role
account_status
created_at
updated_at
```

Email should have a unique constraint.

Roles:

```text
ADMIN
SHOP_OWNER
CUSTOMER
```

Account status should be separate from shop status where appropriate.

This distinction is important because a user account and a shop subscription are not necessarily the same thing.

---

# 31. Shops Table

Suggested fields:

```text
id
owner_id
business_name
description
phone
email
address
city
state
pincode
logo_url
cover_image_url
status
created_at
updated_at
```

Status:

```text
PENDING
ACTIVE
INACTIVE
SUSPENDED
```

`owner_id` references the owner user.

---

# 32. Products Table

Suggested fields:

```text
id
shop_id
category_id
name
description
price
image_url
availability
status
created_at
updated_at
```

Every query made on behalf of a shop owner must enforce `shop_id` ownership.

---

# 33. Orders Table

Suggested fields:

```text
id
shop_id
customer_id
order_number
subtotal
delivery_charge
total_amount
payment_status
order_status
delivery_address
customer_phone
created_at
updated_at
```

---

# 34. Order Items Table

Suggested fields:

```text
id
order_id
product_id
product_name_snapshot
unit_price
quantity
total_price
```

Snapshots are important.

If a product changes from:

```text
Chocolate Cake = ₹650
```

to:

```text
Chocolate Cake = ₹750
```

an old order should still show the original purchased price.

---

# 35. Subscriptions Table

Suggested fields:

```text
id
shop_id
plan_id
start_date
expiry_date
amount
status
created_at
updated_at
```

Possible subscription statuses:

```text
PENDING
ACTIVE
EXPIRED
CANCELLED
```

Shop status and subscription status are related but should not be treated as the same field.

For example:

```text
Subscription = EXPIRED
Shop = INACTIVE
```

This makes the system clearer.

---

# 36. Payments Table

Suggested fields:

```text
id
shop_id
subscription_id
provider
provider_order_id
provider_payment_id
amount
currency
status
paid_at
failure_reason
created_at
updated_at
```

Never store raw card details.

---

# 37. Activity Logs Table

Suggested fields:

```text
id
actor_user_id
shop_id
action
entity_type
entity_id
metadata
created_at
```

Examples:

```text
SHOP_REGISTERED
PAYMENT_INITIATED
PAYMENT_COMPLETED
SUBSCRIPTION_ACTIVATED
SUBSCRIPTION_EXPIRED
SHOP_BECAME_INACTIVE
SHOP_SUSPENDED
SHOP_REACTIVATED
PRODUCT_CREATED
PRODUCT_UPDATED
ORDER_CREATED
ORDER_STATUS_CHANGED
```

---

# 38. Important Separation: Account vs Shop vs Subscription

Do not put every status into one `users.status` field.

The system has different concepts:

```text
User Account
    |
    +-- account status

Shop
    |
    +-- shop status

Subscription
    |
    +-- subscription status

Payment
    |
    +-- payment status
```

Example:

```text
User Account = ACTIVE
Shop = INACTIVE
Subscription = EXPIRED
```

This is valid.

The owner still exists as a user, but the shop's subscription has expired.

Another example:

```text
User Account = ACTIVE
Shop = SUSPENDED
Subscription = ACTIVE
```

This can happen if an administrator suspends the shop for a policy reason.

This separation is important for industry-level design.

---

# 39. API Authentication

Base path:

```text
/api
```

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

The exact token strategy should be finalized during implementation.

---

# 40. Owner APIs

```text
GET    /api/owner/profile
PUT    /api/owner/profile

GET    /api/owner/products
POST   /api/owner/products
GET    /api/owner/products/{id}
PUT    /api/owner/products/{id}
DELETE /api/owner/products/{id}

GET    /api/owner/orders
GET    /api/owner/orders/{id}
PUT    /api/owner/orders/{id}/status

GET    /api/owner/subscription
GET    /api/owner/payments
```

Inactive and suspended owners must not be able to use protected owner APIs normally.

---

# 41. Customer APIs

```text
GET  /api/shops/{shopId}
GET  /api/shops/{shopId}/products
GET  /api/shops/{shopId}/products/{id}

POST /api/shops/{shopId}/orders
GET  /api/orders/{orderNumber}
```

Only public information should be exposed.

Private owner/admin information must never be returned through public APIs.

---

# 42. Admin APIs

```text
GET /api/admin/dashboard

GET /api/admin/shops
GET /api/admin/shops/{id}
GET /api/admin/shops/{id}/payments
GET /api/admin/shops/{id}/subscriptions
GET /api/admin/shops/{id}/orders
GET /api/admin/shops/{id}/activity

PUT /api/admin/shops/{id}/suspend
PUT /api/admin/shops/{id}/reactivate
```

Admin APIs must require ADMIN authorization.

---

# 43. Inactive Logic

The system should automatically identify expired subscriptions.

Conceptually:

```text
Every relevant subscription:
    if expiry_date < current_time
       and subscription is not renewed
           subscription = EXPIRED
           shop = INACTIVE
```

This can be implemented using a scheduled backend job.

Do not rely only on someone opening the dashboard to update status.

The system should also be able to calculate effective access at request time.

---

# 44. Suspended Logic

Suspension is an explicit administrative action.

Example:

```text
Admin clicks Suspend
        |
        v
Confirmation dialog
        |
        v
Optional reason
        |
        v
Backend verifies ADMIN role
        |
        v
Shop status = SUSPENDED
        |
        v
Activity log created
```

The reason should be recorded.

Example:

```text
reason = "Policy violation"
```

or:

```text
reason = "Owner requested service suspension"
```

---

# 45. Reactivation Logic

If a shop is SUSPENDED, only authorized admin action should normally reactivate it.

Example:

```text
SUSPENDED
    |
    v
Admin reviews issue
    |
    v
Admin clicks Reactivate
    |
    v
Shop becomes ACTIVE only if
subscription/access requirements are satisfied
```

If the subscription has already expired, reactivation should not blindly make the shop active.

Instead:

```text
SUSPENDED + EXPIRED
       |
       v
Renew subscription
       |
       v
Admin/automatic rules
       |
       v
ACTIVE
```

Business rules should explicitly define this case before production.

---

# 46. Security Requirements

Mandatory:

- Password hashing.
- JWT validation.
- Role-based authorization.
- Backend ownership checks.
- HTTPS in production.
- Input validation.
- Database constraints.
- Rate limiting for sensitive endpoints.
- Secure headers.
- CORS configuration.
- Environment-based secrets.
- Payment verification.
- Audit logs.
- No sensitive secrets in source code.

---

# 47. Login Protection

The login system should consider:

- Invalid password attempts.
- Rate limiting.
- Account lockout or temporary throttling after repeated failures.
- Generic login error messages where appropriate.
- Password reset.
- Email verification if required.
- Session/token expiration.
- Logout/invalidation strategy.

Example error:

Do not reveal:

> This email exists but password is wrong.

Prefer a generic message such as:

> Invalid email or password.

This reduces account enumeration risk.

---

# 48. Password Reset

Future/production feature:

```text
Forgot Password
      |
      v
Enter Email
      |
      v
Send secure reset link
      |
      v
Reset Password
      |
      v
Invalidate old sessions/tokens where appropriate
```

Reset tokens must be short-lived and single-use.

---

# 49. Email Verification

Recommended for production:

```text
Register
   |
   v
Verification email
   |
   v
Verify email
   |
   v
Continue activation/payment
```

Whether email verification happens before or after payment should be finalized based on the desired business flow.

---

# 50. Image Upload

```text
Owner
  |
  v
Select image
  |
  v
Secure upload
  |
  v
Cloudinary
  |
  v
Image URL
  |
  v
Database
```

Database stores the URL, not the image binary.

---

# 51. Error Handling

Use consistent API responses.

Example:

```json
{
  "success": false,
  "message": "Your subscription has expired.",
  "code": "SHOP_INACTIVE"
}
```

Common HTTP codes:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

---

# 52. Testing Strategy

## Unit Tests

Test:

- Registration logic.
- Password validation.
- Subscription transitions.
- Shop status transitions.
- Authorization logic.
- Product ownership.

## Integration Tests

Test:

- Database interaction.
- Authentication.
- Protected APIs.
- Payment verification.
- Admin actions.

## Postman

Test:

- Register.
- Login.
- Invalid login.
- Product CRUD.
- Unauthorized access.
- Cross-shop access attempts.
- Subscription expiry.
- Admin suspend/reactivate.

---

# 53. Development Order

Do not generate the whole project blindly in one AI prompt.

Recommended sequence:

## Phase 1 — Foundation

- Git repository.
- Backend project.
- Frontend project.
- Environment configuration.
- Supabase connection.

## Phase 2 — Database

- Users.
- Shops.
- Categories.
- Products.
- Orders.
- Order items.
- Subscriptions.
- Payments.
- Activity logs.

## Phase 3 — Authentication

- Registration.
- Password hashing.
- Login.
- JWT.
- Roles.
- Authorization.
- Status checks.

## Phase 4 — Owner Dashboard

- Dashboard.
- Business profile.
- Product CRUD.
- Image upload.
- Orders.

## Phase 5 — Customer Storefront

- Product listing.
- Product detail.
- Search/filter.
- Cart.
- Checkout.
- Orders.

## Phase 6 — Subscription/Payment

- Razorpay.
- Payment verification.
- Webhooks.
- Subscription activation.
- Expiry processing.
- Renewal.

## Phase 7 — Admin

- Dashboard.
- Shops table.
- Shop detail page.
- Payment history.
- Subscription history.
- Activity timeline.
- Suspend/reactivate.

## Phase 8 — Testing

- Unit tests.
- Integration tests.
- Postman.
- Security testing.
- End-to-end testing.

## Phase 9 — Deployment

- Frontend.
- Backend.
- Supabase.
- Cloudinary.
- Razorpay production configuration.
- Domain/HTTPS.
- Monitoring.

---

# 54. MVP

MVP should include:

- Owner registration.
- Login.
- Password security.
- Shop status management.
- Subscription payment.
- Active/inactive logic.
- Owner dashboard.
- Product CRUD.
- Customer storefront.
- Cart.
- Order placement.
- Owner order management.
- Admin dashboard.
- Shop list.
- Shop details.
- Payment history.
- Subscription history.
- Activity timeline.
- Admin suspension/reactivation.

---

# 55. Features to Avoid in MVP

Do not initially build:

- Native mobile apps.
- Advanced AI recommendations.
- Complex loyalty program.
- Advanced coupon engine.
- Multi-language platform.
- Complex delivery routing.
- Real-time chat.
- Marketplace discovery.
- Advanced inventory forecasting.

Add these after the core platform is stable.

---

# 56. AI / Antigravity Development Rules

When using Antigravity or another coding AI:

1. It must read `PRD.md` before implementation.
2. It must inspect the existing code before changing files.
3. It must not rewrite working modules unnecessarily.
4. It must implement one feature/module at a time.
5. It must explain database changes before applying them.
6. It must explain API changes.
7. It must preserve existing security rules.
8. It must run/build/test after changes.
9. It must report build failures honestly.
10. It must never hardcode secrets.
11. It must never remove features without explicit approval.
12. It must maintain Flyway migrations.
13. It must keep DTOs, services, repositories and controllers separated.
14. It must enforce shop ownership on every owner resource.
15. It must update documentation when architecture changes.

---

# 57. Definition of Done

A feature is complete only when:

- Code compiles.
- Tests pass.
- Database migration runs.
- API works in Postman.
- Authorization works.
- Invalid input is handled.
- Frontend works with the API.
- Loading/error states work.
- Existing features remain functional.
- No secrets are committed.
- Documentation is updated.

---

# 58. Final End-to-End Business Flow

```text
                    ADMIN
                      |
                      v
               Admin Dashboard
                      |
             -------------------
             |        |        |
           Shops    Payments  Activity
                      |
                      v

OWNER REGISTRATION
       |
       v
Owner + Business Details
       |
       v
Shop = PENDING
       |
       v
Payment
       |
       v
Razorpay Verification
       |
       v
Subscription Activated
       |
       v
Shop = ACTIVE
       |
       v
Owner Dashboard
       |
       +---- Manage Business
       |
       +---- Manage Products
       |
       +---- Manage Orders
       |
       +---- Subscription
       |
       v

CUSTOMER STOREFRONT
       |
       v
Browse Products
       |
       v
Cart
       |
       v
Checkout
       |
       v
Order
       |
       v
Owner Receives Order

SUBSCRIPTION EXPIRY
       |
       v
Subscription = EXPIRED
       |
       v
Shop = INACTIVE
       |
       v
Owner Dashboard Restricted
       |
       v
Renewal Payment
       |
       v
Backend Verifies Payment
       |
       v
Subscription = ACTIVE
       |
       v
Shop = ACTIVE

ADMIN SUSPENSION
       |
       v
Admin Action
       |
       v
Shop = SUSPENDED
       |
       v
Owner Dashboard Blocked
       |
       v
Admin Review
       |
       v
Reactivate when appropriate
```

---

# 59. Key Business Rules — Final

1. A newly registered shop starts as `PENDING`.
2. A successful backend-verified subscription payment activates the shop.
3. A valid subscribed shop is `ACTIVE`.
4. When the subscription expires without renewal, the shop becomes `INACTIVE`.
5. `INACTIVE` means subscription expiry, not punishment.
6. `SUSPENDED` is an explicit administrative state.
7. Suspension must have an audit record and preferably a reason.
8. An inactive owner can access renewal/payment functionality but not the normal dashboard.
9. A suspended owner cannot normally access the dashboard until authorized reactivation.
10. The backend, not the frontend, decides whether access is allowed.
11. Subscription status and shop status are separate concepts.
12. User account status and shop status are separate concepts.
13. Payment history must be retained.
14. Subscription history must be retained.
15. Activity history must be retained for important events.
16. Every owner resource must be protected by shop ownership checks.
17. The frontend must not connect directly to PostgreSQL in this architecture.
18. Payment success shown by the frontend is not enough; the backend must verify payment.
19. Production payment processing should use webhooks in addition to direct verification.
20. Secrets must never be committed to source control.

---

# 60. Next Implementation Step

After this PRD is accepted, begin with the foundation:

1. Create Git repository.
2. Create `backend/` and `frontend/`.
3. Generate Spring Boot + Maven backend.
4. Add required dependencies.
5. Create Next.js frontend.
6. Configure Supabase PostgreSQL.
7. Configure environment variables.
8. Add Flyway.
9. Create the first migration.
10. Implement authentication and authorization.

**Do not begin with the entire project at once. Build, test and verify one module at a time.**
