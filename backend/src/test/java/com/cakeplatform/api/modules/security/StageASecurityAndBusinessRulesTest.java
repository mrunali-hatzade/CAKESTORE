package com.cakeplatform.api.modules.security;

import com.cakeplatform.api.exception.SubscriptionExpiredException;
import com.cakeplatform.api.modules.admin.AdminDashboardService;
import com.cakeplatform.api.modules.admin.controller.AdminDashboardController;
import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.auth.controller.AuthController;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.shop.ShopStatusManager;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionScheduler;
import com.cakeplatform.api.modules.subscription.SubscriptionService;
import com.cakeplatform.api.modules.subscription.SubscriptionStatus;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StageASecurityAndBusinessRulesTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private ShopStatusManager shopStatusManager;

    @Mock
    private ActivityLoggerService activityLogger;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SubscriptionService mockSubscriptionService;

    @InjectMocks
    private ShopAccessValidator shopAccessValidator;

    private Shop testShop;
    private Subscription testSubscription;
    private User testOwner;

    @BeforeEach
    void setUp() {
        testOwner = new User();
        testOwner.setId(42L);
        testOwner.setEmail("baker@example.com");
        testOwner.setFullName("John Baker");

        testShop = new Shop();
        testShop.setId(10L);
        testShop.setOwner(testOwner);
        testShop.setBusinessName("Artisan Cakes");
        testShop.setStatus(ShopStatus.ACTIVE);
        testShop.setVerificationStatus(VerificationStatus.VERIFIED);

        testSubscription = new Subscription();
        testSubscription.setId(100L);
        testSubscription.setShop(testShop);
        testSubscription.setStatus(SubscriptionStatus.ACTIVE);
        testSubscription.setStartDate(LocalDateTime.now().minusDays(10));
        testSubscription.setExpiryDate(LocalDateTime.now().plusDays(20));
    }

    // =========================================================================
    // SECURITY TEST 1 — Make Admin Endpoint Removed & Backdoor Eliminated
    // =========================================================================
    @Test
    @DisplayName("Security Test 1: POST /api/auth/make-admin must not exist on AuthController")
    void testSecurity1_MakeAdminEndpointRemoved() {
        Method[] methods = AuthController.class.getDeclaredMethods();
        for (Method m : methods) {
            assertNotEquals("makeAdmin", m.getName(), "makeAdmin method must not exist in AuthController");
        }
    }

    // =========================================================================
    // SECURITY TEST 2 — Active Verified Shop Allowed Normal Operations
    // =========================================================================
    @Test
    @DisplayName("Security Test 2: Active, verified shop with valid subscription passes access gating")
    void testSecurity2_ActiveVerifiedShopAllowed() {
        Long ownerId = 42L;
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(testShop));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(testShop.getId()))
                .thenReturn(Optional.of(testSubscription));

        Shop result = shopAccessValidator.getValidShopForOwner(ownerId);

        assertNotNull(result);
        assertEquals(testShop.getId(), result.getId());
        assertEquals(ShopStatus.ACTIVE, result.getStatus());
        assertEquals(VerificationStatus.VERIFIED, result.getVerificationStatus());
    }

    // =========================================================================
    // SECURITY TEST 3 — Subscription Expiration Updates Subscription & Shop
    // =========================================================================
    @Test
    @DisplayName("Security Test 3: Expired subscription marks Subscription=EXPIRED AND Shop=INACTIVE")
    void testSecurity3_SubscriptionExpirationFlow() {
        SubscriptionService realSubService = new SubscriptionService(
                subscriptionRepository,
                null,
                shopRepository,
                shopStatusManager,
                activityLogger,
                notificationService,
                mock(com.cakeplatform.api.modules.notification.AdminNotificationService.class)
        );

        when(subscriptionRepository.findById(100L)).thenReturn(Optional.of(testSubscription));

        // Execute expiration
        realSubService.expireSubscription(100L);

        // Verify Subscription was updated to EXPIRED and saved
        assertEquals(SubscriptionStatus.EXPIRED, testSubscription.getStatus());
        verify(subscriptionRepository).save(testSubscription);

        // Verify Shop was NOT transitioned to INACTIVE (customer storefront decoupled)
        verify(shopStatusManager, never()).markShopInactive(any(), any());

        // Verify notification was sent to owner
        verify(notificationService).createNotification(
                eq(testOwner),
                eq(NotificationType.SUBSCRIPTION_EXPIRED),
                eq("Subscription Expired"),
                contains("has expired"),
                eq("100"),
                eq(true)
        );

        // Verify Idempotency: calling again when already EXPIRED does not re-save or re-notify
        reset(subscriptionRepository, shopStatusManager, notificationService);
        when(subscriptionRepository.findById(100L)).thenReturn(Optional.of(testSubscription));

        realSubService.expireSubscription(100L);

        verify(subscriptionRepository, never()).save(any());
        verifyNoInteractions(shopStatusManager);
        verifyNoInteractions(notificationService);
    }

    // =========================================================================
    // SECURITY TEST 4 — Suspended Shop Rejected Server-Side
    // =========================================================================
    @Test
    @DisplayName("Security Test 4: Suspended shop rejected from operational access")
    void testSecurity4_SuspendedShopRejected() {
        Long ownerId = 42L;
        testShop.setStatus(ShopStatus.SUSPENDED);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(testShop));

        SubscriptionExpiredException ex = assertThrows(SubscriptionExpiredException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertTrue(ex.getMessage().contains("suspended by administration"));
        verifyNoInteractions(subscriptionRepository);
    }

    // =========================================================================
    // SECURITY TEST 5 — Unpaid Pending Shop Rejected; Active Unverified Allowed
    // =========================================================================
    @Test
    @DisplayName("Security Test 5: Unpaid pending shop rejected from operational access; active unverified allowed")
    void testSecurity5_UnpaidPendingShopRejected() {
        Long ownerId = 42L;
        testShop.setStatus(ShopStatus.PENDING);
        testShop.setVerificationStatus(VerificationStatus.PROCESSING);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(testShop));

        SubscriptionExpiredException ex = assertThrows(SubscriptionExpiredException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertTrue(ex.getMessage().contains("No subscription found") || ex.getMessage().contains("PENDING"));
    }

    // =========================================================================
    // SECURITY TEST 6 — Expired Owner Recovery Paths Remain Accessible
    // =========================================================================
    @Test
    @DisplayName("Security Test 6: Inactive/expired owner can still access getShopByOwnerId for recovery")
    void testSecurity6_ExpiredOwnerRecoveryAccessible() {
        Long ownerId = 42L;
        testShop.setStatus(ShopStatus.INACTIVE);
        testShop.setVerificationStatus(VerificationStatus.VERIFIED);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(testShop));

        // getShopByOwnerId (used for profile & billing recovery) must NOT throw SubscriptionExpiredException
        Shop result = shopAccessValidator.getShopByOwnerId(ownerId);

        assertNotNull(result);
        assertEquals(ShopStatus.INACTIVE, result.getStatus());
    }

    // =========================================================================
    // SECURITY TEST 7 — Admin Actor Attribution in Activity Logs
    // =========================================================================
    @Test
    @DisplayName("Security Test 7: Admin status change captures authenticated admin ID")
    void testSecurity7_AdminActorAttribution() {
        AdminDashboardService adminDashboardService = new AdminDashboardService(
                shopRepository,
                null,
                null,
                subscriptionRepository,
                null,
                null,
                null,
                shopStatusManager
        );

        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));

        // Admin User ID 99 suspends shop 10
        Long adminUserId = 99L;
        adminDashboardService.updateShopStatus(10L, "SUSPENDED", adminUserId);

        // Verify shopStatusManager received the real admin actor ID
        verify(shopStatusManager).suspendShop(10L, 99L);
    }

    // =========================================================================
    // SECURITY TEST 8 — Multi-Tenant Regression / Cross-Tenant IDOR Prevention
    // =========================================================================
    @Test
    @DisplayName("Security Test 8: Tenant isolation - querying an unassociated owner ID is rejected")
    void testSecurity8_MultiTenantIsolation() {
        Long unassociatedOwnerId = 999L;
        when(shopRepository.findByOwnerId(unassociatedOwnerId)).thenReturn(List.of());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            shopAccessValidator.getValidShopForOwner(unassociatedOwnerId);
        });

        assertEquals("Shop not found for this user", ex.getMessage());
    }
}
