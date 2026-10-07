# Cake Business SaaS Platform — Product Requirements Document

**Version:** 1.0  
**Status:** Draft / Development Baseline  
**Prepared for:** Cake Business Website & Management Platform  
**Primary goal:** Build a multi-tenant platform where cake/business owners can register, pay for the service, receive access to their own storefront/dashboard, manage products and orders, while the platform administrator monitors businesses, registrations, subscriptions and payments.

---

## 1. Background

Many small home-based cake businesses currently manage products, prices, customer enquiries and orders through WhatsApp, Instagram DMs and phone calls. This creates manual work, poor order tracking, difficulty presenting products professionally, and limited visibility for the business owner.

The proposed platform solves this by giving each registered cake business its own professional online storefront and owner dashboard.

The platform will have three major user areas:

1. **Customer Frontend** — customers browse cakes/products, view details and place orders.
2. **Business Owner Dashboard** — the owner manages the storefront, products, orders and business information.
3. **Platform Admin Panel** — the platform owner monitors registered businesses, subscriptions, payments, activity and system-level information.

The platform will use a centralized backend and database. Each business will be logically isolated using a `shopId/businessId` relationship so that one owner cannot access another owner's data.

---

## 2. Product Vision

Create a reusable SaaS-style platform that can onboard multiple cake businesses rather than building a completely separate application for every business.

The long-term vision is to make the platform reusable for other local businesses such as bakeries, home food businesses, salons and similar service/product businesses.

---

## 3. Initial Technology Stack

### Frontend
- Next.js / React
- TypeScript
- Tailwind CSS
- Responsive design
- REST API integration using `fetch` or Axios

### Backend
- Java
- Spring Boot
- Maven
- Spring Web
- Spring Data JPA
- Hibernate
- Spring Security
- JWT authentication
- Bean Validation
- PostgreSQL driver

### Database
- Supabase PostgreSQL

### Database Migration
- Flyway

### Image Storage
- Cloudinary

### Payment
- Razorpay

### API Testing
- Postman

### Version Control
- Git + GitHub

### Deployment
- Frontend: Vercel
- Backend: production backend hosting compatible with Spring Boot
- Database: Supabase PostgreSQL
- Image storage: Cloudinary

---

## 4. Core Architecture

```text
Customer / Owner / Admin
          |
          v
     Next.js Frontend
          |
       REST API
          |
          v
     Spring Boot
          |
   -----------------
   |       |       |
 Security Business  Payment
   |       Logic    Integration
   |       |
   ---------
       |
     JPA /
   Hibernate
       |
       v
 Supabase PostgreSQL
```

External services:

```text
Spring Boot ---> Razorpay
Spring Boot ---> Cloudinary
Spring Boot ---> Supabase PostgreSQL
```

The browser should NOT directly connect to the PostgreSQL database for this architecture.

---

## 5. User Roles

### 5.1 PLATFORM_ADMIN

The platform owner/administrator.

Responsibilities:
- View all registered businesses.
- View registration date/time.
- View payment history.
- View subscription status.
- View subscription expiry.
- View business details.
- View order/activity summaries.
- Activate/suspend businesses where permitted.
- Monitor platform revenue.
- Manage platform-level settings.

### 5.2 SHOP_OWNER

The business owner.

Responsibilities:
- Register business.
- Complete required profile information.
- Make service/subscription payment.
- Log in.
- Manage business profile.
- Add/edit/delete products.
- Upload product images.
- Manage prices and availability.
- View and manage customer orders.
- View order history.
- View business-level reports.

### 5.3 CUSTOMER

The end customer.

Responsibilities:
- Visit a business storefront.
- Browse products.
- Search/filter products.
- View product details.
- Add products to cart.
- Provide delivery/pickup information.
- Place orders.
- View order confirmation.

Customer authentication may be optional in the MVP. Guest checkout can be supported initially.

---

## 6. Business Registration Flow

```text
Owner opens registration
        |
        v
Enter owner information
        |
        v
Enter business information
        |
        v
Validate form
        |
        v
Create registration record
        |
        v
Proceed to payment
        |
        v
Razorpay payment
        |
        v
Payment verification by backend
        |
        v
Activate subscription
        |
        v
Owner receives login/access
        |
        v
Owner enters dashboard
```

Important rule:

