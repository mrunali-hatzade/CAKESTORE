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

    @org.springframework.data.jpa.repository.Query("SELECT f FROM Feedback f WHERE f.shop.id = :shopId AND f.isApproved = true AND f.deletedAt IS NULL " +
           "AND (" +
           "   (f.product.id = :productId) " +
           "   OR (:productName != '' AND f.productName IS NOT NULL AND LOWER(f.productName) = LOWER(:productName)) " +
           "   OR (:productName != '' AND f.comment IS NOT NULL AND LOWER(f.comment) LIKE LOWER(CONCAT('%[', :productName, ']%'))) " +
           ") ORDER BY f.createdAt DESC")
    List<Feedback> findProductFeedback(@org.springframework.data.repository.query.Param("shopId") Long shopId, 
                                       @org.springframework.data.repository.query.Param("productId") Long productId, 
                                       @org.springframework.data.repository.query.Param("productName") String productName);

    @org.springframework.data.jpa.repository.Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.shop.id = :shopId AND f.isApproved = true AND f.deletedAt IS NULL")
    Double calculateAverageRatingByShopId(@org.springframework.data.repository.query.Param("shopId") Long shopId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(f) FROM Feedback f WHERE f.shop.id = :shopId AND f.isApproved = true AND f.deletedAt IS NULL")
    Long countApprovedByShopId(@org.springframework.data.repository.query.Param("shopId") Long shopId);

    void deleteByShopId(Long shopId);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM Feedback f WHERE f.shop.id = :shopId AND f.deletedAt IS NULL " +
           "AND (:rating IS NULL OR f.rating = :rating) " +
           "AND (:query IS NULL OR :query = '' " +
           "  OR LOWER(f.customerDisplayName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(f.customerEmail) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(f.comment) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY f.createdAt DESC")
    org.springframework.data.domain.Page<Feedback> searchFeedbackByShopId(
            @org.springframework.data.repository.query.Param("shopId") Long shopId, 
            @org.springframework.data.repository.query.Param("rating") Integer rating, 
            @org.springframework.data.repository.query.Param("query") String query, 
            org.springframework.data.domain.Pageable pageable);
}
