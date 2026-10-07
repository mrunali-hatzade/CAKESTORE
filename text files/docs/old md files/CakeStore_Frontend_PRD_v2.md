# CakeStore SaaS --- Frontend PRD

**Version:** 2.0\
**Status:** Ready for implementation\
**Frontend:** Next.js + TypeScript + Tailwind CSS\
**Backend:** Existing Spring Boot 3.3.2 + Java 17 + PostgreSQL + JWT\
**Architecture:** Multi-tenant Cake/Bakery marketplace SaaS

------------------------------------------------------------------------

# 1. Product Vision

CakeStore is a multi-tenant SaaS platform where customers can discover
local bakeries/cake businesses, browse their products, and place guest
orders.

At the same time, every registered bakery gets its own professional
online storefront and dashboard to manage its business.

The frontend has three major experiences:

1.  **Customer Marketplace**
2.  **Individual Bakery Website / Storefront**
3.  **Owner & Admin Dashboards**

The existing backend is already implemented and tested. The frontend
must consume that backend instead of recreating business logic.

------------------------------------------------------------------------

# 2. Important Implementation Rules

## 2.1 Existing project state

There is currently **NO frontend folder**.

The previous frontend folder was deleted.

Therefore:

-   Create a new `frontend/` folder at the project root.
-   Do not assume any previous frontend files exist.
-   The existing `backend/` must remain intact.
-   The existing `api-tests/` files are the reference for tested API
    contracts.

Expected structure:

``` text
CAKE SAAs/
├── backend/              # Existing Spring Boot backend
├── api-tests/            # Existing API tests
├── frontend/             # NEW Next.js frontend
├── docker-compose.yml
├── PRD.md
└── CakeStore_Frontend_PRD.md
```

## 2.2 Before implementation

Inspect:

-   `backend/src`
-   Controllers
-   DTOs
-   Entities
-   Security configuration
-   Existing API endpoints
-   `api-tests/*.http`
-   Existing PRD files

Understand the real API contract before writing frontend API calls.

Do not invent endpoints.

## 2.3 File creation rule

Create the frontend cleanly from scratch, but keep the architecture
controlled.

-   Create files that are genuinely required.
-   Do not create duplicate files for the same purpose.
-   Do not create unnecessary abstractions.
-   Keep API communication centralized.
-   Keep reusable UI components reusable.
-   Do not modify backend code unless a real incompatibility is
    discovered.

------------------------------------------------------------------------

# 3. Technology Stack

Use:

-   Next.js
-   TypeScript
-   Tailwind CSS
-   React
-   Next.js App Router
-   REST API integration with existing Spring Boot backend
-   JWT authentication
-   WebSocket integration where required by backend
-   Responsive design
-   Accessible semantic HTML

Do not add a large UI library unless genuinely necessary.

------------------------------------------------------------------------

# 4. Overall Application Structure

``` text
                         CAKESTORE
                            |
             +--------------+--------------+
             |              |              |
          CUSTOMER         OWNER          ADMIN
             |              |              |
       Marketplace     Owner Dashboard   Admin Panel
             |
      Bakery Storefront
             |
       Product → Cart → Guest Checkout
```

CakeStore should feel like:

**A premium bakery marketplace + website platform + business management
SaaS.**

------------------------------------------------------------------------

# 5. Main Customer Experience

The customer should be able to use CakeStore without registration.

Flow:

``` text
Landing Page
     ↓
Choose Location
     ↓
Search / Explore Bakeries
     ↓
Open Bakery
     ↓
Browse Cakes
     ↓
Customize Cake
     ↓
Add to Cart
     ↓
Guest Checkout
     ↓
Choose Payment
     ↓
Place Order
     ↓
Order Confirmation
     ↓
Email Updates
```

No mandatory customer account should be introduced for MVP.

------------------------------------------------------------------------

# 6. Public Marketplace UI

This is the main CakeStore homepage.

## 6.1 Header

Design:

-   CakeStore logo
-   Location selector
-   Home
-   Explore Bakeries
-   How It Works
-   For Owners
-   Pricing
-   Contact Us
-   Search icon
-   Cart icon with item count
-   Login/Register
-   Register Bakery CTA

Desktop navigation should be clean and spacious.

Mobile should use a responsive menu.

------------------------------------------------------------------------

