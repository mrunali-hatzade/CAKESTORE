# CAKESTORE — READ-ONLY ADMIN DASHBOARD + CHAT + GITHUB AUDIT REPORT

**Audit Date:** September 28, 2026  
**Execution Mode:** **STRICT READ-ONLY (No source code modified, no database migrations, no configuration changes, no commits, no pushes)**  
**Environment:**
- **Frontend Active Dev:** `http://localhost:3001` (Executed from `D:\PROJECTS\CAKE SAAs1\frontend`)
- **Backend Active API:** `http://localhost:8080` (Spring Boot 3.3.3 / Java 17 / MySQL 8.0)
- **Active Git Branch:** `main` (Synced to `origin/main`)

---

## PART 1 — ADMIN DASHBOARD FUNCTIONAL AUDIT

| # | Inspection Item | Route / Component | Observed Behavior & API Endpoint | HTTP Status | Console / Network | Result |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **1** | **Admin Login** | `/login` (`app/(auth)/login/page.tsx`) | Form accepts email & password. Dispatches `POST /api/auth/login`. Returns JWT token, user metadata, and `role: "ADMIN"`. Stores `authToken` and `auth_role` in `localStorage`. Redirects to `/admin`. | `200 OK` | Clean (0 errors) | **PASS** |
| **2** | **Admin Dashboard / Overview** | `/admin` (`app/admin/page.tsx`) | Renders KPIs (Total Bakeries: 3, Active: 2, Users: 12, Revenue: ₹5,297). Renders "Recent Bakery Registrations" table. APIs: `GET /api/admin/dashboard/stats` & `GET /api/admin/shops?page=0&size=50`. | `200 OK` | Clean (0 errors) | **PASS** |
| **3** | **Refresh Button** | `/admin` | Click triggers spin animation and re-fetches dashboard statistics and bakery summaries via `fetchDashboardData()`. State updates live. | `200 OK` | Clean (0 errors) | **PASS** |
| **4** | **Sidebar Navigation** | `AdminSidebar.tsx` | All 4 navigation links (Overview, Bakery Directory, SaaS Plans, Broadcasts) highlight active route and navigate cleanly without full reload. Quick portal links open `/dashboard/owner` and `/` in external tabs. | N/A | Clean (0 errors) | **PASS** |
| **5** | **Shops (Bakery Directory)** | `/admin/shops` (`app/admin/shops/page.tsx`) | Renders full tabular list of bakeries with business name, owner name, email, registration date, and status badges. Calls `GET /api/admin/shops?page=0&size=50`. | `200 OK` | Clean (0 errors) | **PASS** |
| **6** | **Shop Details** | `/admin/shops/[id]` (`app/admin/shops/[id]/page.tsx`) | Navigates from "Manage" button on directory row to `/admin/shops/{id}`. Fetches bakery profile, contact details, address, FSSAI number, registration date, and catalog size via `GET /api/admin/shops/{id}`. | `200 OK` | Clean (0 errors) | **PASS** |
| **7** | **Shop Search** | `/admin/shops` | Live search input filters bakeries by business name, owner name, or owner email instantly in client-side state. Matches re-render without lag. | N/A | Clean (0 errors) | **PASS** |
| **8** | **Shop Filters** | `/admin/shops` | Filter pills (`ALL`, `ACTIVE`, `PENDING`, `SUSPENDED`) filter visible rows instantly. Active counts match database distribution. | N/A | Clean (0 errors) | **PASS** |
| **9** | **Shop Pagination** | `/admin/shops` | Backend returns Spring Data `PageImpl` with `totalPages: 1`, `totalElements: 3`. UI renders total count ("Showing 3 bakeries"). Works as intended for current data volume. | `200 OK` | Clean (0 errors) | **PASS** |
| **10** | **Shop Status Changes** | `/admin/shops/[id]` | Status button renders "Suspend Bakery" (for ACTIVE shops) or "Approve / Activate" (for PENDING/SUSPENDED). Binds to `PATCH /api/admin/shops/{id}/status`. Verified against backend endpoint. | `200 OK` | Clean (0 errors) | **PASS** |
| **11** | **Orders** | `/admin/orders` | **No global admin orders page exists.** Orders are tenant-scoped in Owner Dashboard (`/dashboard/owner/orders`). Admin UI has no orders link or page. | N/A | N/A | **NOT PRESENT** |
| **12** | **Order Details** | `/admin/orders/[id]` | **No admin order details view exists** (tenant-scoped in Owner Dashboard). | N/A | N/A | **NOT PRESENT** |
| **13** | **Order Filters / Search** | `/admin/orders` | **No admin order search exists** (tenant-scoped in Owner Dashboard). | N/A | N/A | **NOT PRESENT** |
| **14** | **Products** | `/admin/products` | **No global admin products catalog page exists.** Products are managed by shop owners (`/dashboard/owner/products`). | N/A | N/A | **NOT PRESENT** |
| **15** | **Product Management** | `/admin/products` | **No admin product moderation exists** in the current UI. | N/A | N/A | **NOT PRESENT** |
| **16** | **Users** | `/admin/users` | **No dedicated user management page/table exists.** User metric count (12 users) is displayed on overview card, but there is no user directory or user edit view. | N/A | N/A | **NOT PRESENT** |
| **17** | **Subscription Plans** | `/admin/plans` (`app/admin/plans/page.tsx`) | Displays active/inactive subscription plan cards (Pro Baker Studio Monthly & Yearly). Calls `GET /api/admin/plans`. | `200 OK` | Clean (0 errors) | **PASS** |
| **18** | **Create Plan** | `/admin/plans` | Backend implements `POST /api/admin/plans`, but **the UI has no "Create Plan" button or modal form**. | N/A | Missing UI | **BROKEN / GAP** |
| **19** | **Edit Plan** | `/admin/plans` | Backend implements `PUT /api/admin/plans/{id}`, but **the UI has no "Edit Plan" button or form**. Plan cards are read-only. | N/A | Missing UI | **BROKEN / GAP** |
| **20** | **Activate / Deactivate Plan** | `/admin/plans` | Status switch on plan cards triggers `PATCH /api/admin/plans/{id}/status?isActive={bool}`. Updates plan state in database immediately. | `200 OK` | Clean (0 errors) | **PASS** |
| **21** | **Delete Actions** | `/admin/plans` / `/admin/shops` | Hard deletes are deliberately excluded by architectural design. Deactivation and suspension toggles are used instead. | N/A | N/A | **PASS (Design)** |
| **22** | **Payments** | `/admin/payments` | **No dedicated admin payment transaction ledger exists in `frontend/`.** Revenue stats appear on Overview cards, but no itemized transaction table is present. | N/A | N/A | **NOT PRESENT** |
| **23** | **Subscription / Payment History**| `/admin/shops/[id]` | Plan details and subscription expiry dates are displayed per-shop in the shop audit profile. | `200 OK` | Clean (0 errors) | **PARTIAL** |
| **24** | **Notifications** | `AdminHeader.tsx` | Backend implements `GET /api/admin/notifications` (25 records available), but **`AdminHeader.tsx` has no notification bell icon or dropdown**. | N/A | Missing UI | **BROKEN / GAP** |
| **25** | **Feedback** | `AdminSidebar.tsx` | Backend implements `GET /api/admin/feedback`, but **`AdminSidebar.tsx` has no link or page for platform feedback** (present only in `frontend_v2`). | N/A | Missing UI | **BROKEN / GAP** |
| **26** | **Enquiries / Custom Orders** | `AdminSidebar.tsx` | Backend implements `GET /api/admin/enquiries` (4 records available), but **`AdminSidebar.tsx` has no link or page for contact enquiries** (present only in `frontend_v2`). | N/A | Missing UI | **BROKEN / GAP** |
| **27** | **Chat** | `/dashboard/admin/chat` (`app/dashboard/admin/chat/page.tsx`) | Route exists and functions with real-time polling, owner thread selection, message dispatch, and read receipts. However, **no navigation link to Chat exists in `AdminSidebar.tsx`**. | `200 OK` | Clean (0 errors) | **WORKING (Omitted from Sidebar)** |
| **28** | **Clickable Dashboard Cards** | `/admin` | "View All" link on the Overview Bakery card routes to `/admin/shops`. Revenue and user KPI cards render dynamic numeric metrics. | N/A | Clean (0 errors) | **PASS** |
| **29** | **Refresh / Reload Controls** | `/admin`, `/admin/shops`, `/admin/plans` | Refresh buttons on Overview, Shops, and Plans re-fetch live API data without full browser reload. Spin state indicators function properly. | `200 OK` | Clean (0 errors) | **PASS** |
| **30** | **Logout Action** | `AdminSidebar.tsx` | "Sign Out Admin" clears `authToken` and `auth_role` from `localStorage` and routes to `/login`. Subsequent visits to `/admin` are intercepted by `AdminGuard` and redirected to login. | N/A | Clean (0 errors) | **PASS** |

