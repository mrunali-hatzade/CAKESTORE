package com.cakeplatform.api.modules.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    long countByRecipientIdAndIsReadFalse(Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :recipientId AND n.isRead = false")
    void markAllAsReadByRecipientId(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient.id = :recipientId AND n.type = :type AND n.isRead = false")
    void markTypeAsReadByRecipientId(@Param("recipientId") Long recipientId, @Param("type") NotificationType type);

    @Query("SELECT n.type, COUNT(n) FROM Notification n WHERE n.recipient.id = :recipientId AND n.isRead = false GROUP BY n.type")
    List<Object[]> countUnreadGroupedByType(@Param("recipientId") Long recipientId);

    void deleteByRecipientId(Long recipientId);
}

