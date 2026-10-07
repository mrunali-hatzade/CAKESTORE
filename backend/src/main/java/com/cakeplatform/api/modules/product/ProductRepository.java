package com.cakeplatform.api.modules.product;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    @Query("SELECT p FROM Product p WHERE p.shop.id = :shopId")
    List<Product> findByShopId(@Param("shopId") Long shopId);

    @Query(value = "SELECT p FROM Product p LEFT JOIN p.category c WHERE p.shop.id = :shopId " +
           "AND (:query IS NULL OR :query = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:categoryId IS NULL OR (:categoryId = -1 AND c.id IS NULL) OR c.id = :categoryId)",
           countQuery = "SELECT count(p) FROM Product p LEFT JOIN p.category c WHERE p.shop.id = :shopId " +
           "AND (:query IS NULL OR :query = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(p.description, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "AND (:categoryId IS NULL OR (:categoryId = -1 AND c.id IS NULL) OR c.id = :categoryId)")
    org.springframework.data.domain.Page<Product> findByShopIdWithFilters(
            @Param("shopId") Long shopId, 
            @Param("query") String query, 
            @Param("categoryId") Long categoryId, 
            Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.id = :id AND p.shop.id = :shopId")
    Optional<Product> findByIdAndShopId(@Param("id") Long id, @Param("shopId") Long shopId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.id = :shopId")
    long countByShopId(@Param("shopId") Long shopId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.shop.id = :shopId AND p.status = :status AND p.availability = :availability")
    long countByShopIdAndStatusAndAvailability(@Param("shopId") Long shopId, 
                                                @Param("status") String status, 
                                                @Param("availability") Boolean availability);
    
    @Query("SELECT COUNT(p) FROM Product p WHERE p.category.id = :categoryId")
    long countByCategoryId(@Param("categoryId") Long categoryId);

    @Query("SELECT p FROM Product p WHERE p.shop.id = :shopId AND p.category.id = :categoryId")
    List<Product> findByShopIdAndCategoryId(@Param("shopId") Long shopId, @Param("categoryId") Long categoryId);

    @Modifying
    @Query("UPDATE Product p SET p.category.id = :targetId WHERE p.category.id = :sourceId AND p.shop.id = :shopId")
    int reassignCategory(@Param("sourceId") Long sourceId,
                         @Param("targetId") Long targetId,
                         @Param("shopId") Long shopId);

    @Query("SELECT p FROM Product p " +
           "LEFT JOIN ProductReview pr ON pr.product.id = p.id " +
           "WHERE p.shop.id = :shopId AND p.status = 'ACTIVE' AND p.availability = true " +
           "GROUP BY p " +
           "ORDER BY COALESCE(AVG(pr.rating), 0) DESC, COUNT(pr.id) DESC")
    List<Product> findTopRatedProducts(@Param("shopId") Long shopId, Pageable pageable);
}
