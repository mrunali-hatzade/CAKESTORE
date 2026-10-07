package com.cakeplatform.api.modules.notification.controller;

import com.cakeplatform.api.modules.notification.AdminNotification;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/notifications")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<AdminNotification>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        log.info("Admin ID {} fetching notifications (category={}, isRead={}, search={})",
                userDetails.getId(), category, isRead, search);

        org.springframework.data.domain.Page<AdminNotification> notifications = adminNotificationService.getNotificationsForAdmin(
                userDetails.getId(), category, isRead, search, org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending()));

        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        long count = adminNotificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {

        log.info("Admin ID {} marking notification ID {} as read", userDetails.getId(), id);
        adminNotificationService.markAsRead(id, userDetails.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/mark-all-read")
    public ResponseEntity<Map<String, Object>> markAllAsReadPost(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("Admin ID {} marking all notifications as read (POST)", userDetails.getId());
        adminNotificationService.markAllAsRead(userDetails.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsReadPatch(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        log.info("Admin ID {} marking all notifications as read (PATCH)", userDetails.getId());
        adminNotificationService.markAllAsRead(userDetails.getId());
        return ResponseEntity.ok(Map.of("success", true));
    }
}