**Payment success must be verified by the backend. The frontend success page alone must never be treated as proof of payment.**

---

## 7. Registration Data

Suggested fields:

### Owner
- Full name
- Email
- Mobile number
- Password/authentication information

### Business
- Business name
- Business description
- Business phone
- Business email
- Address
- City
- State
- Pincode
- Logo
- Cover image
- Business category

### System
- Registration date/time
- Registration status
- Subscription status
- Subscription start date
- Subscription expiry date

---

## 8. Authentication

Authentication will be handled by Spring Security.

Expected flow:

```text
Login Form
   |
   v
POST /api/auth/login
   |
   v
Spring Security
   |
   v
Validate credentials
   |
   v
Generate JWT
   |
   v
Frontend receives authentication result
```

Protected APIs must reject unauthenticated requests.

Role-based authorization must be implemented.

Examples:

- ADMIN APIs → ADMIN only
- OWNER APIs → SHOP_OWNER
- Customer-facing product APIs → public where appropriate

---

## 9. JWT Security

JWT is used to represent an authenticated session.

The token should contain enough information to identify the authenticated user and authorization context.

The backend must validate the token on protected requests.

Do not:
- hardcode JWT secrets
- commit secrets to GitHub
- store passwords as plain text
- trust role information sent by the client without backend validation

Secrets should be stored using environment variables or secure deployment secrets.

---

## 10. Subscription System

The platform initially assumes a paid service/subscription model.

Example:

```text
Registration
     |
     v
Payment
     |
     v
Payment verification
     |
     v
Subscription activated
     |
     v
30-day access (configurable)
```

The exact subscription duration and price must remain configurable rather than hardcoded.

Subscription statuses:

- PENDING
- ACTIVE
- EXPIRED
- SUSPENDED
- CANCELLED

The system must store:
- Plan
- Amount
- Start date
- Expiry date
- Status
- Payment reference
- Created timestamp
- Updated timestamp

---

## 11. Payment Flow

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
Customer completes payment
       |
       v
Razorpay returns payment information
       |
       v
Backend verifies payment
       |
       v
Payment record updated
       |
       v
Subscription activated
```

The database should keep a permanent payment history.

Payment record should include:
- Internal payment ID
- Shop ID
- Subscription ID
- Razorpay order ID
- Razorpay payment ID
- Amount
- Currency
- Payment status
- Payment timestamp
- Failure reason if applicable

Webhook handling should be considered for reliable production payment state synchronization.

---

## 12. Customer Storefront

The customer frontend should include:

- Home page
- Business branding
- Product/category sections
- Product listing
- Product detail
- Search
- Filters/categories
- Cart
- Checkout
- Order confirmation
- Contact/business information

Optional future features:
- Customer accounts
- Wishlist
- Reviews
- Coupons
- Offers
- Delivery tracking
- WhatsApp order notifications

---

## 13. Owner Dashboard

The owner dashboard should contain:

### Dashboard Overview
- Total products
- Active products
- Total orders
- Pending orders
- Completed orders
- Revenue summary
- Subscription status
- Subscription expiry

### Product Management
- Add product
- Edit product
- Delete/deactivate product
- Upload image
- Set price
- Set category
- Set availability
- Add description

### Order Management
- New orders
- Accepted orders
- Preparing orders
- Ready orders
- Completed orders
- Cancelled orders

### Business Profile
- Business name
- Logo
- Cover image
- Description
- Contact details
- Address
- Opening hours

### Subscription
- Current plan
- Payment status
- Start date
- Expiry date
- Payment history

---

## 14. Admin Dashboard

The admin dashboard is a high-priority module.

### Dashboard cards

Display:

- Total registered shops
- Active shops
- Pending registrations
- Expired subscriptions
- Suspended shops
- Today's registrations
- Today's payments
- Monthly revenue

### Shops Management

Table columns:

- Shop name
- Owner name
- Email
- Mobile
- Registration date/time
- Subscription status
- Subscription expiry
- Total products
- Total orders
- Actions

### Shop Details Page

When admin opens one shop:

#### Overview
- Shop information
- Owner information
- Current status

#### Timeline
Example:

```text
23 Aug 2026  08:15 PM
Business registered

23 Aug 2026  08:20 PM
Payment completed

23 Aug 2026  08:21 PM
Subscription activated

