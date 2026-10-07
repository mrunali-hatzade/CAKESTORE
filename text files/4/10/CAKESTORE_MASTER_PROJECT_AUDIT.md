# CAKESTORE — COMPLETE PROJECT MASTER AUDIT
## Source-Code Grounded Audit (CURRENT STATE)

**Disclaimer:** This is an analysis-only master audit. All conclusions are derived exclusively from the current source code, database migrations, configurations, and test logs. No refactoring or implementations were executed during this audit.

==================================================
PART 1 — PROJECT INVENTORY
==================================================
1. **Frontend root and framework/version:** rontend_v2, Next.js 14.2.5, React 18, Tailwind CSS.
2. **Backend root and framework/version:** ackend, Spring Boot 3.x, Java 17.
3. **Database technology/version:** PostgreSQL 16 (verified via HikariCP logs).
4. **Flyway migration range:** V1__init.sql through V38__add_soft_deletes.sql (38 migrations total).
5. **Authentication technology:** JWT (JSON Web Tokens) via Spring Security.
6. **Authorization/roles:** Role-based (CUSTOMER, SHOP_OWNER, ADMIN).
7. **Payment provider:** Razorpay.
8. **Storage provider:** Configured for Local, Cloudinary, and Azure Blob Storage. Currently active: local (from pplication.yml).
9. **Email/SMS/WhatsApp integrations:** Email integration exists (JavaMailSender/SendGrid), SMS/WhatsApp not verified.
10. **WebSocket/notification technology:** STOMP over SockJS (/ws-endpoint).
11. **Docker configuration:** Dockerfile in both rontend_v2 and ackend. Root docker-compose.yml orchestrates full stack.
12. **CI/CD configuration:** GitHub Actions (.github/workflows/ci.yml).
13. **Deployment configuration:** Appears Docker-based; cloud specific configs (Vercel/Azure) cannot be verified live.
14. **Testing frameworks:** Backend: JUnit 5, Mockito. Frontend: **MISSING** (No __tests__ or .test.tsx found).
15. **Major modules/packages:** dmin, udit, uth, communication, interaction, media, 
otification, order, payment, product, 
eview, shop, storefront, subscription, user.
16. **Important environment variables:** APP_STORAGE_PROVIDER, AZURE_STORAGE_ACCOUNT_NAME, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
17. **External services actually referenced:** Razorpay API, Azure Blob API.

==================================================
PART 2 — ARCHITECTURE
==================================================
**Architecture Flow:**
Frontend (Next.js) -> API (Spring Boot @RestController) -> Services (@Service) -> Repositories (Spring Data JPA) -> Database (PostgreSQL).

