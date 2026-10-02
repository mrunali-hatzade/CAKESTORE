package com.cakeplatform.api.modules.communication;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlatformFeedbackRepository extends JpaRepository<PlatformFeedback, Long> {

    @Query("SELECT f FROM PlatformFeedback f LEFT JOIN f.shop s LEFT JOIN f.owner o " +
           "WHERE (:isRead IS NULL OR f.isRead = :isRead) " +
           "  AND (:search IS NULL OR :search = '' OR " +
           "       LOWER(f.message) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(o.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(o.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(s.businessName) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<PlatformFeedback> findWithFilters(@Param("isRead") Boolean isRead, @Param("search") String search, org.springframework.data.domain.Pageable pageable);

    long countByIsReadFalse();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("DELETE FROM PlatformFeedback f WHERE f.owner.id = :ownerId")
    void deleteByOwnerId(@Param("ownerId") Long ownerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("DELETE FROM PlatformFeedback f WHERE f.shop.id = :shopId")
    void deleteByShopId(@Param("shopId") Long shopId);
}