23 Aug 2026  08:22 PM
Owner logged in
```

#### Payment History
- Date/time
- Amount
- Payment ID
- Status
- Plan

#### Subscription History
- Plan
- Start date
- End date
- Status

#### Products
- Product count
- Product list
- Active/inactive status

#### Orders
- Order count
- Recent orders
- Order status

---

## 15. Admin Actions

Possible actions:

- View shop
- Activate shop
- Suspend shop
- Reactivate shop
- Disable owner login
- View payment history
- View subscription history

Sensitive actions should require confirmation.

All important administrative actions should be logged.

---

## 16. Audit / Activity Log

The system should maintain an activity log for important events.

Examples:

- Owner registered
- Payment initiated
- Payment completed
- Payment failed
- Subscription activated
- Product created
- Product updated
- Product deleted
- Order created
- Order status changed
- Admin suspended shop
- Admin reactivated shop

Suggested fields:

- id
- actorUserId
- shopId
- action
- entityType
- entityId
- timestamp
- metadata

Do not store sensitive credentials or payment secrets in logs.

---

## 17. Database Design

Initial relational model:

```text
users
  |
  | 1-to-1 / 1-to-many
  v
shops
  |
  +---- products
  |
  +---- subscriptions
  |
  +---- payments
  |
  +---- orders
```

Potential tables:

1. users
2. shops
3. products
4. product_categories
5. orders
6. order_items
7. subscriptions
8. payments
9. activity_logs

---

## 18. Users Table

Suggested fields:

- id
- full_name
- email
- mobile
- password_hash
- role
- status
- created_at
- updated_at

Roles:
- ADMIN
- SHOP_OWNER
- CUSTOMER

Passwords must always be stored as secure hashes.

---

## 19. Shops Table

Suggested fields:

- id
- owner_id
- business_name
- description
- phone
- email
- address
- city
- state
- pincode
- logo_url
- cover_image_url
- status
- created_at
- updated_at

---

## 20. Products Table

Suggested fields:

- id
- shop_id
- category_id
- name
- description
- price
- image_url
- availability
- status
- created_at
- updated_at

The `shop_id` is critical for tenant isolation.

Every owner product query must be restricted to the authenticated owner's shop.

---

## 21. Orders and Order Items

Do not store only one product directly inside an order if multiple products can be purchased.

Recommended model:

```text
orders
  |
  +---- order_items
           |
           +---- product
```

Orders:

- id
- shop_id
- customer_id or guest information
- order_number
- subtotal
- delivery_charge
- total_amount
- payment_status
- order_status
- delivery_address
- customer_phone
- created_at
- updated_at

Order items:

- id
- order_id
- product_id
- product_name_snapshot
- unit_price
- quantity
- total_price

Product name and price snapshots are useful because a product may be edited after an order has been placed.

---

## 22. Subscription Table

Suggested fields:

- id
- shop_id
- plan_id
- start_date
- expiry_date
- amount
- status
- created_at
- updated_at

A separate `plans` table may be introduced when multiple plans are required.

---

## 23. Payments Table

Suggested fields:

- id
- shop_id
- subscription_id
- provider
- provider_order_id
- provider_payment_id
- amount
- currency
- status
- paid_at
- failure_reason
- created_at
- updated_at

Never store raw card information.

---

## 24. API Structure

Base path:

```text
/api
```

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Owner

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

### Customer

```text
GET  /api/shops/{shopId}
GET  /api/shops/{shopId}/products
GET  /api/shops/{shopId}/products/{id}

POST /api/shops/{shopId}/orders
GET  /api/orders/{orderNumber}
```

### Admin

```text
GET /api/admin/dashboard
GET /api/admin/shops
GET /api/admin/shops/{id}
GET /api/admin/shops/{id}/payments
GET /api/admin/shops/{id}/subscriptions
GET /api/admin/shops/{id}/orders
GET /api/admin/activity-logs

PUT /api/admin/shops/{id}/activate
PUT /api/admin/shops/{id}/suspend
```

These are initial endpoint definitions. Exact request/response DTOs should be finalized during implementation.

---

## 25. Backend Package Structure

Recommended Spring Boot structure:

```text
backend/
└── src/main/java/com/example/cakeplatform/
    ├── config/
    ├── security/
    ├── auth/
    │   ├── controller/
    │   ├── service/
    │   ├── dto/
    │   └── repository/
    ├── user/
    ├── shop/
    ├── product/
    ├── category/
    ├── order/
    ├── subscription/
    ├── payment/
    ├── admin/
    ├── audit/
    ├── common/
    │   ├── exception/
    │   ├── response/
    │   └── validation/
    └── CakePlatformApplication.java
