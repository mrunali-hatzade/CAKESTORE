# CakeStore SaaS Platform — Platform Admin UI & Architecture Blueprint

**Document Version:** 1.0 (Phase 1 Baseline)  
**Date:** September 2026  
**Audience:** Frontend Engineers, Platform Architects  
**Design Authority:** Official Platform Admin Panel UI Reference (Deep Slate/Navy `#162232` Sidebar, High-Contrast Cards, Platform Revenue Charts, Recent Bakery Directory, and Approval Action Widgets).

---

## 1. Admin Application Architecture Tree

```text
Platform Admin Application (/admin)
│
├── Overview (/admin)
│   ├── Admin Top Header (Platform indicator, Super Admin Profile)
│   ├── Platform KPI Metric Cards (Total Shops, Total Owners, Total Orders, Total Revenue)
│   ├── Platform Revenue Trend Chart (Monthly / Quarterly trajectory)
│   ├── Recent Shops Moderation Table (Shop Name, City, Status Badge, Quick Actions)
│   └── Status Indicator Cards (Active Subscriptions, Expiring Soon, Pending Approvals, Broadcast Messages)
│
├── Bakery Management (/admin/shops)
│   ├── All Bakeries Directory (Search by Name, City, FSSAI, Owner)
│   ├── Status Filter Tabs (ALL, PENDING, ACTIVE, INACTIVE, SUSPENDED)
│   ├── Bakery Verification Inspector (/admin/shops/[id])
│   │   ├── Business Details & FSSAI Registration Check
│   │   ├── KYC Document Viewer (Uploaded license/ID files)
│   │   ├── Owner Contact & Location Verification
│   │   └── Direct Action Controls (Approve, Reject, Suspend, Reactivate)
│
├── Users (/admin/users)
│   ├── Platform User Directory (Customers, Shop Owners, Administrators)
│   ├── Role Assignment & Status Management
│   └── User Audit Log Linkage
│
├── Orders (/admin/orders)
│   ├── Platform-wide Orders Ledger (Aggregated across all bakeries)
│   ├── Order Search & Date Filters
│   └── High-value Order Auditing
│
├── Payments (/admin/payments)
│   ├── Transaction History (Subscription payments & customer order fees)
│   ├── Payment Provider Tracking (Razorpay order ID, payment ID, status)
│   └── Failed Payment Analysis
│
├── Subscriptions (/admin/subscriptions)
│   ├── Active Bakery Subscription Directory
│   ├── Expiration Radar (Bakeries nearing 30-day expiry)
│   └── Manual Subscription Extension Override
│
├── Plans & Pricing (/admin/plans)
│   ├── Active SaaS Pricing Plans Table
│   ├── Create / Edit Subscription Plan Modal
│   ├── Feature Entitlements Configurator
│   └── Plan Active / Inactive Status Toggle
│
├── Messages & Announcements (/admin/messages)
│   ├── Broadcast Announcement Composer
│   ├── Target Audience Selector (All Bakers, Pending Bakers, Inactive Bakers)
│   └── Dispatch History Log
│
├── Reports (/admin/reports)
│   ├── Monthly SaaS Platform Revenue Report
│   ├── Bakery Growth & Churn Metrics
│   └── Geographic City/District Concentration Breakdown
│
├── Activity Logs (/admin/activity)
│   ├── Security & Administrative Action Stream
│   ├── Actor ID, Action Type, Entity ID, and Timestamps
│   └── Audit Export
│
└── Settings (/admin/settings)
    ├── Platform Configuration (Platform Name, Support Email)
    ├── Payment Gateway Keys (Razorpay Key ID & Secret)
    └── Global Notification Channels
```

---

## 2. Section-by-Section Specifications

