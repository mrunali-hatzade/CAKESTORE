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
           "AND (:status IS NULL OR :status = '' OR UPPER(e.status) = UPPER(:status)) " +
           "AND (:type IS NULL OR :type = '' OR UPPER(e.enquiryType) = UPPER(:type)) " +
           "AND (:query IS NULL OR :query = '' " +
           "  OR LOWER(e.customerName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(e.customerEmail) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(COALESCE(e.customerMobile, '')) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "  OR LOWER(e.message) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY e.createdAt DESC")
    org.springframework.data.domain.Page<Enquiry> searchEnquiriesByShopId(@Param("shopId") Long shopId, @Param("status") String status, @Param("type") String type, @Param("query") String query, Pageable pageable);
}