```

Use a modular structure so features remain isolated.

---

## 26. Frontend Structure

Recommended high-level structure:

```text
frontend/
├── app/
│   ├── (customer)/
│   ├── owner/
│   ├── admin/
│   ├── login/
│   └── register/
├── components/
├── services/
│   ├── api/
│   └── auth/
├── hooks/
├── types/
├── utils/
└── public/
```

The customer, owner and admin areas should have clearly separated layouts and authorization rules.

---

## 27. API Communication

Frontend does not directly query PostgreSQL.

Correct:

```text
Frontend
   |
   | HTTP request
   v
Spring Boot API
   |
   | JPA/Hibernate
   v
PostgreSQL
```

Response:

```text
PostgreSQL
   |
   v
Spring Boot
   |
   | JSON
   v
Frontend
```

Example:

```json
{
  "id": 101,
  "name": "Chocolate Truffle Cake",
  "price": 650
}
```

---

## 28. JSON

JSON is the standard data representation for the REST API.

Frontend sends JSON:

```json
{
  "name": "Chocolate Cake",
  "price": 650,
  "categoryId": 2
}
```

Backend validates it, processes it, and returns JSON.

---

## 29. JPA / Hibernate

Spring Data JPA will be used for persistence.

Hibernate acts as the JPA implementation/ORM.

Conceptually:

```text
Java Entity
     |
     v
JPA
     |
     v
Hibernate
     |
     v
SQL
     |
     v
PostgreSQL
```

The application should not blindly rely on ORM-generated queries. Queries must be reviewed and optimized when necessary.

---

## 30. Supabase PostgreSQL Connection

Spring Boot connects to Supabase PostgreSQL using the PostgreSQL JDBC driver.

Environment-based configuration should be used.

Conceptual configuration:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USERNAME
DB_PASSWORD
```

Do not commit database credentials to GitHub.

The exact connection URL and SSL configuration should be taken from the Supabase project settings.

---

## 31. Flyway Database Migration

Database schema changes should be version controlled.

Example:

```text
V1__create_users.sql
V2__create_shops.sql
V3__create_products.sql
V4__create_orders.sql
V5__create_subscriptions.sql
V6__create_payments.sql
```

Do not manually modify production tables without recording the change through migration.

---

## 32. Validation

Backend validation is mandatory even if frontend validation exists.

Example:

Frontend:
- required field
- email format
- minimum password length

Backend:
- same validation
- authorization
- business rules
- duplicate checks
- ownership checks

Never trust frontend validation alone.

---

## 33. Multi-Tenant Security

This is one of the most important parts of the platform.

If Owner A belongs to Shop A, Owner A must never be able to request Shop B's products, orders or payments through a manipulated API request.

Bad:

```text
GET /api/products/123
```

without checking ownership.

Correct:

```text
Authenticated User
      |
      v
Find user's shop
      |
      v
Verify resource.shopId == user's shopId
      |
      v
Allow / Reject
```

Every owner-level resource access must perform authorization checks.

---

## 34. Subscription Access Rules

Owner dashboard access should depend on account and subscription status.

Example:

```text
ACTIVE
   -> Full owner access

EXPIRED
   -> Dashboard restricted
   -> Renewal screen available

SUSPENDED
   -> Dashboard blocked
   -> Contact/admin message

PENDING
   -> Payment/activation flow
```

Customer storefront availability after owner subscription expiry is a business decision and should be configurable.

---

## 35. Important Business Rule: Payment

Never activate a paid subscription based only on:

```text
Frontend says payment successful
```

Instead:

```text
Razorpay
   |
   v
Backend verification
   |
   v
Payment record
   |
   v
Subscription activation
```

Webhook support should be added for production reliability.

---

## 36. Image Upload Flow

```text
Owner selects image
       |
       v
Frontend
       |
       v
Backend / secure upload flow
       |
       v
Cloudinary
       |
       v
Image URL
       |
       v
Database stores URL
```

The database should not store large image binary files in the product table.

---

## 37. Error Handling

Backend should provide consistent API errors.

