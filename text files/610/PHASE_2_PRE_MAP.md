| Module | Current API | Current Query | Current Pagination | Current Search | Current Filter | Current Sort | Required Change |
|--------|-------------|---------------|--------------------|----------------|----------------|--------------|-----------------|
| 1. Orders | `/api/owner/orders?page=0&size=20` (ignores search/status filters) | `findVisibleOrdersByShopId` | Spring `Pageable` | Client-side `.filter()` | Client-side `.filter()` (status, payment) | Backend (createdAt DESC) | Update `OrderRepository`/Service/Controller to accept `status`, `paymentStatus`, `search`. Remove client-side `.filter()` in `page.tsx`. |
| 2. Inquiries | `/api/owner/enquiries` | `findByShopIdOrderByCreatedAtDesc` | None (Returns `List<Enquiry>`) | None | None | Backend (createdAt DESC) | Update Repo/Service/Controller to return `Page<Enquiry>` with `page`/`size`. Update UI to `PaginatedResponse`. |
| 3. Reviews | `/api/owner/product-reviews` | `findByShopIdOrderByCreatedAtDesc` | None (Returns `List<OwnerProductReviewResponse>`) | None | None | Backend (createdAt DESC) | Update Repo/Service/Controller to return `Page<...>` with `page`/`size`. Update UI to `PaginatedResponse`. |
| 4. Products | `/api/owner/products` | `findByShopIdOrderByCreatedAtDesc` | None (Returns `List<Product>`) | None | None | Backend (createdAt DESC) | Update Repo/Service/Controller to return `Page<Product>` with `page`/`size`. Update UI to `PaginatedResponse`. |
| 5. Gallery | `/api/owner/gallery` | `findByShopIdOrderByCreatedAtDesc` | None (Returns `List<GalleryItemResponse>`) | None | None | Backend (createdAt DESC) | Update Repo/Service/Controller to return `Page<GalleryItemResponse>` with `page`/`size`. Update UI to `PaginatedResponse`. |
| 6. Coupons | `/api/owner/coupons?page=0&size=10&search=x` | `findByShopId` / `searchByShopId` | Spring `Pageable` | Backend `searchByShopId` | None (`status` ignored) | Backend (createdAt DESC) | Update Controller/Repo to support `status` (active/inactive) in query. |

**Discovery Summary:**
- **Orders**: The backend pagination exists, but the UI is fetching a page and then applying `.filter()` client-side for `status`, `paymentStatus`, and `search`. Furthermore, the UI calculates KPIs (Total Orders, Total Sales, etc.) over this *single page*, resulting in incorrect data. 
- **Inquiries, Reviews, Products, Gallery**: All are completely unpaginated. They fetch `findAllByShopId` and return `List<T>`. We will convert them to `org.springframework.data.domain.Page<T>`.
- **Coupons**: Already paginated and supports search, but the `status` filter passed by the UI is ignored. We will add `status` filtering to the repository.

**Proposed Execution:**
Since the architecture is clear, I am requesting your approval to proceed with modifying the Repositories, Services, Controllers, and React Components for each of the 6 modules to ensure true server-side scalability without breaking existing tenant isolation or business logic. No database migrations are required as we are only changing queries and return types.
