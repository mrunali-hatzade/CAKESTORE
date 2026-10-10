package com.cakeplatform.api.modules.notification;

import com.cakeplatform.api.modules.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;

    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Transactional
    public void createNotification(User recipient, NotificationType type, String title, String message, String referenceId, boolean sendEmail) {
        
        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .isRead(false)
                .build();
                
        notification = notificationRepository.save(notification);
        
        eventPublisher.publishEvent(new NotificationCreatedEvent(notification, sendEmail));
    }

    @org.springframework.transaction.event.TransactionalEventListener(phase = org.springframework.transaction.event.TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleNotificationCreatedEvent(NotificationCreatedEvent event) {
        Notification notification = event.getNotification();
        String destination = "/queue/notifications-" + notification.getRecipient().getId();
        try {
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Pushed notification to WebSocket {}", destination);
        } catch (Exception e) {
            log.error("Failed to push websocket notification: {}", e.getMessage());
        }

        if (event.isSendEmail()) {
            emailService.sendEmail(notification.getRecipient().getEmail(), notification.getTitle(), notification.getMessage());
        }
    }

    @lombok.Value
    public static class NotificationCreatedEvent {
        Notification notification;
        boolean sendEmail;
    }

    @Transactional(readOnly = true)
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findTop50ByRecipientIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUnreadSummary(Long userId) {
        long totalCount = notificationRepository.countByRecipientIdAndIsReadFalse(userId);
        List<Object[]> grouped = notificationRepository.countUnreadGroupedByType(userId);
        
        Map<String, Long> byType = new HashMap<>();
        for (Object[] row : grouped) {
            NotificationType type = (NotificationType) row[0];
            Long count = (Long) row[1];
            byType.put(type.name(), count);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", totalCount);
        response.put("byType", byType);
        return response;
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new com.cakeplatform.api.exception.ResourceNotFoundException("Notification not found with id: " + notificationId));
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized to modify this notification");
        }
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByRecipientId(userId);
    }

    @Transactional
    public void markTypeAsRead(Long userId, NotificationType type) {
        notificationRepository.markTypeAsReadByRecipientId(userId, type);
    }
}
