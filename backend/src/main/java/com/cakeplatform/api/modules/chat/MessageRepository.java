package com.cakeplatform.api.modules.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.owner.id = :ownerId AND m.senderRole = 'ADMIN' AND m.isRead = false")
    long countUnreadMessagesForOwner(@Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.senderRole = 'SHOP_OWNER' AND m.isRead = false")
    long countTotalUnreadMessagesForAdmin();

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.conversation.id = :conversationId AND m.senderRole = :senderRole AND m.isRead = false")
    void markMessagesAsRead(@Param("conversationId") Long conversationId, @Param("senderRole") String senderRole);
}
