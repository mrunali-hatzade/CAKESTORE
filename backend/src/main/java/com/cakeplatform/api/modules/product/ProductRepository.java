package com.cakeplatform.api.modules.product;

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
}
