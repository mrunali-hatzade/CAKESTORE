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

