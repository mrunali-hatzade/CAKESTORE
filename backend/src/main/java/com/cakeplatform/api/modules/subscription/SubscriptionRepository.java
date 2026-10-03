package com.cakeplatform.api.modules.subscription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

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
}
