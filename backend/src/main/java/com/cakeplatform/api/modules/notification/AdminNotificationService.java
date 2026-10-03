package com.cakeplatform.api.modules.notification;

import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminNotificationService {

    private final AdminNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Broadcasts an administrative platform notification to all active administrators.
     * Protected by dual-layer idempotency (application-level check + database unique constraint handling).
     */
    @Transactional
    public void dispatchAdminNotification(
            AdminNotificationType type,
            String title,
            String message,
            AdminNotificationPriority priority,
            AdminNotificationCategory category,
            String referenceId,
            String referenceType,
            String actionUrl) {

        List<User> admins = userRepository.findByRole(UserRole.ADMIN);
        if (admins.isEmpty()) {
            // Fallback to a recipient-less broadcast record
            createSingleNotification(null, type, title, message, priority, category, referenceId, referenceType, actionUrl);
            return;
        }

        for (User admin : admins) {
            createSingleNotification(admin, type, title, message, priority, category, referenceId, referenceType, actionUrl);
        }
    }

    /**
     * Creates a single admin notification with dual-layer idempotency protection.
     */
    @Transactional
    public void createSingleNotification(
            User recipient,
            AdminNotificationType type,
            String title,
            String message,
            AdminNotificationPriority priority,
            AdminNotificationCategory category,
            String referenceId,
            String referenceType,
            String actionUrl) {

        Long recipientId = recipient != null ? recipient.getId() : null;

        // 1. Application-level idempotency check
        if (referenceType != null && referenceId != null) {
            boolean exists = recipientId != null
                    ? notificationRepository.existsByTypeAndReferenceTypeAndReferenceIdAndRecipientId(type, referenceType, referenceId, recipientId)
                    : notificationRepository.existsByTypeAndReferenceTypeAndReferenceIdAndRecipientIsNull(type, referenceType, referenceId);

            if (exists) {
                log.info("Idempotent skip: Admin notification type={}, refType={}, refId={}, recipientId={} already exists",
                        type, referenceType, referenceId, recipientId);
                return;
            }
        }

        AdminNotification notification = AdminNotification.builder()
                .type(type)
                .title(title)
                .message(message)
                .priority(priority != null ? priority : AdminNotificationPriority.NORMAL)
                .category(category != null ? category : AdminNotificationCategory.SYSTEM)
                .recipient(recipient)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .actionUrl(actionUrl)
                .isRead(false)
                .build();

        // 2. Database-level idempotency protection
        try {
            AdminNotification saved = notificationRepository.save(notification);
            log.info("Created admin notification [{}]: {} for recipient ID: {}", type, title, recipientId);
            
            if (recipient != null) {
                messagingTemplate.convertAndSend("/queue/admin-notifications-" + recipient.getId(), saved);
            }
        } catch (DataIntegrityViolationException dive) {
            // Caught database unique constraint violation (concurrent race condition duplicate)
            log.warn("Database idempotency caught concurrent duplicate admin notification: type={}, refId={}, recipientId={}",
                    type, referenceId, recipientId);
        }
    }

    /**
     * Retrieve notifications for a specific administrator with category, read status, and search filters.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<AdminNotification> getNotificationsForAdmin(
            Long adminId,
            String categoryStr,
            Boolean isRead,
            String search,
            org.springframework.data.domain.Pageable pageable) {

        AdminNotificationCategory categoryEnum = null;
        if (categoryStr != null && !categoryStr.trim().isEmpty() && !"ALL".equalsIgnoreCase(categoryStr)) {
            try {
                categoryEnum = AdminNotificationCategory.valueOf(categoryStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.debug("Invalid notification category filter: {}", categoryStr);
            }
        }

        return notificationRepository.findWithFilters(
                adminId,
                categoryStr != null ? categoryStr.trim().toUpperCase() : null,
                categoryEnum,
                isRead,
                search != null ? search.trim() : null, pageable
        );
    }

    /**
     * Get unread notifications count for the authenticated admin.
     */
    @Transactional(readOnly = true)
    public long getUnreadCount(Long adminId) {
        return notificationRepository.countUnreadForRecipient(adminId);
    }

    /**
     * Mark a single notification as read.
     */
    @Transactional
    public void markAsRead(Long notificationId, Long adminId) {
        AdminNotification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null) {
            log.warn("Notification ID {} not found to mark read", notificationId);
            return;
        }

        // Security check: Only recipient or broadcast can be marked read
        if (notification.getRecipient() != null && !notification.getRecipient().getId().equals(adminId)) {
            log.warn("Admin ID {} unauthorized to mark notification ID {} read", adminId, notificationId);
            return;
        }

        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    /**
     * Mark all notifications for the authenticated admin as read.
     */
    @Transactional
    public void markAllAsRead(Long adminId) {
        notificationRepository.markAllAsReadForRecipient(adminId);
    }
}