# 7. Marketplace Hero Section

Use the supplied UI reference image as the design direction.

The hero should contain:

### Left

Badge:

``` text
Find the best cakes from trusted bakers
```

Main heading:

``` text
Celebrate Every Moment
with the Perfect Cake
```

Supporting text:

``` text
Discover amazing home bakers and cake shops near you.
Order online for any occasion.
```

Search area:

``` text
[ Enter your location ]
[ Search cakes, flavors, occasions... ]
[ Search ]
```

### Right

Large premium cake image.

Use a high-quality cake visual with a soft warm background.

The design should look premium, modern and trustworthy.

------------------------------------------------------------------------

# 8. Trust / Benefits Section

Display benefits such as:

-   Trusted Bakeries
-   Fresh & Hygienic Cakes
-   On-Time Delivery
-   Secure Payments
-   Customer Support

Do not invent numerical claims.

If numbers are displayed, they must come from actual backend/platform
data.

------------------------------------------------------------------------

# 9. How CakeStore Works

Use four simple steps:

``` text
1. Choose a Bakery
2. Select Your Cake
3. Place Your Order
4. Get It Delivered / Collect It
```

Use attractive icons and minimal explanations.

------------------------------------------------------------------------

# 10. Location-Based Bakery Discovery

This is an important CakeStore feature.

Customers should be able to search for bakeries near them.

Examples:

``` text
Akurdi
Pune
Bhandara
Mumbai
```

Use the existing backend location/search APIs.

A bakery registered in Akurdi should be discoverable through the
marketplace when searching Akurdi/nearby supported location data.

Do not perform the actual tenant/location business logic only in
frontend.

Backend remains authoritative.

------------------------------------------------------------------------

# 11. Bakery Cards

Each bakery card can show:

-   Business logo
-   Cover image
-   Business name
-   Location
-   Distance if supported
-   Rating if supported
-   Review count if supported
-   Availability/open status if supported
-   Featured category
-   Preparation/delivery information if supported
-   View Bakery button

Example:

``` text
┌─────────────────────────┐
│       Bakery Image      │
├─────────────────────────┤
│ Sweet Delight           │
│ Akurdi, Pune            │
│ ★ 4.8   30–45 min       │
│ [Custom Cakes]          │
│                         │
│      View Bakery →      │
└─────────────────────────┘
```

Only display fields that actually exist in backend responses.

------------------------------------------------------------------------

# 12. Cake Categories

Create a category section.

Possible categories:

-   All Cakes
-   Birthday
-   Wedding
-   Anniversary
-   Chocolate
-   Photo Cakes
-   Eggless
-   Custom Cakes

Categories should become dynamic when backend category APIs support
them.

------------------------------------------------------------------------

# 13. Featured Cakes

Display attractive product cards.

Each card can contain:

-   Cake image
-   Cake name
-   Bakery name
-   Category
-   Price
-   Rating where available
-   Availability
-   View Details
-   Add to Cart where appropriate

Prices must come from backend.

Never trust frontend-submitted prices during checkout.

------------------------------------------------------------------------

# 14. Bakery Owner CTA

Near the lower part of marketplace:

``` text
Are You a Cake Baker?

Create your own online store with CakeStore.

✓ Your own website
✓ Manage orders
✓ Manage cakes
✓ Reach nearby customers
✓ Grow your business

[ Register Your Bakery ]
```

------------------------------------------------------------------------

# 15. Footer

Include:

### Customer

-   Explore Bakeries
-   Categories
-   How It Works
-   Contact

### Bakery Owners

-   Register Bakery
-   Pricing
-   Features
-   Owner Login

### Platform

-   About CakeStore
-   Privacy Policy
-   Terms
-   Contact Us

Only create legal pages if required by the project.

------------------------------------------------------------------------

# 16. Individual Bakery Website

Every active bakery should have its own storefront.

Concept:

``` text
sweetdelight.cakestore.com
```

If wildcard subdomain routing is not configured initially, implement the
same concept using:

``` text
/shops/[slug]
```

The architecture should allow future subdomain mapping.

------------------------------------------------------------------------

# 17. Bakery Storefront Design

The bakery storefront should feel like the bakery's own website while
remaining part of CakeStore.

Sections:

