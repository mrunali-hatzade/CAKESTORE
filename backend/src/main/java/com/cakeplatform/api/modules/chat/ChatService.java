package com.cakeplatform.api.modules.chat;

import com.cakeplatform.api.modules.chat.dto.ConversationResponse;
import com.cakeplatform.api.modules.chat.dto.MessageResponse;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public ConversationResponse getActiveConversationForOwner(Long ownerId) {
        return conversationRepository.findByOwnerIdAndStatus(ownerId, ConversationStatus.ACTIVE)
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Transactional
    public ConversationResponse getOrCreateActiveConversationForOwner(Long ownerId) {
        Conversation conversation = conversationRepository.findByOwnerIdAndStatus(ownerId, ConversationStatus.ACTIVE)
                .orElseGet(() -> {
                    User owner = userRepository.findById(ownerId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found"));
                    return conversationRepository.save(Conversation.builder()
                            .owner(owner)
                            .build());
                });
        return mapToResponse(conversation);
    }

    @Transactional
    public MessageResponse sendMessage(Long ownerId, Long senderId, String senderRole, String text) {
        // Find or create conversation for the owner
        Conversation conversation = conversationRepository.findByOwnerIdAndStatus(ownerId, ConversationStatus.ACTIVE)
                .orElseGet(() -> {
                    User owner = userRepository.findById(ownerId)
                            .orElseThrow(() -> new IllegalArgumentException("User not found"));
                    return conversationRepository.save(Conversation.builder()
                            .owner(owner)
                            .build());
                });

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .senderRole(senderRole)
                .messageText(text.trim())
                .build();

        Message saved = messageRepository.save(message);

        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return mapToMessageResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(Long ownerId) {
        Conversation conversation = conversationRepository.findByOwnerIdAndStatus(ownerId, ConversationStatus.ACTIVE)
                .orElse(null);
        if (conversation == null) {
            return List.of();
        }
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markMessagesAsReadForOwner(Long ownerId) {
        Conversation conversation = conversationRepository.findByOwnerIdAndStatus(ownerId, ConversationStatus.ACTIVE)
                .orElse(null);
        if (conversation != null) {
            // Owner marks ADMIN messages as read
            messageRepository.markMessagesAsRead(conversation.getId(), "ADMIN");
        }
    }

    @Transactional
    public void markMessagesAsReadForAdmin(Long ownerId) {
        Conversation conversation = conversationRepository.findByOwnerIdAndStatus(ownerId, ConversationStatus.ACTIVE)
                .orElse(null);
        if (conversation != null) {
            // Admin marks OWNER messages as read
            messageRepository.markMessagesAsRead(conversation.getId(), "SHOP_OWNER");
        }
    }

    @Transactional(readOnly = true)
    public long getUnreadCountForOwner(Long ownerId) {
        return messageRepository.countUnreadMessagesForOwner(ownerId);
    }

    @Transactional(readOnly = true)
    public long getTotalUnreadCountForAdmin() {
        return messageRepository.countTotalUnreadMessagesForAdmin();
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> getAllActiveConversations() {
        // Basic list for admin. A more complex query could sort by updatedAt.
        return conversationRepository.findAll().stream()
                .filter(c -> c.getStatus() == ConversationStatus.ACTIVE)
                .map(this::mapToResponse)
                .sorted((a, b) -> b.getUpdatedAt().compareTo(a.getUpdatedAt()))
                .collect(Collectors.toList());
    }

    private ConversationResponse mapToResponse(Conversation c) {
        List<MessageResponse> msgs = c.getMessages().stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList());

        return ConversationResponse.builder()
                .id(c.getId())
                .ownerId(c.getOwner().getId())
                .status(c.getStatus().name())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .messages(msgs)
                .build();
    }

    private MessageResponse mapToMessageResponse(Message m) {
        return MessageResponse.builder()
                .id(m.getId())
                .senderId(m.getSender().getId())
                .senderRole(m.getSenderRole())
                .text(m.getMessageText())
                .isRead(m.getIsRead())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
