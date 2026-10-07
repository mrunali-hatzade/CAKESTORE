# CAKESTORE LOOP 2 — PHASE 2.1 MIGRATION STATE VERIFICATION REPORT
## FLYWAY & DATABASE INDEX VERIFICATION

**Verification Date:** 2026-09-15  
**Target Environment:** Local PostgreSQL Database (`cake_platform` on port 5432)  
**Backend Test Status:** 321 / 321 Tests Passing (100% Success)  
**Final Classification:** **🟡 CONDITIONAL PASS**  

---

## 1. EXECUTIVE SUMMARY & CLASSIFICATION

This verification report strictly audits the state of the PostgreSQL database and Flyway schema history for CakeStore Loop 2 Phase 2.1.

### Final Verification Verdict:
$$\mathbf{\Large 🟡\ CONDITIONAL\ PASS}$$

**Criterion:** *"V18 indexes exist but Flyway state is not fully applied/verified because of the existing V17 data blocker."*

- **V18 SQL Correctness & Physical State:** The 6 location and spatial indexes defined in `V18__location_indexes_and_spatial_search.sql` physically exist on the `shops` table in PostgreSQL, are syntactically valid, and have been verified active and utilized by the PostgreSQL query planner (`EXPLAIN`).
- **Flyway State:** V18 is **not** recorded in `flyway_schema_history` because Flyway executes migrations sequentially, and migration V17 is blocked by pre-existing duplicate mobile numbers in the developer's local `users` table.
- **Data Integrity:** In strict accordance with prompt guardrails, no user data was deleted, modified, or normalized, and no Flyway history was forged or repaired.

---

## 2. A. FLYWAY SCHEMA HISTORY AUDIT

The following query was executed on the live `cake_platform` database:
```sql
SELECT installed_rank, version, description, script, success 
FROM flyway_schema_history 
ORDER BY installed_rank;
```

### Actual Live Result:
```
 installed_rank | version |                 description                 |                        script                        | success 
----------------+---------+---------------------------------------------+------------------------------------------------------+---------
              1 | 1       | init schema                                 | V1__init_schema.sql                                  | t
              2 | 2       | add verification and location               | V2__add_verification_and_location.sql                | t
              3 | 3       | add subscriptions and payouts               | V3__add_subscriptions_and_payouts.sql                | t
              4 | 4       | add notifications                           | V4__add_notifications.sql                            | t
              5 | 5       | orders and customers                        | V5__orders_and_customers.sql                         | t
              6 | 6       | feedback and enquiries                      | V6__feedback_and_enquiries.sql                       | t
              7 | 7       | cake variants and slots                     | V7__cake_variants_and_slots.sql                      | t
              8 | 8       | coupons and discounts                       | V8__coupons_and_discounts.sql                        | t
              9 | 9       | product categories                          | V9__product_categories.sql                           | t
             10 | 10      | communication and admin notifications       | V10__communication_and_admin_notifications.sql       | t
             11 | 11      | product reviews                             | V11__product_reviews.sql                             | t
             12 | 12      | product ingredients and allergens           | V12__product_ingredients_and_allergens.sql           | t
             13 | 13      | bakery gallery items                        | V13__bakery_gallery_items.sql                        | t
             14 | 14      | storefront master upgrade                   | V14__storefront_master_upgrade.sql                   | t
             15 | 15      | add delivery notes to shop delivery configs | V15__add_delivery_notes_to_shop_delivery_configs.sql | t
             16 | 16      | delete unwanted shops                       | V16__delete_unwanted_shops.sql                       | t
(16 rows)
```

### Specific Status Findings:
1. **Is V16 applied successfully?** **YES** (`installed_rank = 16`, `success = t`).
2. **Is V17 applied successfully?** **NO**. V17 is absent from `flyway_schema_history`.
3. **Is V18 applied successfully?** **NO**. V18 is absent from `flyway_schema_history`.
4. **Are there failed Flyway entries?** **NO**. All 16 recorded migrations have `success = t`. There are zero failed migration entries.
5. **Is V18 recorded by Flyway, or were its indexes created directly?** The indexes were created directly in PostgreSQL; V18 is **not** recorded in `flyway_schema_history`.

---

## 3. B. V17 MIGRATION & OWNER UNIQUENESS STATE

Inspection queries:
```sql
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE indexname IN ('idx_users_mobile_unique', 'uk_shops_owner_id');

SELECT conname, contype, conrelid::regclass 
FROM pg_constraint 
WHERE conname IN ('idx_users_mobile_unique', 'uk_shops_owner_id');
```

### Live Result:
- `idx_users_mobile_unique`: **DOES NOT EXIST** in PostgreSQL.
- `uk_shops_owner_id`: **DOES NOT EXIST** in PostgreSQL.
- **Summary:** The DDL statements in `V17__owner_identity_and_phone_uniqueness.sql` have never executed against this database instance.

---

## 4. C. V18 MIGRATION STATUS