``` text
Header
Hero
About / Our Story
Featured Cakes
Categories
All Cakes
Gallery
Offers
Reviews
Custom Cake Request
Business Hours
Location
Contact
Footer
```

Only display sections where data exists.

------------------------------------------------------------------------

# 18. Bakery Branding

Owner-managed data may include:

-   Logo
-   Cover image
-   Business name
-   Description
-   Our Story
-   Gallery
-   Contact information
-   Address
-   Business hours
-   Social links
-   Featured products

The storefront should use a controlled customization system.

Do not allow arbitrary CSS/HTML injection from owners.

------------------------------------------------------------------------

# 19. Product Details

Product detail page/modal should support backend capabilities:

-   Product image
-   Product name
-   Description
-   Base price
-   Variants
-   Add-ons
-   Dietary preferences
-   Quantity
-   Special instructions
-   Availability

Example:

``` text
Chocolate Truffle Cake

1 kg        ₹800
2 kg        ₹1400

Add-ons:
☐ Candles
☐ Birthday Topper

Diet:
○ Regular
○ Eggless

Quantity: [-] 1 [+]

[ Add to Cart ]
```

Actual options and prices must come from backend.

------------------------------------------------------------------------

# 20. Cart

Cart must show:

-   Product
-   Bakery
-   Variant
-   Add-ons
-   Quantity
-   Price
-   Subtotal
-   Coupon
-   Total

Actions:

-   Increase quantity
-   Decrease quantity
-   Remove
-   Continue shopping
-   Checkout

The backend must calculate/validate the final order amount.

------------------------------------------------------------------------

# 21. Guest Checkout

No customer account required.

Collect:

-   Full name
-   Mobile number
-   Email
-   Delivery address
-   Delivery/pickup choice where supported
-   Delivery slot where supported
-   Special instructions
-   Payment method

Payment options:

``` text
Online Payment
COD
```

Only show payment methods enabled by the backend/shop.

Do not implement delivery tracking in this phase.

------------------------------------------------------------------------

# 22. Customer Data Validation

Frontend should provide immediate validation for:

-   Required fields
-   Email format
-   Mobile format
-   Address
-   Payment method

Backend remains responsible for final validation.

If backend rejects an email/mobile as invalid, unavailable or
unacceptable, show a clear message and allow the customer to correct it.

Do not falsely claim an email is registered based only on frontend
validation.

------------------------------------------------------------------------

# 23. Order Confirmation

After successful order:

``` text
Order Placed Successfully 🎉

Order #12345

Thank you for ordering from Sweet Delight.

Payment: Online / COD
Total: ₹1,250

A confirmation/update will be sent to your email.
```

Use actual backend response values.

------------------------------------------------------------------------

# 24. Real-Time Owner Notifications

When a new customer order arrives, owner dashboard should update
immediately using WebSocket/backend-supported real-time mechanism.

Example:

``` text
Orders (1)
```

If two unseen orders exist:

``` text
Orders (2)
```

When the owner opens/marks orders as seen, the count should update.

Do not use fake polling if WebSocket support already exists.

------------------------------------------------------------------------

# 25. Other Notification Counts

The same notification pattern should work for:

-   Orders
-   Enquiries
-   Feedback
-   Custom order requests
-   Other owner notifications
-   Platform/admin messages

Example:

``` text
Enquiries (2)
Reviews (1)
Messages (3)
```

------------------------------------------------------------------------

# 26. Feedback System

Customer can submit feedback.

After successful submission:

-   Show immediate success state.
-   Update public feedback/review UI when backend allows it.
-   Send request to backend.
-   Backend handles email notification.

Owner can, according to backend permissions:

-   View feedback
-   Reply
-   Delete feedback

Do not simulate backend operations in UI.

------------------------------------------------------------------------

# 27. Contact Us

Contact form should support:

-   Name
-   Email
-   Mobile where required
-   Message

After successful submission:

``` text
Thank you!
Your message has been submitted successfully.
```

Backend should handle notification/email delivery.

------------------------------------------------------------------------

# 28. Custom Cake Enquiry

Customer can submit a custom cake request.

Possible fields:

-   Name
-   Email
-   Mobile
-   Occasion
-   Cake description
-   Quantity
-   Preferred date
-   Budget
-   Reference image where supported
-   Additional instructions

