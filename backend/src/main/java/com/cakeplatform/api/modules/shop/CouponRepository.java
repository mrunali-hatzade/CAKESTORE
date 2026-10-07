package com.cakeplatform.api.modules.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, Long> {
    List<Coupon> findByShopId(Long shopId);
    org.springframework.data.domain.Page<Coupon> findByShopId(Long shopId, org.springframework.data.domain.Pageable pageable);
    
    @Query("SELECT c FROM Coupon c WHERE c.shop.id = :shopId " +
           "AND (:search IS NULL OR :search = '' OR LOWER(c.code) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (" +
           "  :status IS NULL OR :status = 'ALL' " +
           "  OR (:status = 'ACTIVE' AND c.isActive = true AND (c.expiryDate IS NULL OR c.expiryDate >= CURRENT_DATE) AND (c.startDate IS NULL OR c.startDate <= CURRENT_DATE)) " +
           "  OR (:status = 'EXPIRED' AND (c.isActive = false OR (c.expiryDate IS NOT NULL AND c.expiryDate < CURRENT_DATE))) " +
           "  OR (:status = 'SCHEDULED' AND c.isActive = true AND c.startDate IS NOT NULL AND c.startDate > CURRENT_DATE)" +
           ") ORDER BY c.createdAt DESC")
    org.springframework.data.domain.Page<Coupon> findByShopIdWithFilters(
            @Param("shopId") Long shopId, 
            @Param("search") String search, 
            @Param("status") String status, 
            org.springframework.data.domain.Pageable pageable);
    Optional<Coupon> findByShopIdAndCode(Long shopId, String code);
    Optional<Coupon> findByShopIdAndCodeIgnoreCase(Long shopId, String code);
    Optional<Coupon> findByIdAndShopId(Long id, Long shopId);
    long countByShopId(Long shopId);
    long countByShopIdAndIsActiveTrue(Long shopId);

    @Modifying
    @Query("UPDATE Coupon c SET c.usedCount = c.usedCount + 1 WHERE c.id = :couponId AND (c.usageLimit IS NULL OR c.usedCount < c.usageLimit)")
    int incrementUsedCountIfWithinLimit(@Param("couponId") Long couponId);

    @Modifying
    @Query("UPDATE Coupon c SET c.usedCount = CASE WHEN c.usedCount > 0 THEN c.usedCount - 1 ELSE 0 END WHERE c.id = :couponId")
    int decrementUsedCount(@Param("couponId") Long couponId);

    void deleteByShopId(Long shopId);
}


