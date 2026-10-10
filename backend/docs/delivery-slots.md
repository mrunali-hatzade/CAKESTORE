# Delivery Slots Module Documentation

## Overview

The **Delivery Slots** module enables shop owners to manage the time windows during which customers can place orders for delivery. A slot is bound to a specific shop, day of the week, start/end times, capacity, and activation status.

## Data Model

| Field          | Type                | Description |
|----------------|---------------------|-------------|
| `id`           | `Long` (PK)         | Auto‑generated identifier. |
| `shop`         | `Shop` (FK)         | The owning shop (lazy‑loaded, not serialized in API responses). |
| `day_of_week` | `String` (NOT NULL) | Upper‑cased day of week (e.g., `MONDAY`). |
| `start_time`   | `LocalTime` (NOT NULL) | Slot start time. |
| `end_time`     | `LocalTime` (NOT NULL) | Slot end time (must be after `start_time`). |
| `max_orders`   | `Integer` (NOT NULL, default 10) | Maximum number of orders that can be assigned to this slot. |
| `is_active`    | `Boolean` (NOT NULL, default true) | Whether the slot is available for new bookings. |
| `created_at`   | `LocalDateTime` (auto) | Timestamp of creation. |
| `updated_at`   | `LocalDateTime` (auto) | Timestamp of last update. |

## Owner API Endpoints (base path: `/api/owner/delivery‑slots`)

| HTTP Method | Path | Description | Request Body | Responses |
|-------------|------|-------------|--------------|-----------|
| `GET` | `/` | List **all** slots (active and inactive) for the authenticated owner’s shop. | – | `200 OK` – JSON array of `ShopDeliverySlot`. |
| `POST` | `/` | Create a new delivery slot. | `DeliverySlotRequest` (JSON) – see below. | `200 OK` – created `ShopDeliverySlot`. `400 Bad Request` – validation errors. |
| `PUT` | `/{id}` | Update an existing slot (all mutable fields). | `DeliverySlotRequest` (JSON). | `200 OK` – updated slot. `400 Bad Request` – validation errors. `404 Not Found` – slot ID does not exist. `403 Forbidden` – slot belongs to another shop. |
| `PATCH` | `/{id}/status` | Activate/deactivate a slot (partial update). | JSON object with key `isActive` (boolean). | `200 OK` – updated slot. `400 Bad Request` – missing key. `404/403` as above. |
| `DELETE` | `/{id}` | Delete a slot **only if no orders reference it**. | – | `204 No Content` – successful deletion. `409 Conflict` – slot linked to existing orders (cannot hard‑delete). `404/403` as above. |

### `DeliverySlotRequest` DTO
```java
@Data
public class DeliverySlotRequest {
    @NotBlank
    private String dayOfWeek; // e.g. "MONDAY"

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    private Integer maxOrders = 10; // optional, defaults to 10
    private Boolean isActive = true; // optional, defaults to true
}
```
* Validation rules enforced by the controller:
  * `startTime` must be **before** `endTime`.
  * `maxOrders` must be **greater than zero** when supplied.
  * When reducing `maxOrders`, the new value cannot be lower than the number of **active orders already assigned** to the slot (`orderRepository.findMaxActiveOrdersOnAnyUpcomingDate`).

## Overlap Validation

When creating or updating a slot, the controller calls `validateOverlap`. It iterates over all existing slots for the shop and rejects the operation with **`400 Bad Request`** if:
* Another slot on the **same `dayOfWeek`** overlaps the requested time range, i.e. `new.start < existing.end && new.end > existing.start`.
* Adjacent slots (where `new.end == existing.start` or `new.start == existing.end`) are **allowed** – only true overlap triggers the error.

## Capacity Enforcement

* **Creation**: `maxOrders` defaults to `10` if omitted.
* **Update** (`PUT`): If `maxOrders` is supplied, the controller checks `orderRepository.findMaxActiveOrdersOnAnyUpcomingDate(slotId)`. If the new capacity would be less than the current active order count, the request is rejected with **`400 Bad Request`** and a clear message.

## Tenant Isolation & Security

* All endpoints are protected by `@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")`.
* `ShopAccessValidator.getValidShopForOwner(userId)` validates that the authenticated user is the owner of the shop and returns the shop entity.
* Every operation verifies that the target slot belongs to the owner's shop (`slot.getShop().getId().equals(shop.getId())`).
* The deletion endpoint catches `DataIntegrityViolationException` (foreign‑key violation from `order` table) and transforms it into a **`409 Conflict`** response, ensuring slots with existing orders cannot be hard‑deleted. Instead, owners should deactivate the slot.

## Booking Interaction & Concurrency (Customer Flow)

While owner slot management (creation/updates) does not require explicit locking, the **customer booking flow** (handled by the order/storefront services) is highly concurrent.

* **Pessimistic Locking**: When a customer places an order, the booking service obtains a **pessimistic write lock** on the target slot via `findByIdAndShopIdWithLock()`. This prevents concurrent bookings from exceeding the `maxOrders` limit.
* **Capacity Decrement**: The lock ensures that the capacity check and the subsequent order creation are atomic.
* **Order Cancellations**: If an order is cancelled, its slot capacity is implicitly freed up for new bookings. The `orderRepository.findMaxActiveOrdersOnAnyUpcomingDate` method is used by the controller to enforce the *capacity‑reduction* rule.
* **Foreign Key Protection**: Deleting a slot that has orders would violate the foreign‑key constraint, which is why the controller returns `409` instead of performing a cascade delete.

---
*This documentation reflects the **verified** behavior based on the current implementation and test suite.*