Owner receives the enquiry in dashboard.

------------------------------------------------------------------------

# 29. Owner Dashboard

Owner navigation:

``` text
Dashboard
Orders
Products
Categories
Website
Customers
Enquiries
Reviews
Offers
Analytics
Subscription
Settings
```

The owner must only access their own shop's data.

------------------------------------------------------------------------

# 30. Owner Dashboard Overview

Show backend-driven:

-   Total orders
-   New orders
-   Active orders
-   Revenue
-   Customers
-   Products
-   Recent orders
-   Top-selling products
-   Sales trends

Use charts only where meaningful data exists.

Never hardcode dashboard numbers.

------------------------------------------------------------------------

# 31. Owner Order Management

Owner can:

-   View orders
-   Search orders
-   Filter orders
-   Open order details
-   View customer name
-   View customer details
-   View ordered cakes
-   View variants
-   View add-ons
-   View quantity
-   View total
-   View payment method
-   View payment status
-   Update order status according to backend rules

------------------------------------------------------------------------

# 32. Customer Detail View for Owner

Clicking a customer/order customer name should open details.

Show information available from backend:

-   Customer name
-   Email
-   Mobile
-   Address where appropriate
-   Current order
-   Previous orders
-   Ordered products
-   Payment method/status

Never show card numbers, CVV, passwords or payment credentials.

------------------------------------------------------------------------

# 33. Owner Product Management

Owner has CRUD controls for their own products.

``` text
Products

[ + Add Product ]

Cake A     [Edit] [Delete]
Cake B     [Edit] [Delete]
Cake C     [Edit] [Delete]
```

Support where backend permits:

-   Add
-   Edit
-   Delete
-   Update price
-   Availability
-   Images
-   Categories
-   Variants
-   Add-ons

------------------------------------------------------------------------

# 34. Owner Website Management

Owner can manage their bakery storefront:

-   Logo
-   Cover image
-   Description
-   Our Story
-   Gallery
-   Contact information
-   Address
-   Business hours
-   Social links
-   Featured products
-   Offers

Provide:

``` text
[ Save Changes ]
[ Preview Website ]
[ View Store ]
```

------------------------------------------------------------------------

# 35. Owner Address Management

Business address is required during business registration.

Owner can later update the operating address.

Support two common cases:

### Physical bakery

``` text
Shop Address
Akurdi, Pune
```

### Home baker

``` text
Business operates from:
Home-based
Location: Akurdi, Pune
```

The backend should remain the source of truth for location/search.

------------------------------------------------------------------------

# 36. Owner Subscription

Owner dashboard should display:

-   Current plan
-   Price
-   Start date
-   Expiry date
-   Status
-   Renewal
-   Auto-renew status where supported
-   Payment history where available

Before expiry, show a clear renewal warning.

After expiry:

-   Backend blocks dashboard access.
-   Frontend displays a renewal page/message.
-   After successful renewal, refresh subscription state.
-   Dashboard becomes accessible when backend confirms active
    subscription.

Frontend must never be the only subscription security layer.

------------------------------------------------------------------------

# 37. Admin Dashboard

Admin navigation:

``` text
Overview
Shops
Users
Orders
Payments
Subscriptions
Plans & Pricing
Messages
Reports
Settings
```

Admin can, according to backend permissions:

-   View platform statistics
-   View shops
-   View users
-   View orders
-   View payments
-   Manage plans/pricing
-   Manage subscription settings
-   Suspend shops
-   Send platform messages
-   View reports

------------------------------------------------------------------------

# 38. Automated Business Registration

The registration UI should support the backend's automated verification
flow.

Business owner registration may require:

-   Owner name
-   Email
-   Mobile
-   Password
-   Business name
-   Business type
-   Business address
-   Operating location
-   Legal/business document details
-   Required document uploads
-   Other fields required by backend

The UI should clearly explain:

``` text
Your documents will be automatically verified.
If verification fails, you will be asked to upload valid documents.
```

Do not create an admin approval screen unless the backend requires one.

------------------------------------------------------------------------

# 39. Authentication

Implement:

### Owner

``` text
Register
Login
Logout
```

### Admin

``` text
Login
Logout
```

### Customer

No mandatory account for MVP.

JWT should be handled securely.

Frontend route protection must reflect backend roles:

