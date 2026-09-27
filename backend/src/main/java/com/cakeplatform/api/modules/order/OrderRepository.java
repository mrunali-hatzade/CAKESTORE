package com.cakeplatform.api.modules.order;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByShopIdOrderByCreatedAtDesc(Long shopId);
    org.springframework.data.domain.Page<Order> findByShopIdOrderByCreatedAtDesc(Long shopId, Pageable pageable);
    Optional<Order> findByIdAndShopId(Long id, Long shopId);
    Optional<Order> findByOrderNumber(String orderNumber);
    long countByShopId(Long shopId);
    long countByShopIdAndOrderStatus(Long shopId, String orderStatus);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED')")
    BigDecimal sumRevenueByShopId(@Param("shopId") Long shopId);

    @Query("SELECT o FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "  AND o.createdAt >= :startDate " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED')")
    List<Order> findRecentRealizedOrders(@Param("shopId") Long shopId, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT oi.productNameSnapshot, SUM(oi.quantity) " +
           "FROM OrderItem oi " +
           "WHERE oi.order.shop.id = :shopId " +
           "  AND UPPER(COALESCE(oi.order.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(oi.order.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(oi.order.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(oi.order.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED') " +
           "GROUP BY oi.productNameSnapshot " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> findTopSellingProductsByShopId(@Param("shopId") Long shopId, Pageable pageable);

    org.springframework.data.domain.Page<Order> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone, Pageable pageable);

    List<Order> findByShopIdAndCustomerEmailOrderByCreatedAtDesc(Long shopId, String customerEmail);

    List<Order> findByShopIdAndCustomerNameOrderByCreatedAtDesc(Long shopId, String customerName);

    @Query("SELECT DISTINCT o.customerEmail FROM Order o WHERE o.shop.id = :shopId AND o.customerEmail IS NOT NULL")
    List<String> findUniqueCustomerEmailsByShopId(@Param("shopId") Long shopId);

    @Query(value = "SELECT new com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse(" +
           "  COALESCE(NULLIF(TRIM(o.customerName), ''), o.customerEmail, 'Guest Customer'), " +
           "  MAX(o.customerEmail), " +
           "  MAX(o.customerPhone), " +
           "  MAX(o.deliveryAddress), " +
           "  COUNT(o.id), " +
           "  SUM(CASE WHEN UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED') THEN o.totalAmount ELSE 0 END), " +
           "  MAX(o.createdAt) " +
           ") " +
           "FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "GROUP BY COALESCE(NULLIF(TRIM(o.customerName), ''), o.customerEmail, 'Guest Customer') " +
           "ORDER BY MAX(o.createdAt) DESC",
           countQuery = "SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(o.customerName), ''), o.customerEmail, 'Guest Customer')) FROM Order o WHERE o.shop.id = :shopId")
    org.springframework.data.domain.Page<com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse> findCustomerProfilesByShopId(
           @Param("shopId") Long shopId, 
           Pageable pageable);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.createdAt >= :startDate " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED')")
    BigDecimal sumMonthlyRealizedRevenue(@Param("startDate") LocalDateTime startDate);

    @Query("SELECT COALESCE(SUM(o.discountAmount), 0) FROM Order o WHERE o.shop.id = :shopId AND o.orderStatus != 'CANCELLED'")
    BigDecimal sumTotalDiscountByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.shop.id = :shopId AND o.couponCode IS NOT NULL AND o.orderStatus != 'CANCELLED'")
    long countCouponOrdersByShopId(@Param("shopId") Long shopId);

    List<String> CAPACITY_CONSUMING_STATUSES = List.of(
        "NEW", "CONFIRMED", "PREPARING", "READY", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "DELIVERED"
    );

    @Query("SELECT COUNT(o) FROM Order o " +
           "WHERE o.deliverySlot.id = :slotId " +
           "  AND o.deliveryDate = :deliveryDate " +
           "  AND o.orderStatus IN :activeStatuses")
    long countActiveOrdersForSlotAndDate(
        @Param("slotId") Long slotId, 
        @Param("deliveryDate") java.time.LocalDate deliveryDate, 
        @Param("activeStatuses") java.util.Collection<String> activeStatuses
    );

    default long countActiveOrdersForSlotAndDate(Long slotId, java.time.LocalDate deliveryDate) {
        return countActiveOrdersForSlotAndDate(slotId, deliveryDate, CAPACITY_CONSUMING_STATUSES);
    }

    @Query(value = "SELECT COALESCE(MAX(sub.cnt), 0) FROM (" +
                   "  SELECT COUNT(o.id) as cnt FROM orders o " +
                   "  WHERE o.delivery_slot_id = :slotId " +
                   "    AND o.delivery_date >= CURRENT_DATE " +
                   "    AND o.order_status IN ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'DELIVERED') " +
                   "  GROUP BY o.delivery_date" +
                   ") sub", nativeQuery = true)
    int findMaxActiveOrdersOnAnyUpcomingDate(@Param("slotId") Long slotId);
}