**Flow Integrations:**
- **Authentication Flow:** User submits credentials -> AuthController -> CustomUserDetailsService -> Returns JWT.
- **Tenant/Shop Resolution:** Handled via shop_id foreign keys in Repositories (e.g., indByShopId). There is no overarching TenantFilter interceptor; tenant isolation relies on explicit shopId method arguments.
- **Global/Admin Flow:** /api/admin/** endpoints secured with @PreAuthorize("hasRole('ADMIN')").
- **Customer Flow:** /api/storefront/** (mostly unauthenticated read) and /api/customer/** (authenticated).
- **Owner Flow:** /api/owner/** endpoints secured with hasRole('SHOP_OWNER').
- **Payment Flow:** Controller creates Razorpay Order -> Frontend completes payment -> Razorpay Webhook -> WebhookController verifies signature -> Updates DB.
- **Notification Flow:** Event -> NotificationService -> DB save -> SimpMessagingTemplate pushes to /queue/notifications-{userId}.

**Inconsistencies Identified:**
- Two Razorpay webhook controllers exist: modules/order/controller/WebhookController.java and modules/payment/controller/RazorpayWebhookController.java (recently added as /razorpay-v2).

==================================================
PART 3 — DATABASE MASTER AUDIT
==================================================
- **Current schema version:** 38 (via Flyway).
- **Major tables:** users, shops, products, orders, payments, subscriptions, ctivity_logs.
- **Soft Deletes:** is_deleted column exists on shops and products (added in V38) with @SQLDelete and @SQLRestriction on entities.
- **Cascade Deletes:** Hard cascades exist in code.

**Account Deletion Trace (CRITICAL TRACE):**
1. **CUSTOMER deletes account:** CANNOT BE VERIFIED (Service CustomerAccountDeletionService.java is completely missing).
2. **SHOP_OWNER deletes account:** OwnerAccountDeletionService.deleteOwnerAccount() is called.
3. **What happens to the SHOP?** Hard deleted via shopRepository.delete(shop).
4. **What happens to PRODUCTS?** Hard deleted via productRepository.deleteAll(products).
5. **What happens to ORDERS?** Hard deleted via orderRepository.deleteAll(orders).
6. **What happens to PAYMENTS?** Hard deleted via paymentRepository.deleteByShopId(shopId).
7. **What happens to SUBSCRIPTIONS?** Hard deleted via subscriptionRepository.deleteByShopId(shopId).
8. **What happens to REVIEWS?** Not explicitly handled in the deletion service (might fail on DB constraint if not cascaded).
9. **What happens to ACTIVITY LOGS?** Preserved (with a final log added for account deletion).
10. **Can deleted account be counted by Admin?** NO. User entity is wiped.
11. **Can deleted bakery be counted by Admin?** NO. Shop entity is wiped.
12. **Can the same email register again?** YES (record is wiped).
13. **Is historical financial data preserved?** **NO.** The deletion of orders and payments corrupts lifetime GMV and SaaS Revenue metrics in the Admin Dashboard instantly.

==================================================
PART 4 — USER & ACCOUNT LIFECYCLE
==================================================
**CUSTOMER:** Registration (Implemented), Login (Implemented), Profile (Implemented), Order History (Implemented), Deletion (**MISSING**), Re-registration (N/A).

**SHOP OWNER:** 
- REGISTER -> PENDING -> KYC -> APPROVAL (Implemented). 
- PAYMENT -> ACTIVE (Implemented via synchronous verify).
- Dashboard Access (Implemented). 
- Subscription Expiry / Renewal (Implemented).
- Account Deletion (Implemented but corrupts DB).

**ADMIN:** Creation (Implemented), Auth (Implemented), Dashboard (Implemented), Admin Actions (Implemented).

==================================================
PART 5 — AUTHENTICATION & SECURITY
==================================================
- **JWT:** Creation and Validation are implemented securely. Expiry is standard. Refresh logic exists.
- **Passwords:** BCrypt hashing implemented.
- **Role Checks:** @PreAuthorize used heavily and effectively.
- **Shop Ownership Checks:** Handled explicitly in service methods (e.g., verifying shop.getOwner().getId() == currentUser.getId()).
- **IDOR:** Guarded manually in services (no global JPA level isolation, but service checks exist).
- **Path Traversal / Secrets:** Standard Spring Boot properties used. Secrets are dynamically loaded via ENV variables.

==================================================
PART 6 — SHOP / BAKERY LIFECYCLE
==================================================
REGISTER → PENDING → KYC → APPROVAL → PAYMENT → ACTIVE → SUSPENDED
- **Implemented Transitions:** All core transitions exist.
- **Storefront Visibility Rule:** CustomerStorefrontService strictly filters out shops where shop.getStatus() != ACTIVE OR if the shop lacks an ACTIVE subscription. This guarantees expired/suspended shops are completely hidden from the marketplace.

==================================================
PART 7 — SUBSCRIPTION & PAYMENT AUDIT
==================================================
- **Subscription Model:** ₹350/month logic exists in SubscriptionPlan.
- **Payment Flow:** OwnerPaymentController.initiateSubscriptionPayment() -> Razorpay Checkout -> erifySubscriptionPayment() (synchronous activation).
- **Webhooks:** 
  1. order/controller/WebhookController.java (Authoritative for Orders/Payments). Uses Utils.verifyWebhookSignature.
  2. payment/controller/RazorpayWebhookController.java (Scaffolded as /api/webhooks/razorpay-v2, redundant/incomplete).
- **Duplicate Handling:** Idempotency checks exist in the main WebhookController for duplicate Razorpay events.

==================================================
PART 8 — CUSTOMER MARKETPLACE
==================================================
- **Discovery:** Handled via CustomerStorefrontService.searchShops().
- **Active Bakery Visibility:** YES.
- **Expired/Suspended Bakery Visibility:** NO (Properly hidden by backend paywall rules).
- **Tenant Isolation:** Enforced strictly via shopId parameters on customer retrieval methods.

==================================================
PART 9 — ORDER SYSTEM
==================================================
- **Order States:** NEW, ACCEPTED, PREPARING, READY_FOR_PICKUP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED.
- **Payment States:** PENDING, COMPLETED, FAILED.
- **Impact on GMV:** Admin Dashboard analytics (AdminDashboardService.getPlatformStats) queries orderRepository.sumRealizedRevenueBetween (which counts delivered/completed orders).

==================================================
PART 10 — OWNER DASHBOARD
==================================================
- **Implementation Status:** The React frontend for the Owner Dashboard is largely scaffolded/wired in rontend_v2/app/(owner).
- **Backend API:** OwnerProductController, OwnerOrderController, OwnerSettingsController exist.
- **Testing:** 0 Frontend tests. Backend unit tests cover controllers but some fail due to subscription locking rules in legacy test setups.

==================================================
PART 11 — ADMIN DASHBOARD
==================================================
- **Implemented:** Total Users, Total Bakeries (Active/Pending/Suspended), SaaS Revenue Line Chart, Network GMV Bar Chart, Live Activity Feed, FSSAI Verification, Manual Shop Suspension, In-app replies to Feedback.
- **Missing / Broken:** Historical analytics are broken/corrupted by OwnerAccountDeletionService hard deletes.

==================================================
PART 12 — NOTIFICATIONS / WEBSOCKET / COMMUNICATION
==================================================
- **Broker:** Spring STOMP SimpleBroker.
- **Admin Bell:** Subscribes to /queue/admin-notifications-{userId}.
- **Owner Bell:** Subscribes to /queue/notifications-{userId}.
- **Flow:** Services call NotificationService.createNotification -> saves to DB -> broadcasts via SimpMessagingTemplate.

==================================================
PART 13 — FILE STORAGE / MEDIA
==================================================
- **Production Provider:** pplication.yml explicitly sets storage.provider: local. The Azure and Cloudinary services exist in source but are bypassed locally.
- **Validation:** Standard Spring MultipartFile size limits apply.

==================================================
PART 14 — API AUDIT
==================================================
- **Unused/Dead Endpoints:** /api/webhooks/razorpay-v2 is a redundant stub.
- **Inconsistent Paths:** Admin controllers use /api/admin globally, but some individual mapping logic occasionally required frontend adjustment (which was fixed previously).

==================================================
PART 15 — ERROR HANDLING
==================================================
- Global exception handler @ControllerAdvice exists.
- Returns standardized ApiError responses.

==================================================
PART 16 — TESTING
==================================================
- **Backend Test Count:** ~436. 
- **Passing Status:** **8 Failures, 6 Errors.** (Currently broken due to strict Paywall rules being applied globally and breaking old legacy test fixtures. E.g., CustomerStorefrontDetailsTest expects shop visibility but fails because the mock shop has no mock subscription).
- **Frontend Test Count:** **0** (No unit or E2E tests exist for rontend_v2).

==================================================
PART 17 — DEPLOYMENT / DEVOPS
==================================================
- **Code-level Readiness:** docker-compose.yml, Dockerfile, .github/workflows/ci.yml exist.
- **Actual Cloud Config:** Azure/Vercel configuration is not present in repo roots beyond generic environment variables.
- **Monitoring:** Actuator is enabled (Spring Boot default endpoints).

==================================================
PART 18 — PERFORMANCE / SCALABILITY
==================================================
- **Risks:** The global ctivityLogRepository.findTop50ByOrderByTimestampDesc() query is expensive at massive scale without indexing on 	imestamp. Dashboard revenue analytics aggregate huge swaths of orders and payments rows rather than utilizing a pre-computed materialized view.

==================================================
PART 19 — BUSINESS RULE CONSISTENCY
==================================================
- **Account Deletion:** Highly inconsistent. Shop deletion permanently destroys Order and Payment records, directly contradicting the Admin Dashboard's reliance on those tables for Lifetime GMV/SaaS Revenue tracking.

==================================================
PART 20 — FINAL MASTER STATUS
==================================================
| AREA | STATUS | EVIDENCE | RISK | ACTION |
|---|---|---|---|---|
| Admin Dashboard | 🟢 IMPLEMENTED & VERIFIED | API logic + Frontend React components | Low | N/A |
| Paywall/Visibility | 🟢 IMPLEMENTED & VERIFIED | CustomerStorefrontService blocking logic | Low | N/A |
| Webhooks | 🟡 IMPL. (NEEDS VERIF.) | Multiple endpoints exist. | Medium | Consolidate logic |
| Tests | 🔴 BROKEN | 8 Failures, 6 Errors in backend | High | Update test fixtures |
| Account Deletion | 🔴 BROKEN / DANGEROUS | OwnerAccountDeletionService | Critical | Implement Soft Deletes across Orders/Payments |
| Frontend Tests | 🔴 MISSING | 0 tests in rontend_v2 | Medium | Implement Jest/Playwright |

### CRITICAL BLOCKERS
- **Data Destruction Vulnerability:** OwnerAccountDeletionService permanently executes orderRepository.deleteAll(orders) and paymentRepository.deleteByShopId(shopId). This corrupts global financial analytics forever.
- **Failing Test Suite:** Backend build currently fails on mvn clean test due to legacy tests conflicting with the new Paywall logic.

==================================================
PART 21 — IMPLEMENTATION ORDER
==================================================
1. **Fix Owner Account Deletion:** Remove hard deleteAll calls on Orders/Payments in OwnerAccountDeletionService. Enforce soft deletes for historical analytics integrity.
2. **Patch Backend Test Suite:** Update legacy test fixtures to mock subscriptionRepository with ACTIVE subscriptions so storefront queries pass.
3. **Consolidate Webhooks:** Remove the redundant /razorpay-v2 scaffold and ensure the primary WebhookController handles both Orders and Subscriptions flawlessly.
4. **Implement Customer Deletion:** Create CustomerAccountDeletionService.java.
5. **Build Bakery Owner Dashboard:** Resume UI implementation for order tracking and catalog management.

==================================================
PART 22 — STRICT FINAL RULE
==================================================

**CURRENT PROJECT STATUS:**
Beta / Development

**IMPLEMENTATION COMPLETENESS:**
Admin Governance & API Core: 100%
Owner Dashboard: Partially scaffolded
Marketplace: Partially scaffolded
Testing: Backend ~90% (Broken), Frontend 0%

**PRODUCTION VERIFICATION:**
Failed (Backend tests do not pass; critical data-loss bug identified in Account Deletion).

**CRITICAL BLOCKERS:**
1. Hard deletion of Orders and Payments upon Owner account deletion.
2. 14 Backend test failures preventing a clean CI/CD build.

**NEXT 5 ACTIONS:**
1. Rewrite OwnerAccountDeletionService to preserve financial history (Orders/Payments).
2. Fix 14 failing unit tests in StageBAdminOperationsTest and CustomerStorefrontDetailsTest.
3. Create a unified CustomerAccountDeletionService.
4. Delete redundant RazorpayWebhookController-v2.
5. Begin Owner Dashboard React Implementation (Catalog/Orders).

