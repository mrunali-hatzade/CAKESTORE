package com.cakeplatform.api.modules.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    @Query("SELECT n FROM AdminNotification n " +
           "WHERE (n.recipient.id = :recipientId OR n.recipient IS NULL) " +
           "  AND (:category IS NULL OR :category = 'ALL' OR n.category = :categoryEnum) " +
           "  AND (:isRead IS NULL OR n.isRead = :isRead) " +
           "  AND (:search IS NULL OR :search = '' OR " +
           "       LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "       LOWER(n.message) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<AdminNotification> findWithFilters(
            @Param("recipientId") Long recipientId,
            @Param("category") String category,
            @Param("categoryEnum") AdminNotificationCategory categoryEnum,
            @Param("isRead") Boolean isRead,
            @Param("search") String search,
            org.springframework.data.domain.Pageable pageable
    );

    @Query("SELECT COUNT(n) FROM AdminNotification n " +
           "WHERE (n.recipient.id = :recipientId OR n.recipient IS NULL) " +
           "  AND n.isRead = false")
    long countUnreadForRecipient(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("UPDATE AdminNotification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP " +
           "WHERE (n.recipient.id = :recipientId OR n.recipient IS NULL) AND n.isRead = false")
    int markAllAsReadForRecipient(@Param("recipientId") Long recipientId);

    boolean existsByTypeAndReferenceTypeAndReferenceIdAndRecipientId(
            AdminNotificationType type,
            String referenceType,
            String referenceId,
            Long recipientId
    );

    boolean existsByTypeAndReferenceTypeAndReferenceIdAndRecipientIsNull(
            AdminNotificationType type,
            String referenceType,
            String referenceId
    );

    Optional<AdminNotification> findByIdAndRecipientId(Long id, Long recipientId);
}
