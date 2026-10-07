# CakeStore — Product Category Management & Owner Sidebar UX
## Pre-Implementation Architecture Audit & Technical Blueprint (Updated)

**Date:** September 8, 2026  
**Document Version:** 1.1.0 (Incorporating User Review Corrections)  
**Status:** DRAFT — PENDING FINAL USER APPROVAL (AUDIT ONLY, NO CODE MODIFIED)  
**Target Systems:**  
- **Backend:** Spring Boot 3 / Java 17 (`backend/`)
- **Database:** PostgreSQL 15+ via Flyway (`backend/src/main/resources/db/migration/`)
- **Frontend:** Next.js 14 App Router / Design 2 (`frontend_v2/`)
- **Reference Functional Baseline:** Old Working Frontend (`frontend/`)

---

## Executive Summary & Review Log

This architecture document presents the complete technical specification for two critical features requested for CakeStore Design 2, updated in accordance with user review feedback:

1. **Owner-Managed Product Categories (Part A):** Transitioning from hardcoded frontend strings to a robust, relational, multi-tenant category model (`shops` -> `product_categories` -> `products`).
   - **Review Corrections Applied:**
     - **No Artificial Auto-Categorization:** Existing products will NOT be assigned to "Signature Cakes". All existing products initially retain `category_id = NULL` and are presented in the Owner UI as `"Uncategorized"`, allowing the owner to categorize their inventory organically.
     - **Unified Database Uniqueness:** Redundant unique constraints removed. Uniqueness is enforced by a single deliberate case-insensitive PostgreSQL unique index on `(shop_id, LOWER(TRIM(name)))`, complemented by backend string trimming.
     - **Atomic Transactional Reassignment & Delete:** Category reassignment and category deletion are combined inside an atomic `@Transactional` boundary—either all products reassign and the category is deleted, or the entire operation rolls back.
     - **Explicit Storefront vs. Owner Visibility:** Owner Dashboard shows **all** categories (including newly created empty categories with 0 products). Customer Storefront strictly queries and renders categories that have **at least one visible/active product** (`productCount > 0`), ensuring shoppers never encounter empty tabs.
     - **Elimination of Hardcoded Categories:** All category arrays in Product Add/Edit forms, filters, storefront tabs, cards, and quick views are eradicated; the backend category API is the sole single source of truth.
     - **Pragmatic Ordering:** `display_order` supports simple numeric/sequence ordering (`display_order ASC, name ASC`) without over-engineering drag-and-drop.
2. **Owner Sidebar Independent Scroll UX (Part B):** Resolving the viewport scrolling defect in `frontend_v2/app/dashboard/owner/layout.tsx` using a clean, flexbox-based viewport-height shell (`h-screen overflow-hidden`) without forcing brittle `position: fixed` overrides. The sidebar navigation scrolls independently (`overflow-y-auto`), the bottom Logout button remains pinned and accessible on all screen heights, and the main page content scrolls independently with zero window body scroll (`window.scrollY === 0`).

> [!IMPORTANT]
> **AUDIT ONLY — ZERO CODE MODIFICATION MANDATE OBSERVED**  
> In accordance with instructions, this document is an architectural blueprint. No database migrations have been executed, no backend entities or controllers have been edited, and no frontend components have been altered. Implementation will commence only after your explicit approval.

---

