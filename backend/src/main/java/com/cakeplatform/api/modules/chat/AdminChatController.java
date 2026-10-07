package com.cakeplatform.api.modules.chat;

import com.cakeplatform.api.modules.chat.dto.ConversationResponse;
import com.cakeplatform.api.modules.chat.dto.CreateMessageRequest;
import com.cakeplatform.api.modules.chat.dto.MessageResponse;
import com.cakeplatform.api.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/chat")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> getConversations() {
        return ResponseEntity.ok(chatService.getAllActiveConversations());
    }

    @GetMapping("/conversations/{ownerId}/messages")
    public ResponseEntity<List<MessageResponse>> getMessages(@PathVariable Long ownerId) {
        return ResponseEntity.ok(chatService.getMessages(ownerId));
    }

    @PostMapping("/conversations/{ownerId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long ownerId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CreateMessageRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(ownerId, userDetails.getId(), "ADMIN", request.getText()));
    }

    @PatchMapping("/conversations/{ownerId}/read")
    public ResponseEntity<Void> markMessagesAsRead(@PathVariable Long ownerId) {
        chatService.markMessagesAsReadForAdmin(ownerId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        long count = chatService.getTotalUnreadCountForAdmin();
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }
}
