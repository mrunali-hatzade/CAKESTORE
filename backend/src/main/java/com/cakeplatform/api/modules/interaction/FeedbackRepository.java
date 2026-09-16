package com.cakeplatform.api.modules.interaction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByShopIdAndDeletedAtIsNullOrderByCreatedAtDesc(Long shopId);
    List<Feedback> findByShopIdAndIsApprovedTrueAndDeletedAtIsNullOrderByCreatedAtDesc(Long shopId);
    Optional<Feedback> findByIdAndShopId(Long id, Long shopId);

    @org.springframework.data.jpa.repository.Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.shop.id = :shopId AND f.isApproved = true AND f.deletedAt IS NULL")
    Double calculateAverageRatingByShopId(@org.springframework.data.repository.query.Param("shopId") Long shopId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(f) FROM Feedback f WHERE f.shop.id = :shopId AND f.isApproved = true AND f.deletedAt IS NULL")
    Long countApprovedByShopId(@org.springframework.data.repository.query.Param("shopId") Long shopId);

    void deleteByShopId(Long shopId);
}