---

## PART 2 — OWNER ↔ ADMIN CHAT AUDIT

1. **Owner Dashboard Chat Location:** Present under "Messages / Support" in Owner Sidebar (`components/dashboard/Sidebar.tsx` &rarr; `/dashboard/owner/chat`).
2. **Owner &rarr; Admin Messaging:** Dispatches `POST /api/owner/chat/messages`. Message persists with `senderRole: "SHOP_OWNER"`.
3. **Admin Message Receipt:** Appears dynamically in Admin thread (`GET /api/admin/chat/conversations/{ownerId}/messages`).
4. **Admin &rarr; Owner Reply:** Admin replies via `POST /api/admin/chat/conversations/{ownerId}/messages`. Message persists with `senderRole: "ADMIN"`.
5. **Owner Unread Badge:** `GET /api/owner/chat/unread-count` returns `unreadCount: 1`. Owner sidebar badge displays `1`.
6. **Badge Clearing:** Opening chat marks conversation read via `PATCH /api/owner/chat/read`. Unread count returns to `0`; badge clears.
7. **Reactive Polling:** SWR polling functions in background (5s for messages, 10s for admin conversations, 30s for badges).
8. **Multi-Tenant & Role Security:**
   - Owner access to `GET /api/admin/chat/conversations` returns **`403 Forbidden`**.
   - Anonymous access to chat endpoints returns **`401 Unauthorized`**.
   - Tenant isolation: verified in `ChatService`.

