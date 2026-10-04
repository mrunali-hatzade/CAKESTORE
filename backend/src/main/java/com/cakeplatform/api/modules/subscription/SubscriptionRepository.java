package com.cakeplatform.api.modules.subscription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;


import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByShopId(Long shopId);
    Optional<Subscription> findFirstByShopIdOrderByCreatedAtDesc(Long shopId);
    Optional<Subscription> findFirstByShopIdAndStatusOrderByCreatedAtDesc(Long shopId, SubscriptionStatus status);
    List<Subscription> findByStatus(SubscriptionStatus status);
    long countByStatus(SubscriptionStatus status);
    long countByStatusAndCreatedAtBetween(SubscriptionStatus status, java.time.LocalDateTime start, java.time.LocalDateTime end);
    void deleteByShopId(Long shopId);

    @Query("SELECT COUNT(DISTINCT s.shop.id) FROM Subscription s WHERE s.status = :status")
    long countUniqueShopsByStatus(@Param("status") SubscriptionStatus status);

    @Query("SELECT COUNT(DISTINCT s.shop.id) FROM Subscription s WHERE s.status = :status AND s.shop.id NOT IN (SELECT sub.shop.id FROM Subscription sub WHERE sub.status = 'ACTIVE')")
    long countUniqueShopsByStatusExcludingActive(@Param("status") SubscriptionStatus status);

    @Query("SELECT COUNT(DISTINCT s.shop.id) FROM Subscription s WHERE s.status = :status AND s.createdAt >= :startDate AND s.createdAt <= :endDate")
    long countUniqueShopsByStatusBetween(@Param("status") SubscriptionStatus status, @Param("startDate") java.time.LocalDateTime startDate, @Param("endDate") java.time.LocalDateTime endDate);

    @Query("SELECT COUNT(DISTINCT s.shop.id) FROM Subscription s WHERE s.status = :status AND s.createdAt >= :startDate AND s.createdAt <= :endDate AND s.shop.id NOT IN (SELECT sub.shop.id FROM Subscription sub WHERE sub.status = 'ACTIVE')")
    long countUniqueShopsByStatusExcludingActiveBetween(@Param("status") SubscriptionStatus status, @Param("startDate") java.time.LocalDateTime startDate, @Param("endDate") java.time.LocalDateTime endDate);

}
