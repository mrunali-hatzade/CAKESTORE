package com.cakeplatform.api.modules.interaction;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnquiryRepository extends JpaRepository<Enquiry, Long> {
    List<Enquiry> findByShopIdOrderByCreatedAtDesc(Long shopId);
    Optional<Enquiry> findByIdAndShopId(Long id, Long shopId);
    void deleteByShopId(Long shopId);

    @Query("SELECT e FROM Enquiry e WHERE e.shop.id = :shopId " +
           "AND (LOWER(e.customerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(e.customerEmail) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(e.customerMobile, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(e.message) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(e.enquiryType) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY e.createdAt DESC")
    List<Enquiry> searchEnquiriesByShopId(@Param("shopId") Long shopId, @Param("query") String query, Pageable pageable);
}
