package com.cakeplatform.api.modules.notification;

import com.cakeplatform.api.exception.ResourceNotFoundException;
import com.cakeplatform.api.modules.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private EmailService emailService;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private NotificationService notificationService;

    private User ownerA;
    private User ownerB;
    private Notification notif1;

    @BeforeEach
    void setUp() {
        ownerA = new User();
        ownerA.setId(101L);
        ownerA.setEmail("ownerA@example.com");

        ownerB = new User();
        ownerB.setId(202L);
        ownerB.setEmail("ownerB@example.com");

        notif1 = Notification.builder()
                .id(1L)
                .recipient(ownerA)
                .type(NotificationType.NEW_ORDER)
                .title("New Order Received!")
                .message("Order #ORD-123 received")
                .referenceId("123")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("createNotification - creates unread notification and dispatches websocket & email")
    void testCreateNotification() {
        when(notificationRepository.save(any(Notification.class))).thenReturn(notif1);
        
        doAnswer(invocation -> {
            NotificationService.NotificationCreatedEvent event = invocation.getArgument(0);
            notificationService.handleNotificationCreatedEvent(event);
            return null;
        }).when(eventPublisher).publishEvent(any(NotificationService.NotificationCreatedEvent.class));

        notificationService.createNotification(
                ownerA,
                NotificationType.NEW_ORDER,
                "New Order Received!",
                "Order #ORD-123 received",
                "123",
                true
        );

        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/queue/notifications-101"), any(Notification.class));
        verify(emailService, times(1)).sendEmail(eq("ownerA@example.com"), eq("New Order Received!"), eq("Order #ORD-123 received"));
    }

    @Test
    @DisplayName("getUserNotifications - returns ordered notifications for user")
    void testGetUserNotifications() {
        when(notificationRepository.findTop50ByRecipientIdOrderByCreatedAtDesc(101L))
                .thenReturn(List.of(notif1));

        List<Notification> result = notificationService.getUserNotifications(101L);

        assertEquals(1, result.size());
        assertEquals("New Order Received!", result.get(0).getTitle());
        verify(notificationRepository).findTop50ByRecipientIdOrderByCreatedAtDesc(101L);
    }

    @Test
    @DisplayName("getUnreadCount - returns unread count for user")
    void testGetUnreadCount() {
        when(notificationRepository.countByRecipientIdAndIsReadFalse(101L)).thenReturn(5L);

        long count = notificationService.getUnreadCount(101L);

        assertEquals(5L, count);
        verify(notificationRepository).countByRecipientIdAndIsReadFalse(101L);
    }

    @Test
    @DisplayName("markAsRead - marks notification as read when owned by authenticated user")
    void testMarkAsRead_Success() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notif1));
        when(notificationRepository.save(any(Notification.class))).thenReturn(notif1);

        notificationService.markAsRead(1L, 101L);

        assertTrue(notif1.getIsRead());
        verify(notificationRepository).save(notif1);
    }

    @Test
    @DisplayName("markAsRead - throws AccessDeniedException when another user attempts to mark as read")
    void testMarkAsRead_AccessDenied() {
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(notif1));

        assertThrows(AccessDeniedException.class, () -> {
            notificationService.markAsRead(1L, 202L);
        });

        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("markAsRead - throws ResourceNotFoundException when notification does not exist")
    void testMarkAsRead_NotFound() {
        when(notificationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            notificationService.markAsRead(999L, 101L);
        });
    }

    @Test
    @DisplayName("markAllAsRead - delegates to repository with correct recipient ID")
    void testMarkAllAsRead() {
        doNothing().when(notificationRepository).markAllAsReadByRecipientId(101L);

        notificationService.markAllAsRead(101L);

        verify(notificationRepository, times(1)).markAllAsReadByRecipientId(101L);
    }
}
