package com.cakeplatform.api.modules.subscription;

import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.modules.shop.Shop;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SubscriptionSchedulerTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;
    
    @Mock
    private SubscriptionService subscriptionService;
    
    @Mock
    private NotificationService notificationService;
    
    @Mock
    private AdminNotificationService adminNotificationService;

    @InjectMocks
    private SubscriptionScheduler subscriptionScheduler;

    @BeforeEach
    void setUp() {
    }

    @Test
    void testSchedulerProcessesActiveSubscriptionsAndExpires() {
        Subscription activeToDie = new Subscription();
        activeToDie.setId(10L);
        activeToDie.setStatus(SubscriptionStatus.ACTIVE);
        activeToDie.setExpiryDate(LocalDateTime.now().minusDays(1)); // expired
        Shop shop = new Shop();
        shop.setId(1L);
        activeToDie.setShop(shop);

        Subscription activeToLive = new Subscription();
        activeToLive.setId(20L);
        activeToLive.setStatus(SubscriptionStatus.ACTIVE);
        activeToLive.setExpiryDate(LocalDateTime.now().plusDays(20)); // not expiring
        activeToLive.setShop(shop);

        when(subscriptionRepository.findByStatus(SubscriptionStatus.ACTIVE))
                .thenReturn(List.of(activeToDie, activeToLive));

        subscriptionScheduler.processSubscriptionExpiries();

        // Verify only ACTIVE subscriptions were requested
        verify(subscriptionRepository).findByStatus(SubscriptionStatus.ACTIVE);
        // Verify we no longer use findAll()
        verify(subscriptionRepository, never()).findAll();
        
        // Verify expiration behavior remains unchanged
        verify(subscriptionService).expireSubscription(10L);
        verify(subscriptionService, never()).expireSubscription(20L);
    }
}
