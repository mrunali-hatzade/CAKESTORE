# CakeStore Day 3: Admin Platform Management & Governance

## Phase 1: Objective Completion

### Comprehensive Metrics Implementation
The platform dashboard now queries comprehensive totals for all lifecycle entities, bypassing date filters to retain truth for snapshot stats:

1. **Users and Accounts:**
    * `totalUsers`, `totalAdmins`, `totalShopOwners`, `totalCustomers`.
    * Tracked softly deleted users via `deletedAccounts` native query.

2. **Bakery Lifecycle Statuses:**
    * Comprehensive enumeration: `ACTIVE`, `PENDING`, `SUSPENDED`, `INACTIVE`, `EXPIRED`.
    * Implemented native counting logic (`deletedBakeries`) to track historically deleted accounts without triggering JPA `@SQLRestriction` omission.

3. **Subscription Lifecycle Verification:**
    * Evaluates `ACTIVE`, `EXPIRING_SOON`, `GRACE_PERIOD`, `PENDING`, `EXPIRED`, `SUSPENDED`, `CANCELLED`.
    * Utilized `countUniqueShopsByStatusExcludingActive` to ensure a shop that has both a pending and active subscription is correctly interpreted as `ACTIVE` globally.

### Platform Directory Transparency
* **Deleted Bakery Search:** Upgraded the Admin Directory to allow direct querying of softly deleted entities (`status=DELETED`) via a specialized `searchAndFilterDeletedShopsProjection` native query, seamlessly mapping historical properties without triggering JPA lazy-loading exceptions on disabled owners.
* **Deleted Owner Auth:** Validated that the soft deletion mechanism fully disabled user properties (anonymized email, cleared password hash, and `UserStatus.DISABLED`).

### Strict Governance Reporting
* **Date Filter Semantics:** Eliminated improper query branching that previously obscured the absolute counts when date filters were active. The filters now exclusively affect bounded actions (like Today's Registrations and Monthly GMV) rather than cumulative platform health metrics.
* **Historical Revenue:** Confirmed that orphaned payment and order records preserve historical financial truth without constraint violation. 
* **Role Based Security:** Verified `@PreAuthorize("hasRole('ADMIN')")` constraint over all analytical and management endpoints.

### Tests Passed
* Included specific automated unit tests capturing the nuances of the deleted user queries, directory inclusion logic, subscription status overlap exclusion, and metric consistency under date filters.

**DAY 3 PHASE 1 OBJECTIVE MET.**