Example:

```json
{
  "success": false,
  "message": "Product not found",
  "timestamp": "2026-08-23T20:00:00"
}
```

Common HTTP status codes:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 500 Internal Server Error

---

## 38. Logging

Application logs should help developers diagnose problems.

Log:
- request correlation ID
- important business events
- errors
- exceptions
- payment processing events without sensitive payment data

Do not log:
- passwords
- JWT secrets
- database passwords
- card details
- sensitive authentication tokens

---

## 39. Testing Strategy

### Backend unit tests
Test services and business logic.

### Integration tests
Test:
- API
- database interaction
- security
- repository behavior

### API testing
Use Postman.

Test:
- success
- validation errors
- unauthorized requests
- forbidden requests
- duplicate records
- invalid IDs
- expired subscriptions

### Frontend testing
Test:
- forms
- navigation
- protected pages
- loading states
- error states
- responsive layouts

---

## 40. Development Order

Do not ask the AI tool to generate the entire production system in one shot.

Recommended sequence:

### Phase 1 — Foundation
- Repository
- Backend project
- Frontend project
- Environment configuration
- Database connection

### Phase 2 — Database
- Users
- Shops
- Categories
- Products
- Orders
- Subscriptions
- Payments
- Activity logs

### Phase 3 — Authentication
- Register
- Login
- JWT
- Roles
- Security

### Phase 4 — Owner
- Owner dashboard
- Business profile
- Product CRUD
- Image upload

### Phase 5 — Customer
- Storefront
- Product browsing
- Cart
- Checkout
- Order creation

### Phase 6 — Admin
- Dashboard
- Shop management
- Payment history
- Subscription history
- Activity timeline

### Phase 7 — Payment
- Razorpay
- Payment verification
- Webhooks
- Subscription activation

### Phase 8 — Testing
- Postman
- Unit tests
- Integration tests
- Security tests
- End-to-end tests

### Phase 9 — Deployment
- Frontend deployment
- Backend deployment
- Database production configuration
- Cloudinary
- Razorpay production credentials
- Domain/SSL
- Monitoring

---

## 41. MVP Scope

The first release should include:

- Owner registration
- Owner login
- Business profile
- Product management
- Customer storefront
- Product browsing
- Cart
- Order placement
- Owner order management
- Admin shop list
- Admin shop details
- Payment integration
- Subscription status
- Payment history
- Basic activity timeline
- Responsive UI

---

## 42. Features NOT Required for MVP

Keep these for later:

- Mobile app
- Advanced analytics
- AI recommendation engine
- Customer loyalty system
- Complex coupon engine
- Multi-language support
- Advanced delivery routing
- Multiple payment providers
- Marketplace-style vendor discovery
- Real-time chat
- Complex inventory management

Avoid adding these before the core system is stable.

---

## 43. Non-Functional Requirements

### Security
- JWT authentication
- Password hashing
- Role-based authorization
- Tenant isolation
- Environment secrets
- HTTPS in production
- Input validation

### Performance
- Pagination
- Database indexes
- Efficient queries
- Image optimization
- API response consistency

### Reliability
- Payment verification
- Database migrations
- Error handling
- Audit logs
- Backups through managed infrastructure

### Maintainability
- Modular backend
- DTOs
- Service layer
- Repository layer
- Clear naming
- API documentation
- Git version control

---

## 44. Suggested Backend Layering

```text
Controller
    |
    v
Service
    |
    v
Repository
    |
    v
Database
```

Example:

```text
ProductController
       |
       v
ProductService
       |
       v
ProductRepository
       |
       v
PostgreSQL
```

Controllers should not contain all business logic.

---

## 45. Suggested Request Flow

Example: Owner creates a product.

```text
Owner Dashboard
      |
      | POST /api/owner/products
      v
ProductController
      |
      v
Authentication + Authorization
      |
      v
ProductService
      |
      v
Validate shop ownership
      |
      v
ProductRepository
      |
      v
PostgreSQL
      |
      v
JSON response
      |
      v
Owner Dashboard
```

---

## 46. Admin Registration History

The admin must be able to answer:

- Who registered?
- Which business?
- When did they register?
- What is their current status?
- Did they pay?
- When did they pay?
- How much did they pay?
- Which plan did they purchase?
- When does it expire?
- What actions were performed afterward?