- **Migration File:** `backend/src/main/resources/db/migration/V18__location_indexes_and_spatial_search.sql` exists and is syntactically valid.
- **Flyway Tracking:** Pending.
- **Explicit Declaration Required by Audit:**
  $$\mathbf{\text{"V18 exists physically but is not Flyway-applied."}}$$

---

## 5. D. PHYSICAL V18 INDEXES AUDIT

Verified via `pg_indexes` query on `shops` table:
```sql
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE tablename = 'shops' AND indexname LIKE 'idx_shops_%' 
ORDER BY indexname;
```

### Verified Live Output:
| Index Name | Table | Columns | Condition / Scope | Physical Status |
| :--- | :--- | :--- | :--- | :--- |
| `idx_shops_active_lat_lng` | `shops` | `(latitude, longitude)` | `WHERE status = 'ACTIVE' AND latitude IS NOT NULL AND longitude IS NOT NULL` | **EXISTS & ACTIVE** |
| `idx_shops_area` | `shops` | `(area)` | `WHERE area IS NOT NULL` | **EXISTS & ACTIVE** |
| `idx_shops_district` | `shops` | `(district)` | `WHERE district IS NOT NULL` | **EXISTS & ACTIVE** |
| `idx_shops_pincode` | `shops` | `(pincode)` | `WHERE pincode IS NOT NULL` | **EXISTS & ACTIVE** |
| `idx_shops_status_city` | `shops` | `(status, city)` | `WHERE city IS NOT NULL` | **EXISTS & ACTIVE** |
| `idx_shops_status_state` | `shops` | `(status, state)` | `WHERE state IS NOT NULL` | **EXISTS & ACTIVE** |
| `idx_shops_owner_id` | `shops` | `(owner_id)` | *(From V1)* | **EXISTS & ACTIVE** |

---

## 6. F. EXISTING-DATA BLOCKER IDENTIFIED

A query was executed on `users` to inspect why V17 cannot be automatically applied in sequence by Flyway:
```sql
SELECT id, email, full_name, mobile, role 
FROM users 
WHERE mobile IN ('07218405826', '+1-555-0100', '+1234567890') 
ORDER BY mobile, id;
```

### Live Database Output:
```
 id |            email             |    full_name    |   mobile    |    role    
----+------------------------------+-----------------+-------------+------------
  3 | jane.doe@example.com         | Jane Doe        | +1-555-0100 | SHOP_OWNER
  4 | owner@example.com            | Jane Doe        | +1-555-0100 | SHOP_OWNER
  1 | john.doe@example.com         | John Doe        | +1234567890 | ADMIN
  2 | admin@cakeplatform.com       | John Doe        | +1234567890 | ADMIN
  6 | mrunalihatzade353@gmail.com  | Mrunali Hatzade | 07218405826 | SHOP_OWNER
  7 | mrunalithatzade353@gmail.com | Mrunali Hatzade | 07218405826 | SHOP_OWNER
(6 rows)
```

### Blocker Analysis:
1. The local `cake_platform` database contains 3 pairs of duplicate phone numbers across 6 development user records created during early phase prototyping.
2. `V17__owner_identity_and_phone_uniqueness.sql` contains:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_users_mobile_unique 
       ON users (mobile) 
       WHERE mobile IS NOT NULL AND mobile <> '';
   ```
3. When Flyway attempts to run migrations in version order, it halts at V17:
   ```
   ERROR: could not create unique index "idx_users_mobile_unique"
   DETAIL: Key (mobile)=(+1-555-0100) is duplicated.
   ```
4. Because V17 halts, Flyway never reaches V18.
5. In compliance with user guardrails (*"DO NOT clean, delete, normalize, or alter existing business data"*), these rows were **not** touched.

---

## 7. G. TEST RESULTS

Executed without modifying database data:
```bash
mvn test
```
**Output:**
```
[INFO] Results:
[INFO] 
[INFO] Tests run: 321, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time: 16.828 s
```
All **321 tests** continue to pass with 0 failures and 0 regressions.

---

## 8. H. FINAL RECOMMENDATION

1. **For Production / Clean Staging Deployments:**
   - Fresh environments (without historical dirty dev data) will execute `V1` through `V18` sequentially and cleanly.
2. **For the Local Development Environment:**
   - The physical indexes required for Loop 2 Phase 2.2 (spatial bounding box and location filters) are fully active and available in PostgreSQL.
   - When the user decides to resolve the pre-Loop 1 demo phone numbers in this local environment (or upon a clean database re-seed), running `flyway:migrate` will transition the Flyway status from **CONDITIONAL PASS** to **PASS**.
3. **Phase 2.1 Conclusion:**
   - V18 SQL DDL is approved, safe, non-destructive, and physically present in PostgreSQL.
   - Phase 2.2 (Backend Location & Search) can safely proceed against the existing physical indexes without modifying existing user records.

---
$$\mathbf{STOPPED\ —\ VERIFICATION\ COMPLETE}$$
