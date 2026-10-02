package com.cakeplatform.api.modules.communication;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContactEnquiryRepository extends JpaRepository<ContactEnquiry, Long> {

    @Query("SELECT e FROM ContactEnquiry e " +
           "WHERE (:isRead IS NULL OR e.isRead = :isRead) " +
           "  AND (:search IS NULL OR :search = '' OR " +
           "       LOWER(e.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(e.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(e.subject) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(e.message) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<ContactEnquiry> findWithFilters(@Param("isRead") Boolean isRead, @Param("search") String search, org.springframework.data.domain.Pageable pageable);

    long countByIsReadFalse();
}
