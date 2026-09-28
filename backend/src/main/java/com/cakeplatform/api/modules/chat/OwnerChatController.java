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
@RequestMapping("/api/owner/chat")
@RequiredArgsConstructor
public class OwnerChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<ConversationResponse> getActiveConversation(@AuthenticationPrincipal CustomUserDetails userDetails) {
        ConversationResponse response = chatService.getActiveConversationForOwner(userDetails.getId());
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/conversations")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<ConversationResponse> createActiveConversation(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(chatService.getOrCreateActiveConversationForOwner(userDetails.getId()));
    }

    @GetMapping("/messages")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<List<MessageResponse>> getMessages(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(chatService.getMessages(userDetails.getId()));
    }

    @PostMapping("/messages")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<MessageResponse> sendMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody CreateMessageRequest request) {
        return ResponseEntity.ok(chatService.sendMessage(userDetails.getId(), userDetails.getId(), "SHOP_OWNER", request.getText()));
    }

    @PatchMapping("/read")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<Void> markMessagesAsRead(@AuthenticationPrincipal CustomUserDetails userDetails) {
        chatService.markMessagesAsReadForOwner(userDetails.getId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@AuthenticationPrincipal CustomUserDetails userDetails) {
        long count = chatService.getUnreadCountForOwner(userDetails.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }
}