# Table of Contents
- [PART A — OWNER PRODUCT CATEGORIES](#part-a--owner-product-categories)
  - [1. Current Database Structure](#1-current-database-structure)
  - [2. Current Product Structure](#2-current-product-structure)
  - [3. Current Shop Structure](#3-current-shop-structure)
  - [4. Existing Product API](#4-existing-product-api)
  - [5. Existing Storefront API](#5-existing-storefront-api)
  - [6. Existing Category-Like Frontend Code (To Be Replaced)](#6-existing-category-like-frontend-code-to-be-replaced)
  - [7. Proposed Categories Table (`product_categories`)](#7-proposed-categories-table-product_categories)
  - [8. Proposed Product Relationship (`products.category_id`)](#8-proposed-product-relationship-productscategory_id)
  - [9. Migration Strategy (`V9__product_categories.sql`)](#9-migration-strategy-v9__product_categoriesql)
  - [10. Existing Data Migration Strategy (Clean Null / Uncategorized)](#10-existing-data-migration-strategy-clean-null--uncategorized)
  - [11. Category CRUD API Specification & Visibility Rules](#11-category-crud-api-specification--visibility-rules)
  - [12. Multi-Tenant Authorization Strategy](#12-multi-tenant-authorization-strategy)
  - [13. Unified Case-Insensitive Uniqueness Architecture](#13-unified-case-insensitive-uniqueness-architecture)
  - [14. Atomic Transactional Delete & Reassignment Architecture](#14-atomic-transactional-delete--reassignment-architecture)
  - [15. Storefront Integration & Empty Category Exclusion](#15-storefront-integration--empty-category-exclusion)
  - [16. Comprehensive UI Locations Inventory (Single Source of Truth)](#16-comprehensive-ui-locations-inventory-single-source-of-truth)
- [PART B — OWNER SIDEBAR INDEPENDENT SCROLL](#part-b--owner-sidebar-independent-scroll)
  - [17. Current Frontend V2 Owner Layout Analysis](#17-current-frontend-v2-owner-layout-analysis)
  - [18. Current Sidebar Implementation](#18-current-sidebar-implementation)
  - [19. Current Scroll Defect Root Cause](#19-current-scroll-defect-root-cause)
  - [20. Old Owner Dashboard Reference Implementation](#20-old-owner-dashboard-reference-implementation)
  - [21. Recommended Flex Viewport Architectural Adaptation](#21-recommended-flex-viewport-architectural-adaptation)
  - [22. Desktop Behavior Specification](#22-desktop-behavior-specification)
  - [23. Mobile and Tablet Drawer Behavior Specification](#23-mobile-and-tablet-drawer-behavior-specification)
  - [24. Logout and Session Controls Accessibility Guarantee](#24-logout-and-session-controls-accessibility-guarantee)
- [PART C — REVISED IMPLEMENTATION PLAN](#part-c--revised-implementation-plan)
  - [25. Backend Changes](#25-backend-changes)
  - [26. Database Changes](#26-database-changes)
  - [27. Frontend Owner Changes](#27-frontend-owner-changes)
  - [28. Frontend Storefront Changes](#28-frontend-storefront-changes)
  - [29. Testing & Verification Strategy](#29-testing--verification-strategy)
  - [30. Rollback Considerations & Safety](#30-rollback-considerations--safety)

---

# PART A — OWNER PRODUCT CATEGORIES

### 1. Current Database Structure
The CakeStore database currently operates on Flyway migrations `V1` through `V8`:
- `V1__init_schema.sql`: Core tables (`users`, `shops`, `products`, `subscriptions`, `payments`, `orders`, `order_items`).
- `V2__add_verification_and_location.sql`: Shop verification, geographic coordinates (`latitude`, `longitude`, `district`, `area`).
- `V3__add_subscriptions_and_payouts.sql`: Payouts and bank accounts.
- `V4__add_notifications.sql`: In-app notification queue.
- `V5__orders_and_customers.sql`: Customer profiles and order indexes.
- `V6__feedback_and_enquiries.sql`: Shop reviews and custom cake enquiries.
- `V7__cake_variants_and_slots.sql`: `product_variants`, `product_addons`, `shop_delivery_slots`.
- `V8__coupons_and_discounts.sql`: Discount coupons and promotional rules.

#### Current `products` Table Schema (from PostgreSQL `V1`):
```sql
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    availability BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);
CREATE INDEX idx_products_shop_id ON products(shop_id);
```

**Key Finding:** There is currently **no `category` or `category_id` column** in the `products` table, nor is there any `categories` table in the database schema.

---

### 2. Current Product Structure

#### Java Entity: `Product.java` (`backend/src/main/java/com/cakeplatform/api/modules/product/Product.java`)
```java
@Entity
@Table(name = "products")
@Data
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(nullable = false)
    private Boolean availability = true;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductVariant> variants = new ArrayList<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductAddon> addons = new ArrayList<>();
}
```

#### Product DTO: `ProductRequest.java` (`backend/.../product/dto/ProductRequest.java`)
```java
@Data
public class ProductRequest {
    @NotBlank private String name;
    private String description;
    @NotNull private BigDecimal price;
    private String imageUrl;
    private Boolean availability = true;
    private List<VariantDto> variants;
    private List<AddonDto> addons;
}
```
**Key Finding:** `ProductRequest` does not receive or persist any category identifier. Any category value selected in frontend forms was previously dropped during JSON deserialization.

---

### 3. Current Shop Structure

#### Java Entity: `Shop.java` (`backend/src/main/java/com/cakeplatform/api/modules/shop/Shop.java`)
Key fields:
- `id`: `Long` (Primary Key, `BIGSERIAL`)
- `owner`: `@ManyToOne User` (`owner_id`)
- `businessName`: `String`
- `businessCategory`: `String` *(Note: This stores the high-level bakery classification like "Custom Cakes", not individual product categories)*
- `businessType`: `BusinessType` enum (`HOME_BAKERY`, `CAKE_STUDIO`, `BAKERY_SHOP`, `ONLINE_CAKE_BUSINESS`)
- `deliverySlots`: `@OneToMany ShopDeliverySlot`

**Key Finding:** Shop ownership is strictly tied to `User.id` via `owner_id`. A shop is resolved through `ShopAccessValidator.getValidShopForOwner(userId)`.

---

### 4. Existing Product API

Controller: `OwnerProductController.java` (`/api/owner/products`)
- `GET /api/owner/products`: Returns `List<Product>` belonging to the authenticated owner's shop.
- `POST /api/owner/products`: Validates `@Valid @RequestBody ProductRequest`, creates `Product`, evicts Redis cache `shopProducts`.
- `PUT /api/owner/products/{id}`: Validates ownership via `productRepository.findByIdAndShopId(id, shop.getId())`, updates product.
- `DELETE /api/owner/products/{id}`: Validates ownership, deletes product.

All endpoints are protected by `@PreAuthorize("hasRole('SHOP_OWNER')")`.

---

### 5. Existing Storefront API

Controller: `CustomerStorefrontController.java` (`/api/storefront/shops`)
- `GET /api/storefront/shops/{shopId}`: Returns shop profile metadata (`StorefrontShopResponse`).
- `GET /api/storefront/shops/{shopId}/products`: Returns `List<Product>` for public browsing.
- `GET /api/storefront/shops/{shopId}/products/{productId}`: Returns single product detail.
- `GET /api/storefront/shops/search`: Marketplace search by state, district, city, area, businessType.

---

### 6. Existing Category-Like Frontend Code (To Be Replaced)

Currently, categories are completely fragmented across hardcoded frontend files:
1. **`frontend_v2/types/product.ts`:**
   Hardcoded enum union `ProductCategory = 'BIRTHDAY_CAKES' | 'WEDDING_CAKES' | ...`.
2. **`frontend_v2/app/dashboard/owner/products/page.tsx`:**
   Hardcoded `<Select>` options array with 7 static English strings.
3. **`frontend_v2/app/shop/[id]/page.tsx`:**
   Derives categories dynamically from product instances (`Set(products.map(p => p.category))`), which currently evaluates to empty/null.

**Correction Mandate:** All hardcoded category arrays and types will be completely eliminated. The backend database and API will become the single source of truth for both the owner dashboard and the public storefront.

---

### 7. Proposed Categories Table (`product_categories`)

To support shop-specific categories with clean, deliberate relational integrity, we introduce `product_categories`:

```sql
CREATE TABLE product_categories (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

CREATE INDEX idx_product_categories_shop_id ON product_categories(shop_id);
```

#### Field Specifications:
| Field | Type | Modifiers | Description |
|---|---|---|---|
| `id` | `BIGSERIAL` | Primary Key | Unique category ID |
| `shop_id` | `BIGINT` | `NOT NULL`, FK to `shops(id)` | Strict multi-tenant bakery ownership |
| `name` | `VARCHAR(100)` | `NOT NULL` | Human-readable name (e.g., "Cheesecakes") |
| `slug` | `VARCHAR(120)` | `NOT NULL` | URL/filter-friendly slug (e.g., "cheesecakes") |
| `display_order`| `INT` | `DEFAULT 0` | Simple numeric sequence for natural tab ordering |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Creation audit timestamp |
| `updated_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Update audit timestamp |

---

### 8. Proposed Product Relationship (`products.category_id`)

We alter `products` to establish the relational link to `product_categories`:

```sql
ALTER TABLE products ADD COLUMN category_id BIGINT;

ALTER TABLE products 
    ADD CONSTRAINT fk_product_category 
    FOREIGN KEY (category_id) 
    REFERENCES product_categories(id) 
    ON DELETE RESTRICT;

CREATE INDEX idx_products_category_id ON products(category_id);
```

#### Why `ON DELETE RESTRICT`?
`ON DELETE RESTRICT` guarantees database-level safety. PostgreSQL physically prohibits deleting any category record if active products still point to it via `category_id`. Cascading deletion is strictly prevented, eliminating any possibility of accidental product deletion.

---

### 9. Migration Strategy (`V9__product_categories.sql`)

Flyway migration `V9__product_categories.sql` will execute the following clean, non-destructive sequence:
1. `CREATE TABLE product_categories ...` with foreign key to `shops(id) ON DELETE CASCADE`.
2. `CREATE INDEX idx_product_categories_shop_id ON product_categories(shop_id);`
3. `CREATE UNIQUE INDEX uq_shop_category_name_lower ON product_categories(shop_id, LOWER(TRIM(name)));` (Single, deliberate uniqueness index).
4. `ALTER TABLE products ADD COLUMN category_id BIGINT;` (Nullable).
5. `ALTER TABLE products ADD CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT;`
6. `CREATE INDEX idx_products_category_id ON products(category_id);`

---

### 10. Existing Data Migration Strategy (Clean Null / Uncategorized)

#### Live Database Inspection Audit:
The live database currently contains **19 products across 5 active bakeries**:
- **Shop 1:** 7 products (IDs: 1, 2, 3, 4, 5, 6, 8)
- **Shop 4:** 3 products (IDs: 10, 12, 13)
- **Shop 6 (Akurdi Artisan Bakes):** 4 products (Belgian Truffle, Mango Velvet, Nutella Crunch, Red Velvet Jar)
- **Shop 7 (Ravet Cake Studio):** 3 products (Tres Leches, Macaron Box, Blueberry Cheesecake)
- **Shop 9 (Baner Dessert Boutique):** 2 products (Opera Gateau, Tiramisu Bowl)
- **Shops 8, 10, 11:** 0 products

#### Explicit Correction Applied:
> [!IMPORTANT]
> **NO AUTOMATED CATEGORIZATION:**  
> Migration `V9` will **NOT** invent a "Signature Cakes" category or assign any products automatically.  
> All existing 19 products will initially have:
> ```sql
> products.category_id = NULL
> ```
> In the Owner Dashboard UI:
> - Any product with `category_id = NULL` will clearly show a badge: `"Uncategorized"`.
> - The owner can edit the product or use the category manager to assign it to any custom category of their choosing.
> 
> On the Customer Storefront:
> - Products with `category_id = NULL` are displayed under the default `"All"` tab.
> - No fake or artificial category names will ever be presented to customers or owners.

---

### 11. Category CRUD API Specification & Visibility Rules

#### Distinct Visibility Rules:
- **Owner Dashboard (`GET /api/owner/categories`):**  
  Returns **ALL** categories belonging to the bakery, including newly created empty categories with `productCount == 0`. This allows the bakery owner to create categories in advance and then populate them with products.
- **Customer Storefront (`GET /api/storefront/shops/{shopId}/categories`):**  
  Returns **ONLY** categories that have **at least one visible/active product** (`productCount > 0`). Empty categories are strictly excluded from customer storefront tabs.

#### Endpoint Inventory:
| Method | Endpoint | Access | Response | Description & Visibility |
|---|---|---|---|---|
| `GET` | `/api/owner/categories` | `SHOP_OWNER` | `List<CategoryResponse>` | Returns **all** owner categories, including empty ones (`productCount == 0`). |
| `POST` | `/api/owner/categories` | `SHOP_OWNER` | `CategoryResponse` | Creates a new category for authenticated owner's shop. |
| `PUT` | `/api/owner/categories/{id}` | `SHOP_OWNER` | `CategoryResponse` | Updates category name / display order. Validates ownership. |
| `DELETE`| `/api/owner/categories/{id}` | `SHOP_OWNER` | `{ message: string }` | Safe transactional delete. Requires `reassignToCategoryId` if `productCount > 0`. |
| `GET` | `/api/storefront/shops/{shopId}/categories` | Public | `List<CategoryResponse>` | Returns **only** categories where `productCount > 0`. Empty categories omitted. |

#### DTOs:
```java
@Data
public class CategoryRequest {
    @NotBlank(message = "Category name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;
    
    // Simple sequence ordering (e.g. 1, 2, 3)
    private Integer displayOrder = 0;
}

@Data
@AllArgsConstructor
public class CategoryResponse {
    private Long id;
    private Long shopId;
    private String name;
    private String slug;
    private Integer displayOrder;
    private Long productCount;
    private LocalDateTime createdAt;
}
```

---

### 12. Multi-Tenant Authorization Strategy

Security is strictly enforced at the backend service layer via `ShopAccessValidator`:
1. **Never trust frontend `shop_id`:** Owner endpoints derive the shop ID strictly from `@AuthenticationPrincipal CustomUserDetails` -> `shopAccessValidator.getValidShopForOwner(userId)`.
2. **Owner Isolation:** Category queries always filter by `WHERE shop_id = :shopId`. An owner cannot view, rename, or delete another owner's categories.
3. **Product-Category Alignment:** When creating or updating a product, the backend verifies that both the product and the requested `categoryId` belong to the same authenticated shop.

---

### 13. Unified Case-Insensitive Uniqueness Architecture

#### Explicit Correction Applied:
The redundant constraint `uk_shop_category_name UNIQUE (shop_id, name)` has been completely removed in favor of **one deliberate, robust PostgreSQL index**:

```sql
CREATE UNIQUE INDEX uq_shop_category_name_lower 
ON product_categories (shop_id, LOWER(TRIM(name)));
```

#### Application Normalization:
In `CategoryService.java`:
```java
// Normalize input
String normalizedName = request.getName().trim();

// Case-insensitive shop-scoped duplicate check
if (categoryRepository.existsByShopIdAndLowerTrimmedName(shop.getId(), normalizedName.toLowerCase())) {
    throw new DuplicateResourceException("A category named '" + normalizedName + "' already exists in your bakery.");
}
```
**Benefits:**
- Prevents duplicates like `"Birthday Cakes"` and `"birthday cakes"` in the same bakery.
- Clean, single constraint in PostgreSQL without redundant index bloat.
- Bakery A ("Sweet Crumbs") and Bakery B ("Cake Heaven") can both have `"Cheesecakes"` with zero conflict.

---

### 14. Atomic Transactional Delete & Reassignment Architecture

#### Explicit Correction Applied:
The category reassignment + category deletion operation is strictly marked `@Transactional(rollbackFor = Exception.class)`.

```java
@Transactional(rollbackFor = Exception.class)
public void deleteCategory(Long userId, Long categoryId, Long reassignToCategoryId) {
    Shop shop = getOwnerShop(userId);
    ProductCategory sourceCategory = categoryRepository.findByIdAndShopId(categoryId, shop.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

    long productCount = productRepository.countByCategoryId(categoryId);

    if (productCount > 0) {
        if (reassignToCategoryId == null) {
            throw new CategoryNotEmptyException(
                "Category contains " + productCount + " products. Please select a destination category to reassign them before deleting."
            );
        }
        
        // Verify destination category belongs to the EXACT same shop
        ProductCategory targetCategory = categoryRepository.findByIdAndShopId(reassignToCategoryId, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Destination category not found in your bakery"));

        if (sourceCategory.getId().equals(targetCategory.getId())) {
            throw new IllegalArgumentException("Cannot reassign products to the category being deleted.");
        }

        // STEP 1: Reassign all products in an atomic batch
        productRepository.reassignCategory(sourceCategory.getId(), targetCategory.getId(), shop.getId());
    }

    // STEP 2: Delete source category
    categoryRepository.delete(sourceCategory);
    
    // Spring @Transactional guarantees: If Step 2 fails, Step 1 is rolled back completely!
}
```

#### Safe UI Flow:
1. Owner clicks "Delete" on a category.
2. If `productCount == 0`: Instant confirmation dialog -> deletion executed.
3. If `productCount > 0`: Safe Reassignment Modal opens:
   - Displays: *"This category contains N products. Please select another category to move these products into before deleting."*
   - Dropdown displays other categories belonging to this bakery.
   - Owner selects target category and confirms.
   - Both steps succeed atomically, or neither does.

---

### 15. Storefront Integration & Empty Category Exclusion

#### Explicit Correction Applied:
On the public storefront page (`frontend_v2/app/shop/[id]/page.tsx`):
1. The storefront queries `GET /api/storefront/shops/{shopId}/categories`.
2. The backend repository executes:
   ```sql
   SELECT c.id, c.shop_id, c.name, c.slug, c.display_order, COUNT(p.id) as product_count
   FROM product_categories c
   JOIN products p ON p.category_id = c.id
   WHERE c.shop_id = :shopId 
     AND p.status = 'ACTIVE' 
     AND p.availability = true
   GROUP BY c.id
   HAVING COUNT(p.id) > 0
   ORDER BY c.display_order ASC, c.name ASC;
   ```
3. **Customer Experience:**
   - Pill 1: `All` (displays total active products count).
   - Pill 2..N: Only categories that have **at least 1 active product**.
   - **Shoppers are NEVER presented with empty category tabs.**
   - If an owner creates a new category "Jar Cakes" but hasn't added products yet, it appears in the owner dashboard, but stays hidden from the public storefront until the owner adds the first Jar Cake.

---

### 16. Comprehensive UI Locations Inventory (Single Source of Truth)

All hardcoded category lists across the frontend are eliminated. The following 8 locations will consume the unified backend API:

| # | UI Location | File Path | Interaction & Dynamic Source |
|---|---|---|---|
| 1 | **Owner Product Add Modal** | `app/dashboard/owner/products/page.tsx` | Dropdown populated from `GET /api/owner/categories`. Includes an inline "+ Add New Category" action. |
| 2 | **Owner Product Edit Modal** | `app/dashboard/owner/products/page.tsx` | Dropdown populated from `GET /api/owner/categories`. Pre-selects product's category or shows "Uncategorized". |
| 3 | **Owner Category Manager Modal** | `app/dashboard/owner/products/page.tsx` | Displays all owner categories with active product count, simple `display_order`, rename trigger, and safe delete trigger. |
| 4 | **Owner Product Table Filter** | `app/dashboard/owner/products/page.tsx` | Filter dropdown: `All`, `Uncategorized`, and dynamic owner categories. |
| 5 | **Owner Delete Category Modal** | `components/dashboard/owner/DeleteCategoryModal.tsx` | Atomic reassignment dialog preventing product loss. |
| 6 | **Storefront Category Pills** | `app/shop/[id]/page.tsx` | Dynamically renders non-empty categories (`productCount > 0`) + `All`. |
| 7 | **Storefront Product Card** | `components/customer/shop/ProductCard.tsx` | Renders `product.categoryName` badge dynamically (or omitted if uncategorized). |
| 8 | **Storefront Cake Detail Modal** | `components/customer/shop/ProductDetailModal.tsx` | Renders `product.categoryName` tag in specifications. |

---

# PART B — OWNER SIDEBAR INDEPENDENT SCROLL

### 17. Current Frontend V2 Owner Layout Analysis

In `frontend_v2/app/dashboard/owner/layout.tsx`:
```tsx
export default function OwnerLayout({ children }: { children: ReactNode }) {
  ...
  return (
    <div className="min-h-screen flex bg-owner-canvas">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-owner-sidebar text-owner-sidebar-text flex-col shrink-0 border-r border-owner-sidebar/80">
        <SidebarShell />
      </aside>
      ...
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 ...">...</header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

### 18. Current Sidebar Implementation

Inside `SidebarShell`:
- Header: `p-6 border-b border-white/10`
- Navigation: `nav className="p-4 flex-1 space-y-1 overflow-y-auto"`
- Bottom: `div className="p-4 border-t border-white/10"` (User email, Shop ID, and Logout button).

---

### 19. Current Scroll Defect Root Cause

Why does the desktop sidebar scroll away with the page?
1. **`min-h-screen` on Root Container:** The root container allows the entire document body (`window.scrollY`) to expand when main content is tall.
2. **Body Scrolling Moves Sidebar:** When the user scrolls with the browser scroll wheel or touch, the window itself scrolls down. Because the `<aside>` is placed in the standard document flow without viewport height bounds, its top scrolls up out of view.
3. **Logout Disappears:** The bottom logout button is pushed 2,000px down on long catalog pages, requiring tedious scrolling to log out.

---

### 20. Old Owner Dashboard Reference Implementation

In `frontend/components/dashboard/DashboardLayoutWrapper.tsx`:
```tsx
<div className="flex h-screen bg-[#F8F9FA] font-sans overflow-hidden">
  <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
  <div className="flex flex-col flex-1 overflow-hidden w-full min-w-0">
    <Header onMenuClick={() => setIsSidebarOpen(true)} />
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8F9FA]">
      {children}
    </main>
  </div>
</div>
```
**Proven Qualities:**
- Viewport is strictly bounded to `h-screen` with `overflow-hidden` at the root.
- The browser window **never scrolls** (`window.scrollY == 0` permanently).
- Sidebar navigation has `overflow-y-auto` to scroll independently on short laptop screens.
- Logout is always anchored at the bottom.

---

### 21. Recommended Flex Viewport Architectural Adaptation

#### Explicit Correction Applied:
> [!NOTE]
> **NO FORCED `position: fixed`:**  
> We do NOT use brittle `fixed` positioning overrides on desktop. The CSS Flexbox viewport architecture (`h-screen overflow-hidden`) cleanly and natively delivers 100% viewport isolation:

```tsx
return (
  /* 1. Root Container: 100vh height, overflow-hidden prevents all window-level scrolling */
  <div className="flex h-screen bg-owner-canvas overflow-hidden">
    
    {/* 2. Desktop Sidebar: Exactly h-screen, shrink-0 flex column */}
    <aside className="hidden lg:flex w-64 bg-owner-sidebar text-owner-sidebar-text flex-col shrink-0 h-screen border-r border-owner-sidebar/80">
      <SidebarShell />
    </aside>

    {/* 3. Mobile Drawer: Fixed backdrop overlay */}
    {mobileMenuOpen && (
      <div className="lg:hidden fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <aside className="relative z-10 w-72 bg-owner-sidebar text-owner-sidebar-text flex flex-col h-full shadow-2xl">
          <SidebarShell />
        </aside>
      </div>
    )}

    {/* 4. Main Content Wrapper: Exactly h-screen, overflow-hidden */}
    <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
      {/* Header: shrink-0 */}
      <header className="h-16 bg-white border-b border-owner-border px-4 sm:px-6 flex items-center justify-between shrink-0">
        ...
      </header>

      {/* Main Area: flex-1, overflow-y-auto (independent vertical scroll) */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  </div>
);
```

#### Inside `SidebarShell`:
```tsx
const SidebarShell = () => (
  <>
    {/* Brand Header: shrink-0 */}
    <div className="p-6 border-b border-white/10 shrink-0">
      ...
    </div>

    {/* Scrollable Nav: flex-1, min-h-0 (CRITICAL for nested flex scroll), overflow-y-auto */}
    <nav className="p-4 flex-1 min-h-0 space-y-1 overflow-y-auto">
      <NavLinks />
    </nav>

    {/* Bottom Session Controls: shrink-0, mt-auto */}
    <div className="p-4 border-t border-white/10 shrink-0 mt-auto">
      <div className="mb-3 px-2">
        <p className="text-xs text-white font-medium truncate">{user?.email || 'Bakery Owner'}</p>
        <p className="text-[10px] text-owner-sidebar-text">Shop ID: {user?.shopId || 'N/A'}</p>
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  </>
);
```

---

### 22. Desktop Behavior Specification

- **Screen Widths `>= 1024px`:**
  - Sidebar remains permanently visible on the left (`w-64`, `h-screen`).
  - As the catalog page scrolls, only `<main>` scrolls. The sidebar does not move a single pixel.
  - On short laptop screens (e.g. 1366x768 or 1280x720), the 12 navigation items inside `<nav>` scroll vertically with internal scrollbars, keeping brand header and bottom Logout anchored.

---

### 23. Mobile and Tablet Drawer Behavior Specification

- **Screen Widths `< 1024px`:**
  - Desktop sidebar hidden.
  - Hamburger menu in header toggles mobile drawer overlay.
  - Drawer uses `h-full flex flex-col w-72` with the same internal navigation scrolling (`flex-1 min-h-0 overflow-y-auto`) and pinned bottom Logout (`shrink-0 mt-auto`).
  - Mobile owner can always access Logout without scrolling the entire drawer away.

---

### 24. Logout and Session Controls Accessibility Guarantee

- **Desktop:** Logout button is **always** in the viewport at the bottom of the sidebar. Zero scrolling required.
- **Mobile Drawer:** Logout button is **always** at the bottom of the drawer.
- **Short Viewports:** `shrink-0 mt-auto` ensures the logout container never gets clipped or pushed beneath the fold.

---

# PART C — REVISED IMPLEMENTATION PLAN

### 25. Backend Changes

1. **Entity `ProductCategory.java`:**
   - Path: `backend/src/main/java/com/cakeplatform/api/modules/product/ProductCategory.java`
   - Attributes: `id`, `shop` (`@ManyToOne Shop`), `name`, `slug`, `displayOrder`, `createdAt`, `updatedAt`.
2. **Repository `ProductCategoryRepository.java`:**
   - Path: `backend/src/main/java/com/cakeplatform/api/modules/product/ProductCategoryRepository.java`
   - Scoped query for all owner categories with product counts (including empty ones):
     ```java
     @Query("SELECT new com.cakeplatform.api.modules.product.dto.CategoryResponse(" +
            "c.id, c.shop.id, c.name, c.slug, c.displayOrder, COUNT(p), c.createdAt) " +
            "FROM ProductCategory c LEFT JOIN Product p ON p.category = c " +
            "WHERE c.shop.id = :shopId GROUP BY c.id ORDER BY c.displayOrder ASC, c.name ASC")
     List<CategoryResponse> findAllByShopIdWithCounts(@Param("shopId") Long shopId);
     ```
   - Storefront query for non-empty categories only (`productCount > 0`):
     ```java
     @Query("SELECT new com.cakeplatform.api.modules.product.dto.CategoryResponse(" +
            "c.id, c.shop.id, c.name, c.slug, c.displayOrder, COUNT(p), c.createdAt) " +
            "FROM ProductCategory c JOIN Product p ON p.category = c " +
            "WHERE c.shop.id = :shopId AND p.status = 'ACTIVE' AND p.availability = true " +
            "GROUP BY c.id HAVING COUNT(p) > 0 ORDER BY c.displayOrder ASC, c.name ASC")
     List<CategoryResponse> findNonEmptyByShopId(@Param("shopId") Long shopId);
     ```
   - Case-insensitive duplicate check:
     ```java
     @Query("SELECT COUNT(c) > 0 FROM ProductCategory c WHERE c.shop.id = :shopId AND LOWER(TRIM(c.name)) = LOWER(TRIM(:name))")
     boolean existsByShopIdAndLowerTrimmedName(@Param("shopId") Long shopId, @Param("name") String name);
     ```
3. **Update `Product.java` & `ProductRequest.java`:**
   - Add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private ProductCategory category;`
   - Add helper getters: `getCategoryId()`, `getCategoryName()`.
   - Add `Long categoryId` to `ProductRequest`.
4. **Update `ProductRepository.java`:**
   - Add atomic bulk reassignment query:
     ```java
     @Modifying
     @Query("UPDATE Product p SET p.category.id = :targetId WHERE p.category.id = :sourceId AND p.shop.id = :shopId")
     int reassignCategory(@Param("sourceId") Long sourceId, @Param("targetId") Long targetId, @Param("shopId") Long shopId);
     ```
   - Add `long countByCategoryId(Long categoryId);`
5. **New `CategoryService.java`:**
   - Multi-tenant CRUD operations scoped via `ShopAccessValidator`.
   - Atomic `@Transactional` delete and reassignment method.
6. **New `OwnerCategoryController.java`:**
   - Path: `/api/owner/categories` (CRUD for owner).
7. **Update Storefront Controller & Service:**
   - Add `GET /api/storefront/shops/{shopId}/categories` returning only non-empty categories.

---

### 26. Database Changes

#### File: `backend/src/main/resources/db/migration/V9__product_categories.sql`
```sql
-- ============================================================
-- V9__product_categories.sql
-- Relational Product Categories & Product Association
-- ============================================================

-- 1. Create product_categories table
CREATE TABLE product_categories (
    id BIGSERIAL PRIMARY KEY,
    shop_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- 2. Fast lookup index on shop_id
CREATE INDEX idx_product_categories_shop_id ON product_categories(shop_id);

-- 3. Unified case-insensitive, trimmed uniqueness index per shop
CREATE UNIQUE INDEX uq_shop_category_name_lower ON product_categories(shop_id, LOWER(TRIM(name)));

-- 4. Alter products table to link category (NULLABLE - NO FAKE CATEGORIES ASSIGNED)
ALTER TABLE products ADD COLUMN category_id BIGINT;

-- 5. Foreign key constraint with RESTRICT to prevent accidental product deletion
ALTER TABLE products 
    ADD CONSTRAINT fk_product_category 
    FOREIGN KEY (category_id) 
    REFERENCES product_categories(id) 
    ON DELETE RESTRICT;

-- 6. Index on category_id for fast filtering
CREATE INDEX idx_products_category_id ON products(category_id);
```

---

### 27. Frontend Owner Changes

1. **Layout Viewport Fix (`frontend_v2/app/dashboard/owner/layout.tsx`):**
   - Replace `min-h-screen` with `h-screen overflow-hidden`.
   - Fix desktop sidebar with `h-screen shrink-0 border-r`.
   - Navigation container gets `flex-1 min-h-0 overflow-y-auto`.
   - Logout container gets `shrink-0 mt-auto border-t`.
   - Main content area gets `flex-1 flex flex-col min-w-0 h-screen overflow-hidden` with `<main className="flex-1 overflow-y-auto">`.
2. **Category Service (`frontend_v2/lib/api/categories.ts`):**
   - `getCategories()`, `createCategory()`, `updateCategory()`, `deleteCategory(id, reassignToId)`.
3. **Category Types (`frontend_v2/types/category.ts`):**
   - Define `Category` and `CategoryRequest`.
4. **Owner Products Page (`frontend_v2/app/dashboard/owner/products/page.tsx`):**
   - Remove hardcoded category array.
   - Fetch owner categories on mount.
   - Category management modal (Add, Edit, Simple Order, Delete).
   - Dynamic Category dropdown in Add/Edit Cake modal + quick inline creation.
   - Products with `category_id = null` displayed as `"Uncategorized"`.
   - Safe Reassignment Modal triggered when deleting a category with products.

---

### 28. Frontend Storefront Changes

1. **Storefront API (`frontend_v2/lib/api/storefront.ts`):**
   - Add `getShopCategories(shopId: number): Promise<Category[]>`.
2. **Storefront Page (`frontend_v2/app/shop/[id]/page.tsx`):**
   - Fetch active shop categories in parallel with shop details and products.
   - Render dynamic category pills: `All ({totalCount})` + non-empty categories only.
   - Dynamic product filter: `selectedCategory === 'ALL' || p.categoryId === selectedCategory`.

---

### 29. Testing & Verification Strategy

| Test Case | Method | Expected Result |
|---|---|---|
| **1. Clean Null Existing Products** | Run V9 migration against live database. Inspect 19 existing products. | All 19 products have `category_id = NULL`. Display as "Uncategorized" in Owner UI. |
| **2. Case-Insensitive Uniqueness** | Owner creates "Birthday Cakes", then tries "birthday cakes". | Rejected with HTTP 409 Conflict; single database index prevents duplicates. |
| **3. Atomic Reassignment Delete** | Category A has 4 products. Owner reassigns to Category B and confirms. | Products moved to Category B, Category A deleted atomically in 1 transaction. |
| **4. DB Restriction Protection** | Attempt raw SQL `DELETE FROM product_categories WHERE id = X` with active products. | PostgreSQL raises constraint violation `fk_product_category`; products safe. |
| **5. Storefront Empty Exclusion** | Owner creates new category "Cupcakes" with 0 products. Check `/shop/{id}`. | "Cupcakes" tab is NOT shown to shoppers until a product is assigned. |
| **6. Desktop Sidebar Viewport Scroll** | Scroll product list 2,500px down on desktop. | Sidebar remains fixed; Logout is visible at all times; `window.scrollY === 0`. |
| **7. Short Screen Scroll** | Resize desktop browser window height to 650px. | Sidebar nav links scroll vertically; Logout remains pinned at bottom. |
| **8. Mobile Drawer Scroll** | Open hamburger menu on mobile (375px width). | Drawer opens with independent scroll; Logout accessible; closes on backdrop tap. |

---

### 30. Rollback Considerations & Safety

1. **Additive & Nullable:**
   `category_id` on `products` is completely nullable. Rollback is a simple non-destructive drop:
   ```sql
   ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_product_category;
   DROP INDEX IF EXISTS idx_products_category_id;
   ALTER TABLE products DROP COLUMN IF EXISTS category_id;
   DROP TABLE IF EXISTS product_categories CASCADE;
   ```
   *None of the existing 19 products, prices, variants, addons, or orders are impacted.*
2. **Zero Build Breakage:**
   `npx tsc --noEmit` and `npm run build` will verify zero TypeScript or Next.js build errors.

---

## Conclusion & Readiness

All 7 review corrections have been integrated into this architecture specification.  

**Awaiting your final approval before proceeding with execution.**