This is why registration, payment, subscription and activity records must be stored separately but linked.

---

## 47. Example Shop Timeline

```text
Registration
    |
    v
Payment Initiated
    |
    v
Payment Completed
    |
    v
Subscription Activated
    |
    v
Owner Login
    |
    v
Product Added
    |
    v
Customer Order
    |
    v
Order Completed
```

Each important event can be represented in the activity log.

---

## 48. Environment Variables

Example categories:

```text
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD

JWT_SECRET

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Use `.env`/deployment secret management.

Never commit production secrets.

---

## 49. Git Workflow

Recommended:

```text
main
  |
develop
  |
feature/auth
feature/products
feature/orders
feature/payment
feature/admin
```

Commit small logical changes.

Example:

```text
feat: add owner registration API
feat: add product CRUD
fix: validate shop ownership
feat: add admin shop details
```

---

## 50. Antigravity / AI Development Rules

Antigravity should NOT be asked to blindly rewrite the entire repository for every feature.

It should:

1. Read `PRD.md`.
2. Read existing architecture.
3. Inspect current files before changing them.
4. Identify dependencies.
5. Make one module at a time.
6. Preserve working features.
7. Run/build/test after changes.
8. Report files changed.
9. Report errors instead of hiding them.
10. Never expose or hardcode secrets.
11. Never remove working functionality without explicit instruction.
12. Follow the existing API/database conventions.

Before implementing a feature, the AI should explain:
- What files will change.
- What database changes are needed.
- What APIs are added/modified.
- What security implications exist.
- How the feature will be tested.

---

## 51. Definition of Done

A feature is not considered complete merely because code was generated.

A feature is complete when:

- Code compiles.
- Tests pass.
- API works in Postman.
- Database migration works.
- Authorization is verified.
- Invalid input is handled.
- Frontend is connected.
- Loading/error states work.
- No existing feature is broken.
- No secret is committed.
- Relevant documentation is updated.

---

## 52. Final End-to-End Flow

```text
                    PLATFORM ADMIN
                          |
                          v
                  Admin Dashboard
                          |
                 -----------------
                 |       |       |
                 Shops Payments Activity
                         |
                         v
OWNER REGISTRATION
       |
       v
Business Details
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
Owner Login
       |
       v
Owner Dashboard
       |
       +------> Manage Business
       |
       +------> Manage Products
       |
       +------> Manage Orders
       |
       +------> View Subscription
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
Create Order
       |
       v
Owner Receives Order
       |
       v
Order Processing
       |
       v
Completed
```

---

## 53. Success Criteria

The platform will be considered successful when a new cake business can:

1. Register.
2. Complete payment.
3. Receive an active subscription.
4. Log in securely.
5. Configure its business profile.
6. Add products and images.
7. Publish a customer storefront.
8. Receive customer orders.
9. Manage those orders.
10. View its subscription/payment information.

At the same time, the platform administrator must be able to:

1. See every registered business.
2. See registration date/time.
3. See payment history.
4. See subscription history.
5. See current status.
6. See activity timeline.
7. Manage business access.
8. Monitor overall platform activity.

---

## 54. Important Architectural Decisions

### YES
- Spring Boot
- Java
- Maven
- PostgreSQL
- Supabase PostgreSQL
- JPA/Hibernate
- Spring Security
- JWT
- REST APIs
- Flyway
- Cloudinary
- Razorpay
- Postman
- Git/GitHub
- Next.js/React frontend

### NO
- Direct frontend-to-PostgreSQL connection for this architecture
- Plain-text passwords
- Hardcoded production secrets
- Trusting frontend payment success without backend verification
- Owner access to another owner's data
- Storing large image binaries directly in normal product rows
- Generating the entire project blindly in one AI step

---

## 55. Next Implementation Step

After this PRD is accepted, implementation should begin with:

**Step 1:** Create Git repository and project folders.

**Step 2:** Generate Spring Boot backend with:
- Spring Web
- Spring Data JPA
- PostgreSQL Driver
- Spring Security
- Validation
- Flyway
- Lombok

**Step 3:** Create Next.js frontend.

**Step 4:** Configure Supabase PostgreSQL connection.

**Step 5:** Create the first Flyway migration for `users`.

**Step 6:** Build authentication.

Do not start Razorpay, Cloudinary or advanced admin analytics until the foundation, authentication and database are stable.