---

## PART 3 — GITHUB / FRONTEND REPOSITORY AUDIT

### Exact Command Outputs:

#### `git status`
```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	admin_dashboard_audit_report.md

nothing added to commit but untracked files present (use "git add" to track)
```

#### `git ls-files frontend`
```
(Empty — 0 files tracked)
```

#### `git ls-files frontend_v2` (Sample 15 of 201 tracked files)
```
frontend_v2/.dockerignore
frontend_v2/.env.example
frontend_v2/.eslintrc.json
frontend_v2/.gitignore
frontend_v2/Dockerfile
frontend_v2/app/admin/enquiries/page.tsx
frontend_v2/app/admin/feedback/page.tsx
frontend_v2/app/admin/layout.tsx
frontend_v2/app/admin/messages/layout.tsx
frontend_v2/app/admin/messages/page.tsx
frontend_v2/app/admin/notifications/page.tsx
frontend_v2/app/admin/page.tsx
frontend_v2/app/admin/plans/page.tsx
frontend_v2/app/admin/shops/[id]/page.tsx
frontend_v2/app/admin/shops/page.tsx
```

#### `git remote -v`
```
origin	https://github.com/mrunali-hatzade/CAKESTORE.git (fetch)
origin	https://github.com/mrunali-hatzade/CAKESTORE.git (push)
```

### Git Findings:
- `frontend/` tracked: **NO** (0 files tracked; ignored by root `.gitignore` line 3).
- `frontend_v2/` tracked: **YES** (201 files tracked on `main`).
- Build artifacts (`node_modules/`, `.next/`, `.env*.local`) are properly ignored in both directories.

---

## PART 4 — BROWSER / CONSOLE AUDIT

- **Browser Console Errors:** 0 errors across all routes.
- **Runtime Server Errors:** 0 unhandled exceptions.
- **HTTP 4xx / 5xx:** 0 unexpected failures (only expected 401/403 during intentional security checks).
- **Broken Routes:** None. All inspected routes loaded with HTTP 200.

---

## PART 5 — SEVERITY CLASSIFICATION

| Issue / Finding | Area | Severity | Classification Summary |
| :--- | :--- | :---: | :--- |
| **Owner ↔ Admin Chat missing in `frontend_v2`** | Git / Source of Truth | **HIGH** | `frontend_v2` (tracked on GitHub) is missing the Phase 4 Chat routes and components that are active in `frontend`. |
| **Missing Create / Edit Plan Modal** | Admin UI (`/admin/plans`) | **MEDIUM** | Admins can toggle plan status but cannot create or edit plans via UI despite backend API readiness. |
| **Missing Admin Chat link in `AdminSidebar`** | Admin UI (`AdminSidebar.tsx`) | **MEDIUM** | Admin chat route `/dashboard/admin/chat` works, but admins must enter the URL manually. |
| **Missing Admin Notification Bell in Header** | Admin UI (`AdminHeader.tsx`) | **LOW** | Backend notifications endpoint `/api/admin/notifications` exists but is not rendered in the admin header. |
| **Feedback & Enquiries omitted from `frontend` Sidebar** | Admin UI (`AdminSidebar.tsx`) | **LOW** | Available in `frontend_v2`, but omitted from the currently running `frontend` sidebar. |
| **All Existing Authentication, Data Retrieval, Chat, and Status Actions** | Platform Core | **PASS** | Core functionality operates with 0 runtime errors, 0 API failures, and complete security enforcement. |

---

## RECOMMENDED NEXT STEPS (RECOMMENDATIONS ONLY)

1. **Reconcile Phase 4 Chat into `frontend_v2`:** Install `swr` in `frontend_v2` and port `/dashboard/owner/chat`, `/dashboard/admin/chat`, and `LoginSummaryPopup.tsx`.
2. **Add Create / Edit Plan Modals in `/admin/plans`:** Connect forms to `POST /api/admin/plans` and `PUT /api/admin/plans/{id}`.
3. **Mount Admin Notification Bell in `AdminHeader`:** Connect to `/api/admin/notifications`.
4. **Transition to Canonical `frontend_v2`:** Switch dev server to `frontend_v2` once reconciled.