``` text
ADMIN
SHOP_OWNER
```

Backend remains authoritative.

------------------------------------------------------------------------

# 40. API Architecture

Create one clean frontend API layer.

Example conceptual structure:

``` text
frontend/
├── app/
├── components/
├── lib/
│   ├── api/
│   ├── auth/
│   └── utils/
├── types/
├── hooks/
└── public/
```

Exact structure may be adjusted if a simpler architecture is better.

Do not create a separate service file for every tiny request without
reason.

Use environment configuration:

``` text
NEXT_PUBLIC_API_URL
```

Never expose:

-   Database passwords
-   JWT signing secrets
-   Private payment keys
-   Server credentials

------------------------------------------------------------------------

# 41. Multi-Tenant Security

Customer storefront:

``` text
slug → backend resolves shop
```

Owner dashboard:

``` text
JWT → backend resolves owner → owned shop
```

Never rely on frontend shop IDs for authorization.

Owner A must never be able to view or modify Owner B's data.

------------------------------------------------------------------------

# 42. Design Direction --- Approved Reference

The supplied marketplace image is the approved design direction.

The visual language should be:

-   Premium
-   Modern
-   Elegant
-   Warm
-   Clean
-   Trustworthy
-   Bakery-focused

Use:

-   Deep plum/wine
-   Warm cream
-   Soft blush
-   White cards
-   Subtle shadows
-   Rounded corners
-   Elegant headings
-   Clean sans-serif body text
-   High-quality cake imagery

Do not make the interface dark.

------------------------------------------------------------------------

# 43. Marketplace Visual Layout

The approved homepage structure:

``` text
┌──────────────────────────────────────────────┐
│ Logo | Location | Navigation | Search | Cart │
├──────────────────────────────────────────────┤
│                                              │
│  Badge                                       │
│  Celebrate Every Moment       🍰             │
│  with the Perfect Cake       CAKE VISUAL     │
│                                              │
│  [Location] [Search cakes...] [Search]       │
│                                              │
├──────────────────────────────────────────────┤
│ Trusted | Fresh | Secure | On-Time            │
├──────────────────────────────────────────────┤
│             How CakeStore Works              │
│  Bakery → Cake → Order → Delivery            │
├──────────────────────────────────────────────┤
│ Categories                                   │
│ [Birthday] [Chocolate] [Wedding] [Eggless]  │
├──────────────────────────────────────────────┤
│ Top Rated Bakeries                            │
│ [Card] [Card] [Card] [Card]                  │
├──────────────────────────────────────────────┤
│ Featured Cakes                               │
│ [Card] [Card] [Card] [Card]                  │
├──────────────────────────────────────────────┤
│       Are You a Cake Baker?                  │
│       [Register Your Bakery]                 │
├──────────────────────────────────────────────┤
│ Footer                                       │
└──────────────────────────────────────────────┘
```

This layout is approved for implementation.

------------------------------------------------------------------------

# 44. Responsive Design

Desktop:

-   Wide hero
-   Multi-column bakery cards
-   Full navigation
-   Dashboard sidebar

Tablet:

-   Reduced columns
-   Compact navigation

Mobile:

-   Hamburger navigation
-   Stacked hero
-   Horizontal/scrollable categories where appropriate
-   Single-column cards
-   Bottom/accessible cart action
-   Dashboard sidebar becomes mobile navigation

No horizontal overflow.

------------------------------------------------------------------------

# 45. Loading / Empty / Error States

Every API-driven component must handle:

-   Loading
-   Empty
-   401 Unauthorized
-   403 Forbidden
-   404 Not Found
-   409 Conflict where relevant
-   422/validation errors where relevant
-   500 server error
-   Network error
-   Expired subscription

Use friendly UI.

Never show Java/Spring stack traces to customers.

------------------------------------------------------------------------

# 46. Performance

Use:

-   Optimized images
-   Lazy loading
-   Debounced search
-   Pagination
-   Minimal unnecessary API calls
-   Appropriate caching

Do not aggressively cache:

-   Orders
-   Payments
-   Subscription state
-   Customer-sensitive information

------------------------------------------------------------------------

# 47. Accessibility

Use:

-   Semantic HTML
-   Accessible labels
-   Keyboard navigation
-   Focus states
-   Alt text
-   Good contrast
-   Correct form error handling
-   Proper buttons/links

