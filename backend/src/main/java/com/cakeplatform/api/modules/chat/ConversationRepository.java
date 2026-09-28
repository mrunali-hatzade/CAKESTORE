package com.cakeplatform.api.modules.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    Optional<Conversation> findByOwnerIdAndStatus(Long ownerId, ConversationStatus status);
}
