# CAKESTORE MULTI-TENANCY SECURITY AUDIT

## 1. Scope
This audit investigates the multi-tenancy authorization model of the CakeStore Spring Boot backend to determine if any cross-tenant data exposure (IDOR) exists. The audit focuses on the Shop Owner, Customer, and Admin boundaries.

## 2. Tenant Model
- **Tenant:** A `Shop`.
- **Owner:** A `User` with role `SHOP_OWNER` who manages one or more shops.
- **Isolation Strategy:** All tenant-owned resources must be strictly scoped to the authenticated owner's `shopId`.

## 3. All Tenant-Owned Resources
| Resource | Entity | Table | shop_id | Tenant Ownership Method |
|----------|--------|-------|---------|-------------------------|
| Products | Product | products | Yes | Direct FK |
| Product Categories | ProductCategory | product_categories | Yes | Direct FK |
| Orders | Order | orders | Yes | Direct FK |
| Product Variants | ProductVariant | product_variants | No | Derived (via Product) |
| Feedback | Feedback | feedback | Yes | Direct FK |
| Enquiries | Enquiry | enquiries | Yes | Direct FK |
| Custom Cake Req. | CustomCakeRequest| custom_cake_requests | Yes | Direct FK |
| Payments | Payment | payments | Yes | Direct FK |
| Subscriptions | Subscription | subscriptions | Yes | Direct FK |
| Delivery Slots | ShopDeliverySlot | shop_delivery_slots | Yes | Direct FK |
| Banners | ShopBanner | shop_banners | Yes | Direct FK |
| Coupons | Coupon | coupons | Yes | Direct FK |

## 4. Repository & Service Audit
An exhaustive scan of the Spring Data repositories and Services reveals that the development team has consistently employed strict tenant isolation for owner-facing operations.

- `ProductRepository.findByIdAndShopId()`
- `OrderRepository.findByIdAndShopId()`
- `ProductReviewRepository.findByIdAndShopId()`
- `FeedbackRepository.findByIdAndShopId()`

The services (`ProductService`, `OrderService`, `OwnerInteractionService`, `OwnerStorefrontService`, etc.) uniformly follow a secure pattern:
1. Retrieve authenticated `ownerId`.
2. Retrieve the active `Shop` for that owner.
3. Perform database operations using `findByIdAndShopId(resourceId, shop.getId())`.

## 5. Owner IDOR Analysis
**Verdict:** SECURE.
Extensive checks were performed to see if an owner could pass a valid `ID` from a different shop to modify/read its data. Because all service-layer write operations explicitly pass the authenticated owner's `shopId` to the repository layer, cross-tenant IDOR for Shop Owners is fully prevented at the database query level.

## 6. Customer Tenancy & Authorization Audit
**Verdict:** VULNERABLE (P1 / P2).

While the Shop Owner boundaries are heavily fortified, the **Customer/Guest** boundary contains a deliberate capability-URL vulnerability.

**Vulnerable Endpoint:** 
- `GET /api/customer/storefront/orders/{orderNumber}`
- `GET /api/customer/storefront/orders/{orderNumber}/invoice`

**Attack Scenario:**
In `CustomerStorefrontController.java`, the endpoint accepts an optional `Authorization` header. If a customer provides a JWT, the system correctly validates that the phone number in the JWT matches the order's phone number. However, if the `Authorization` header is entirely omitted, the system falls back to allowing public access:
```java
// Direct tracking is accessible by unguessable order number
return ResponseEntity.ok(order);
```
If the `orderNumber` generation strategy is predictable or guessable, any unauthenticated user can enumerate and download PII and invoices of other customers. 

## 7. Admin Authorization Audit
**Verdict:** SECURE.
Admin controllers correctly operate without `shop_id` scoping as they are protected by `@PreAuthorize("hasRole('ADMIN')")` or equivalent role checks, and need cross-tenant visibility.

## 8. Dashboard/Aggregation Audit
**Verdict:** SECURE.
Queries in `OrderRepository` such as `totalRevenue`, `count`, and grouping functions explicitly include `WHERE o.shop.id = :shopId`, ensuring aggregate data does not bleed across tenants.

## 9. Final Security Verdict & Required Fixes

**A. Is multi-tenancy actually vulnerable?**
Shop Owner multi-tenancy is highly secure. Customer multi-tenancy has an information disclosure flaw.

**B. Which exact endpoints are vulnerable?**
`GET /api/customer/storefront/orders/{orderNumber}`
`GET /api/customer/storefront/orders/{orderNumber}/invoice`

**C. Which exact repositories are vulnerable?**
None. The flaw is in the controller logic of `CustomerStorefrontController`.

**D. Which issues are only potential risks?**
Whether the customer flaw is P0 or P2 depends entirely on how `orderNumber` is generated. If it is a UUID, it is a P2 (Insecure Capability URL). If it is sequential, it is a P0.

**E. Which parts are already secure?**
All Shop Owner operations (Products, Orders, Subscriptions, Payments, Dashboard, Feedback).

**F. What exact code changes are required?**
Remove the public fallback in `CustomerStorefrontController`. Require all order tracking requests to supply an OTP-verified JWT or implement a secondary secret check (e.g., prompting the guest for the order phone number/email to view the invoice).

**G. What is the final severity?**
P1 - High. Owner data is safe, but Customer PII exposure is a serious privacy risk.
