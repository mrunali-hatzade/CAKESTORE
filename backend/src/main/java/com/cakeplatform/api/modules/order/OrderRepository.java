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

    @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED')) " +
           "ORDER BY o.createdAt DESC")
    List<Order> findVisibleOrdersByShopId(@Param("shopId") Long shopId);

    @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED')) " +
           "ORDER BY o.createdAt DESC")
    org.springframework.data.domain.Page<Order> findVisibleOrdersByShopId(@Param("shopId") Long shopId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.shop.id = :shopId " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED')) " +
           "AND (LOWER(o.orderNumber) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(o.customerName, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(o.customerPhone, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(o.customerEmail, '')) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY o.createdAt DESC")
    List<Order> searchOrdersByShopId(@Param("shopId") Long shopId, @Param("query") String query, Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.shop.id = :shopId " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED'))")
    long countVisibleOrdersByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.shop.id = :shopId " +
           "AND UPPER(COALESCE(o.orderStatus, '')) IN ('NEW', 'PENDING', 'CONFIRMED', 'PREPARING') " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED'))")
    long countPendingOrdersByShopId(@Param("shopId") Long shopId);

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

    @Query("SELECT o FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "  AND o.createdAt >= :startDate " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "           AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED')) " +
           "ORDER BY o.createdAt ASC")
    List<Order> findRecentValidOrders(@Param("shopId") Long shopId, @Param("startDate") LocalDateTime startDate);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "           AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED'))")
    BigDecimal sumGrossSalesByShopId(@Param("shopId") Long shopId);

    @Query("SELECT oi.productNameSnapshot, SUM(oi.quantity) " +
           "FROM OrderItem oi " +
           "WHERE oi.order.shop.id = :shopId " +
           "  AND UPPER(COALESCE(oi.order.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(oi.order.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(oi.order.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(oi.order.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED') " +
           "GROUP BY oi.productNameSnapshot " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> findTopSellingProductsByShopId(@Param("shopId") Long shopId, Pageable pageable);

    @Query("SELECT oi.productNameSnapshot, SUM(oi.quantity), SUM(oi.totalPrice), MAX(oi.productImageUrl) " +
           "FROM OrderItem oi " +
           "WHERE oi.order.shop.id = :shopId " +
           "  AND UPPER(COALESCE(oi.order.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(oi.order.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(oi.order.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(oi.order.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED') " +
           "GROUP BY oi.productNameSnapshot " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> findTopSellingProductsWithRevenueByShopId(@Param("shopId") Long shopId, Pageable pageable);

    @Query("SELECT o.orderStatus, COUNT(o) FROM Order o WHERE o.shop.id = :shopId " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED')) " +
           "GROUP BY o.orderStatus")
    List<Object[]> countOrdersByStatusForShop(@Param("shopId") Long shopId);

    @Query("SELECT COALESCE(o.paymentMethod, 'OTHER'), COUNT(o), SUM(o.totalAmount) FROM Order o WHERE o.shop.id = :shopId " +
           "AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED') " +
           "GROUP BY COALESCE(o.paymentMethod, 'OTHER')")
    List<Object[]> sumRevenueByPaymentMethodForShop(@Param("shopId") Long shopId);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0), COUNT(o) FROM Order o WHERE o.shop.id = :shopId " +
           "AND UPPER(COALESCE(o.paymentMethod, '')) IN ('COD', 'CASH_ON_DELIVERY') " +
           "AND UPPER(COALESCE(o.paymentStatus, '')) = 'PENDING' " +
           "AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED'")
    List<Object[]> sumPendingCodForShop(@Param("shopId") Long shopId);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0), COUNT(o) FROM Order o WHERE o.shop.id = :shopId " +
           "AND UPPER(COALESCE(o.paymentMethod, '')) IN ('COD', 'CASH_ON_DELIVERY') " +
           "AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED') " +
           "AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED'")
    List<Object[]> sumCollectedCodForShop(@Param("shopId") Long shopId);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0), COUNT(o) FROM Order o WHERE o.shop.id = :shopId " +
           "AND UPPER(COALESCE(o.paymentMethod, '')) NOT IN ('COD', 'CASH_ON_DELIVERY') " +
           "AND UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') " +
           "AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED') " +
           "AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED'")
    List<Object[]> sumCollectedOnlineForShop(@Param("shopId") Long shopId);

    org.springframework.data.domain.Page<Order> findByCustomerPhoneOrderByCreatedAtDesc(String customerPhone, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.customerPhone = :customerPhone " +
           "AND NOT (UPPER(COALESCE(o.paymentMethod, '')) IN ('ONLINE_PAYMENT', 'RAZORPAY') " +
           "         AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('PAID', 'COMPLETED')) " +
           "ORDER BY o.createdAt DESC")
    org.springframework.data.domain.Page<Order> findVisibleOrdersByCustomerPhone(@Param("customerPhone") String customerPhone, Pageable pageable);

    List<Order> findByShopIdAndCustomerEmailOrderByCreatedAtDesc(Long shopId, String customerEmail);

    List<Order> findByShopIdAndCustomerPhoneOrderByCreatedAtDesc(Long shopId, String customerPhone);

    List<Order> findByShopIdAndCustomerNameOrderByCreatedAtDesc(Long shopId, String customerName);

    @Query("SELECT DISTINCT o.customerEmail FROM Order o WHERE o.shop.id = :shopId AND o.customerEmail IS NOT NULL")
    List<String> findUniqueCustomerEmailsByShopId(@Param("shopId") Long shopId);

    @Query(value = "SELECT new com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse(" +
           "  COALESCE(MAX(o.customerName), MAX(o.customerEmail), 'Guest Customer'), " +
           "  MAX(o.customerEmail), " +
           "  MAX(o.customerPhone), " +
           "  MAX(o.deliveryAddress), " +
           "  COUNT(o.id), " +
           "  SUM(CASE WHEN UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED') THEN o.totalAmount ELSE 0 END), " +
           "  MAX(o.createdAt) " +
           ") " +
           "FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "GROUP BY COALESCE(NULLIF(TRIM(LOWER(o.customerEmail)), ''), NULLIF(TRIM(o.customerPhone), ''), NULLIF(TRIM(o.customerName), ''), 'Guest Customer') " +
           "ORDER BY MAX(o.createdAt) DESC",
           countQuery = "SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(LOWER(o.customerEmail)), ''), NULLIF(TRIM(o.customerPhone), ''), NULLIF(TRIM(o.customerName), ''), 'Guest Customer')) FROM Order o WHERE o.shop.id = :shopId")
    org.springframework.data.domain.Page<com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse> findCustomerProfilesByShopId(
           @Param("shopId") Long shopId, 
           Pageable pageable);

    @Query(value = "SELECT new com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse(" +
           "  COALESCE(MAX(o.customerName), MAX(o.customerEmail), 'Guest Customer'), " +
           "  MAX(o.customerEmail), " +
           "  MAX(o.customerPhone), " +
           "  MAX(o.deliveryAddress), " +
           "  COUNT(o.id), " +
           "  SUM(CASE WHEN UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED') THEN o.totalAmount ELSE 0 END), " +
           "  MAX(o.createdAt) " +
           ") " +
           "FROM Order o " +
           "WHERE o.shop.id = :shopId " +
           "  AND (LOWER(COALESCE(o.customerName, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "    OR LOWER(COALESCE(o.customerEmail, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "    OR LOWER(COALESCE(o.customerPhone, '')) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "GROUP BY COALESCE(NULLIF(TRIM(LOWER(o.customerEmail)), ''), NULLIF(TRIM(o.customerPhone), ''), NULLIF(TRIM(o.customerName), ''), 'Guest Customer') " +
           "ORDER BY MAX(o.createdAt) DESC")
    List<com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse> searchCustomerProfilesByShopId(
           @Param("shopId") Long shopId, 
           @Param("query") String query, 
           Pageable pageable);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.createdAt >= :startDate " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED')")
    BigDecimal sumMonthlyRealizedRevenue(@Param("startDate") LocalDateTime startDate);

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED')")
    BigDecimal sumTotalRealizedRevenue();

    @Query("SELECT COALESCE(SUM(o.totalAmount), 0) FROM Order o " +
           "WHERE o.createdAt >= :startDate AND o.createdAt <= :endDate " +
           "  AND UPPER(COALESCE(o.orderStatus, '')) != 'CANCELLED' " +
           "  AND (UPPER(COALESCE(o.paymentStatus, '')) IN ('PAID', 'COMPLETED') OR UPPER(COALESCE(o.orderStatus, '')) IN ('COMPLETED', 'DELIVERED')) " +
           "  AND UPPER(COALESCE(o.paymentStatus, '')) NOT IN ('REFUNDED', 'FAILED')")
    BigDecimal sumRealizedRevenueBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

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

