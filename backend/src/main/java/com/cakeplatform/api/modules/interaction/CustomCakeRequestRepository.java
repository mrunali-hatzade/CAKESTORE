package com.cakeplatform.api.modules.interaction;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomCakeRequestRepository extends JpaRepository<CustomCakeRequest, Long> {
    List<CustomCakeRequest> findByShopIdOrderByCreatedAtDesc(Long shopId);
    Optional<CustomCakeRequest> findByIdAndShopId(Long id, Long shopId);
    void deleteByShopId(Long shopId);

    @Query("SELECT c FROM CustomCakeRequest c WHERE c.shop.id = :shopId " +
           "AND (LOWER(c.customerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(c.customerEmail) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(c.customerMobile, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(c.occasion, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(c.flavour, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(c.designDescription, '')) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY c.createdAt DESC")
    List<CustomCakeRequest> searchCustomCakesByShopId(@Param("shopId") Long shopId, @Param("query") String query, Pageable pageable);
}