### 2.1 Overview
- **Purpose:** High-level platform health monitor displaying macro growth metrics, revenue velocity, pending approvals, and system health.
- **Route:** `/admin`
- **UI Components:** `AdminSidebar`, `AdminHeader`, `PlatformKpiCard`, `PlatformRevenueChart`, `RecentShopsTable`, `PlatformStatusBar`.
- **API Endpoint:** `GET /api/admin/dashboard/stats`.
- **Backend Controller:** `AdminDashboardController.java`.
- **Database Tables:** `shops`, `users`, `orders`, `payments`, `subscriptions`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY` (Backend endpoint 100% complete and verified; frontend UI pending).
- **Dependencies:** `AdminDashboardService`.

### 2.2 Bakery Management & Verification
- **Purpose:** Onboarding gate and compliance moderation for all bakeries on the SaaS platform. Review submitted documents, verify FSSAI accreditations, and control operational status.
- **Routes:** `/admin/shops`, `/admin/shops/[id]`.
- **UI Components:** `ShopDirectoryTable`, `StatusFilterTabs`, `ShopDetailsDrawer`, `DocumentPreviewModal`, `ApprovalActionToolbar`.
- **API Endpoints:**
  - `GET /api/admin/shops` (with status, search, and pagination)
  - `GET /api/admin/shops/{shopId}` (full profile and uploaded documents)
  - `PATCH /api/admin/shops/{shopId}/status` (sets status: `ACTIVE`, `INACTIVE`, `SUSPENDED`, `REJECTED`)
- **Backend Controller:** `AdminDashboardController.java`.
- **Database Tables:** `shops`, `business_documents`, `users`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `AdminDashboardService`, `ShopService`.

### 2.3 Users Management
- **Purpose:** Unified user administration for managing platform accounts, password resets, role promotions, and account statuses.
- **Route:** `/admin/users`.
- **UI Components:** `UserTable`, `RoleBadge`, `UserSearchInput`, `StatusToggle`.
- **API Endpoints:** `GET /api/admin/users` (or auth admin endpoints), `POST /api/auth/make-admin`.
- **Backend Controller:** `AuthController.java`, `AdminDashboardController.java`.
- **Database Tables:** `users`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `UserService`, `AuthService`.

### 2.4 Orders Supervision
- **Purpose:** Platform-wide oversight of consumer orders across all bakeries to identify fulfillment issues or fraud.
- **Route:** `/admin/orders`.
- **UI Components:** `GlobalOrdersTable`, `BakeryFilterDropdown`, `OrderStatusFilter`, `OrderSummaryModal`.
- **API Endpoints:** `GET /api/admin/orders` (aggregated query via OrderRepository).
- **Backend Controller:** `AdminDashboardController.java` / `OwnerOrderController.java`.
- **Database Tables:** `orders`, `order_items`, `shops`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `OrderService`.

### 2.5 Payments Ledger
- **Purpose:** Comprehensive financial audit trail of all payments (SaaS subscriptions and marketplace transactions).
- **Route:** `/admin/payments`.
- **UI Components:** `PaymentsTable`, `PaymentProviderBadge`, `TransactionSearch`, `ReceiptModal`.
- **API Endpoints:** `GET /api/admin/payments`.
- **Backend Controller:** `PaymentController.java` / `AdminDashboardController.java`.
- **Database Tables:** `payments`, `subscriptions`, `shops`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `PaymentService`.

### 2.6 Subscriptions Management
- **Purpose:** Track SaaS recurring revenue, monitor expiring bakery accounts, and manually manage subscriptions when necessary.
- **Route:** `/admin/subscriptions`.
- **UI Components:** `SubscriptionTable`, `ExpiryAlertBadge`, `RenewOverrideModal`.
- **API Endpoints:** `GET /api/admin/subscriptions`.
- **Backend Controller:** `AdminSubscriptionPlanController.java`.
- **Database Tables:** `subscriptions`, `subscription_plans`, `shops`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `SubscriptionService`.

### 2.7 Plans & Pricing Configuration
- **Purpose:** Configure SaaS tiers (e.g. ₹350/month Starter, Annual Pro), price points, validity periods, and marketing feature lists.
- **Route:** `/admin/plans`.
- **UI Components:** `PlanTable`, `CreatePlanModal`, `FeatureChecklistInput`, `ActiveToggle`.
- **API Endpoints:**
  - `GET /api/admin/plans`
  - `POST /api/admin/plans`
  - `PUT /api/admin/plans/{id}`
  - `PATCH /api/admin/plans/{id}/status`
- **Backend Controller:** `AdminSubscriptionPlanController.java`.
- **Database Tables:** `subscription_plans`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY` (Full CRUD backend verified).
- **Dependencies:** `SubscriptionService`.

### 2.8 Broadcast Messaging
- **Purpose:** Dispatch system notifications and announcements to all registered bakery owners or targeted status cohorts.
- **Route:** `/admin/messages`.
- **UI Components:** `MessageComposer`, `CohortSelector`, `SentMessagesHistory`.
- **API Endpoints:** `POST /api/admin/messages`.
- **Backend Controller:** `AdminMessageController.java`.
- **Database Tables:** `notifications`, `users`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `NotificationService`.

### 2.9 Reports & Analytics
- **Purpose:** Downloadable CSV/PDF operational reports on subscription billing, platform GMV, and geographic bakery distribution.
- **Route:** `/admin/reports`.
- **UI Components:** `ReportExportCard`, `DateRangeSelector`, `DownloadCsvButton`.
- **API Endpoints:** `GET /api/admin/reports`.
- **Backend Controller:** `AdminDashboardController.java`.
- **Database Tables:** All transactional tables.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `AdminDashboardService`.

### 2.10 Activity Logs
- **Purpose:** Immutable audit trail recording administrative decisions (who approved a bakery, changed a plan, or suspended an account).
- **Route:** `/admin/activity`.
- **UI Components:** `ActivityLogTable`, `ActionTypeBadge`, `TimestampFormatter`.
- **API Endpoints:** `GET /api/admin/activity-logs`.
- **Backend Controller:** `ActivityLoggerService.java`.
- **Database Tables:** `activity_logs`.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `ActivityLoggerService`.

### 2.11 Platform Settings
- **Purpose:** Global environment configurations (Razorpay credentials, platform contact details, automated reminders).
- **Route:** `/admin/settings`.
- **UI Components:** `SettingsForm`, `ApiKeyInput`, `SaveButton`.
- **API Endpoints:** `GET/PUT /api/admin/settings`.
- **Backend Controller:** `AdminDashboardController.java`.
- **Database Tables:** Platform config entities.
- **Role Permissions:** `ROLE_ADMIN`.
- **Current Status:** `BACKEND ONLY`.
- **Dependencies:** `AdminDashboardService`.