------------------------------------------------------------------------

# 48. SEO

Public pages should support:

-   Page title
-   Meta description
-   Open Graph metadata
-   Bakery name
-   Location
-   Store description

Individual bakery pages should have dynamic metadata.

------------------------------------------------------------------------

# 49. Implementation Phases

## Phase 0 --- Project Setup

Create the new frontend.

-   Next.js
-   TypeScript
-   Tailwind
-   Routing foundation
-   Environment configuration
-   API layer foundation
-   Global design system

## Phase 1 --- Public Marketplace

Build:

-   Navbar
-   Hero
-   Search
-   Location
-   Trust section
-   How it works
-   Categories
-   Bakery discovery
-   Featured products
-   Owner CTA
-   Footer

Connect real backend APIs.

## Phase 2 --- Bakery Storefront

Build:

-   `/shops/[slug]`
-   Bakery hero
-   Story
-   Products
-   Categories
-   Gallery
-   Reviews
-   Contact
-   Custom cake enquiry
-   Location

## Phase 3 --- Product + Cart

Build:

-   Product details
-   Variants
-   Add-ons
-   Dietary options
-   Cart

## Phase 4 --- Guest Checkout

Build:

-   Customer information
-   Address
-   Delivery/pickup
-   Payment selection
-   Order creation
-   Confirmation

## Phase 5 --- Owner Authentication

Build:

-   Registration
-   Login
-   JWT handling
-   Protected routes
-   Subscription state handling

## Phase 6 --- Owner Dashboard

Build:

-   Dashboard
-   Orders
-   Products
-   Categories
-   Customers
-   Enquiries
-   Reviews
-   Website management

## Phase 7 --- Owner Business Tools

Build:

-   Offers
-   Analytics
-   Subscription
-   Settings
-   Address/location management

## Phase 8 --- Admin Panel

Build:

-   Overview
-   Shops
-   Users
-   Orders
-   Payments
-   Plans
-   Subscriptions
-   Messages
-   Reports

## Phase 9 --- Real-Time + Notifications

Integrate:

-   WebSocket order notifications
-   Unseen counts
-   Dashboard notifications
-   Platform messages

## Phase 10 --- Final QA

Test:

-   API integration
-   Authentication
-   Role access
-   Multi-tenancy
-   Responsive design
-   Error states
-   Build
-   Performance
-   Security
-   Production configuration

------------------------------------------------------------------------

# 50. Definition of Done

The frontend is complete only when:

-   It uses the existing backend APIs correctly.
-   No important functionality is fake.
-   Customer can browse bakeries.
-   Customer can open a bakery storefront.
-   Customer can customize products where supported.
-   Customer can guest checkout.
-   Owner can manage their own business.
-   Owner can manage products.
-   Owner can manage orders.
-   Owner receives new-order notifications.
-   Subscription access is enforced by backend.
-   Admin can manage platform-level functions allowed by backend.
-   Multi-tenant isolation is respected.
-   UI is responsive.
-   Loading/error/empty states exist.
-   TypeScript passes.
-   Lint passes if configured.
-   Production build passes.
-   No secrets are exposed.

------------------------------------------------------------------------

# 51. First Implementation Instruction

Do NOT implement the whole application in one step.

Start with:

## PHASE 0 + PHASE 1 ONLY

First:

1.  Inspect the existing backend and API tests.
2.  Create the new `frontend/` Next.js project.
3.  Configure Tailwind and TypeScript.
4.  Create the basic application architecture.
5.  Create the public CakeStore marketplace.
6.  Connect the marketplace to existing backend APIs.
7.  Run and test the application.
8.  Fix all errors.

Then STOP.

Do not start the bakery storefront, owner dashboard or admin dashboard
until Phase 1 is working correctly.

------------------------------------------------------------------------

# 52. Antigravity Reporting Requirement

After Phase 0 + Phase 1, report:

``` text
Frontend created:
-

Files created:
-

Files modified:
-

Backend APIs inspected:
-

Backend APIs connected:
-

Marketplace features completed:
-

Responsive status:
-

Errors found:
-

Errors fixed:
-

npm run build:
-

npm run lint:
-

Remaining backend/API limitations:
-
```

Do not continue automatically to the next phase.
