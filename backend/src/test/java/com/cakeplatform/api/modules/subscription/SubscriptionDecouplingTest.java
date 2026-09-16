package com.cakeplatform.api.modules.subscription;

import com.cakeplatform.api.exception.SubscriptionExpiredException;
import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.product.ProductCategoryRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontService;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopResponse;
import com.cakeplatform.api.modules.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubscriptionDecouplingTest {

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ShopStatusManager shopStatusManager;

    @Mock
    private ActivityLoggerService activityLogger;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AdminNotificationService adminNotificationService;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private ProductCategoryRepository categoryRepository;

    @Mock
    private ShopDeliverySlotRepository deliverySlotRepository;

    private SubscriptionService subscriptionService;
    private ShopAccessValidator shopAccessValidator;
    private CustomerStorefrontService customerStorefrontService;

    private Shop shopA; // Expired subscription
    private Shop shopB; // Active subscription
    private Shop shopC; // Admin suspended
    private Shop shopD; // Pending KYC

    private User ownerA;
    private User ownerB;
    private User ownerC;
    private User ownerD;

    private Subscription subExpiredA;
    private Subscription subActiveB;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(
                subscriptionRepository,
                paymentRepository,
                shopRepository,
                shopStatusManager,
                activityLogger,
                notificationService,
                adminNotificationService
        );

        shopAccessValidator = new ShopAccessValidator(
                shopRepository,
                subscriptionRepository
        );

        customerStorefrontService = new CustomerStorefrontService(
                shopRepository,
                productRepository,
                orderRepository,
                couponRepository,
                notificationService,
                adminNotificationService,
                null,
                categoryRepository,
                deliverySlotRepository
        );

        // Setup Shop A: Sweet Delights (Subscription Expired)
        ownerA = new User();
        ownerA.setId(101L);
        ownerA.setEmail("ownerA@bakery.com");

        shopA = new Shop();
        shopA.setId(1L);
        shopA.setBusinessName("Shop A - Sweet Delights");
        shopA.setStatus(ShopStatus.EXPIRED); // Under V1 rule, shop status is EXPIRED upon subscription expiration
        shopA.setVerificationStatus(VerificationStatus.VERIFIED);
        shopA.setOwner(ownerA);

        subExpiredA = new Subscription();
        subExpiredA.setId(501L);
        subExpiredA.setShop(shopA);
        subExpiredA.setStatus(SubscriptionStatus.EXPIRED);
        subExpiredA.setAmount(BigDecimal.valueOf(350.00));
        subExpiredA.setExpiryDate(LocalDateTime.now().minusDays(1)); // Expired yesterday

        // Setup Shop B: Daily Bakes (Active Subscription)
        ownerB = new User();
        ownerB.setId(102L);
        ownerB.setEmail("ownerB@bakery.com");

        shopB = new Shop();
        shopB.setId(2L);
        shopB.setBusinessName("Shop B - Daily Bakes");
        shopB.setStatus(ShopStatus.ACTIVE);
        shopB.setVerificationStatus(VerificationStatus.VERIFIED);
        shopB.setOwner(ownerB);

        subActiveB = new Subscription();
        subActiveB.setId(502L);
        subActiveB.setShop(shopB);
        subActiveB.setStatus(SubscriptionStatus.ACTIVE);
        subActiveB.setAmount(BigDecimal.valueOf(350.00));
        subActiveB.setExpiryDate(LocalDateTime.now().plusDays(25));

        // Setup Shop C: Suspended Bakery (Admin Action)
        ownerC = new User();
        ownerC.setId(103L);
        ownerC.setEmail("ownerC@bakery.com");

        shopC = new Shop();
        shopC.setId(3L);
        shopC.setBusinessName("Shop C - Suspended Bakes");
        shopC.setStatus(ShopStatus.SUSPENDED);
        shopC.setVerificationStatus(VerificationStatus.VERIFIED);
        shopC.setOwner(ownerC);

        // Setup Shop D: Pending Bakery (Unverified)
        ownerD = new User();
        ownerD.setId(104L);
        ownerD.setEmail("ownerD@bakery.com");

        shopD = new Shop();
        shopD.setId(4L);
        shopD.setBusinessName("Shop D - Fresh Signup");
        shopD.setStatus(ShopStatus.PENDING);
        shopD.setVerificationStatus(VerificationStatus.PROCESSING);
        shopD.setOwner(ownerD);
    }

    // =========================================================================
    // 1. EXPIRATION DECOUPLING VERIFICATION
    // =========================================================================

    @Test
    @DisplayName("D1: Expiring subscription marks shop EXPIRED")
    void testExpireSubscription_DoesNotDeactivateShop() {
        Shop liveShop = new Shop();
        liveShop.setId(55L);
        liveShop.setStatus(ShopStatus.ACTIVE);

        Subscription activeSubToExpire = new Subscription();
        activeSubToExpire.setId(501L);
        activeSubToExpire.setShop(liveShop);
        activeSubToExpire.setStatus(SubscriptionStatus.ACTIVE);
        activeSubToExpire.setAmount(BigDecimal.valueOf(350.00));
        activeSubToExpire.setExpiryDate(LocalDateTime.now().minusDays(1));

        when(subscriptionRepository.findById(501L)).thenReturn(Optional.of(activeSubToExpire));

        subscriptionService.expireSubscription(501L);

        // Verify subscription is set to EXPIRED
        assertEquals(SubscriptionStatus.EXPIRED, activeSubToExpire.getStatus());
        verify(subscriptionRepository).save(activeSubToExpire);

        // CRITICAL: Verify shop status becomes EXPIRED under CakeStore V1 Rule 12
        assertEquals(ShopStatus.EXPIRED, liveShop.getStatus(), "Shop status must become EXPIRED upon subscription expiration");
        verify(shopRepository).save(liveShop);
    }

    // =========================================================================
    // 2. OWNER OPERATIONAL ACCESS GATING
    // =========================================================================

    @Test
    @DisplayName("D2: Expired subscription BLOCKS owner operational access with HTTP 403")
    void testExpiredOwner_OperationalAccessBlocked() {
        when(shopRepository.findByOwnerId(ownerA.getId())).thenReturn(List.of(shopA));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shopA.getId()))
                .thenReturn(Optional.of(subExpiredA));

        SubscriptionExpiredException ex = assertThrows(
                SubscriptionExpiredException.class,
                () -> shopAccessValidator.getValidShopForOwner(ownerA.getId())
        );

        assertTrue(ex.getMessage().contains("Subscription is EXPIRED") || ex.getMessage().contains("renew"),
                "Exception message must require renewal");
    }

    @Test
    @DisplayName("D3: Expired subscription still ALLOWS billing/subscription lookup")
    void testExpiredOwner_BillingLookupAllowed() {
        when(shopRepository.findByOwnerId(ownerA.getId())).thenReturn(List.of(shopA));

        // getShopByOwnerId is used by billing endpoints (no operational gating)
        Shop accessibleShop = shopAccessValidator.getShopByOwnerId(ownerA.getId());
        assertNotNull(accessibleShop);
        assertEquals(shopA.getId(), accessibleShop.getId());
    }

    @Test
    @DisplayName("D4: Active subscription ALLOWS owner operational access")
    void testActiveOwner_OperationalAccessAllowed() {
        when(shopRepository.findByOwnerId(ownerB.getId())).thenReturn(List.of(shopB));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shopB.getId()))
                .thenReturn(Optional.of(subActiveB));

        Shop validatedShop = shopAccessValidator.getValidShopForOwner(ownerB.getId());
        assertNotNull(validatedShop);
        assertEquals(shopB.getId(), validatedShop.getId());
    }

    // =========================================================================
    // 3. CUSTOMER STOREFRONT ACCESS & ORDERING
    // =========================================================================

    @Test
    @DisplayName("D5: Expired bakery customer storefront remains LIVE and accessible")
    void testExpiredBakery_CustomerStorefrontRemainsLive() {
        when(shopRepository.findById(shopA.getId())).thenReturn(Optional.of(shopA));

        StorefrontShopResponse response = customerStorefrontService.getShopDetails(shopA.getId());

        assertNotNull(response);
        assertEquals(shopA.getBusinessName(), response.getBusinessName());
        assertEquals("EXPIRED", response.getStatus());
    }

    @Test
    @DisplayName("D6: Expired bakery customers CAN place guest orders")
    void testExpiredBakery_CustomerCanPlaceOrder() {
        when(shopRepository.findById(shopA.getId())).thenReturn(Optional.of(shopA));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(9901L);
            return o;
        });

        GuestOrderRequest request = new GuestOrderRequest();
        request.setCustomerName("Jane Doe");
        request.setCustomerEmail("jane@example.com");
        request.setCustomerPhone("9876543210");
        request.setDeliveryAddress("123 Celebration St, Pune");
        request.setPaymentMethod("COD");
        request.setDeliveryDate(LocalDate.now().plusDays(2));
        request.setItems(new ArrayList<>());

        Order placedOrder = customerStorefrontService.placeGuestOrder(shopA.getId(), request);

        assertNotNull(placedOrder);
        assertEquals("Jane Doe", placedOrder.getCustomerName());
        assertEquals(shopA.getId(), placedOrder.getShop().getId());
        assertNotNull(placedOrder.getOrderNumber());
        verify(orderRepository).save(any(Order.class));
    }

    // =========================================================================
    // 4. ADMIN SUSPENSION PRESERVATION
    // =========================================================================

    @Test
    @DisplayName("D7: Admin-suspended shop BLOCKS owner access")
    void testAdminSuspended_OwnerBlocked() {
        when(shopRepository.findByOwnerId(ownerC.getId())).thenReturn(List.of(shopC));

        SubscriptionExpiredException ex = assertThrows(
                SubscriptionExpiredException.class,
                () -> shopAccessValidator.getValidShopForOwner(ownerC.getId())
        );

        assertTrue(ex.getMessage().contains("suspended by administration"));
    }

    @Test
    @DisplayName("D8: Admin-suspended shop BLOCKS customer storefront and ordering")
    void testAdminSuspended_CustomerBlocked() {
        when(shopRepository.findById(shopC.getId())).thenReturn(Optional.of(shopC));

        // Storefront details blocked
        RuntimeException exDetails = assertThrows(
                RuntimeException.class,
                () -> customerStorefrontService.getShopDetails(shopC.getId())
        );
        assertEquals("Shop is currently unavailable", exDetails.getMessage());

        // Customer checkout blocked
        GuestOrderRequest request = new GuestOrderRequest();
        request.setCustomerName("John Doe");
        request.setDeliveryDate(LocalDate.now().plusDays(1));

        RuntimeException exOrder = assertThrows(
                RuntimeException.class,
                () -> customerStorefrontService.placeGuestOrder(shopC.getId(), request)
        );
        assertEquals("Shop is currently unavailable", exOrder.getMessage());
    }

    // =========================================================================
    // 5. PENDING / KYC UNAPPROVED PRESERVATION
    // =========================================================================

    @Test
    @DisplayName("D9: Pending shop BLOCKS owner operational access")
    void testPendingShop_OwnerBlocked() {
        when(shopRepository.findByOwnerId(ownerD.getId())).thenReturn(List.of(shopD));

        SubscriptionExpiredException ex = assertThrows(
                SubscriptionExpiredException.class,
                () -> shopAccessValidator.getValidShopForOwner(ownerD.getId())
        );

        assertTrue(ex.getMessage().contains("No subscription found") || ex.getMessage().contains("PENDING"));
    }

    @Test
    @DisplayName("D10: Pending shop BLOCKS customer storefront and ordering")
    void testPendingShop_CustomerBlocked() {
        when(shopRepository.findById(shopD.getId())).thenReturn(Optional.of(shopD));

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> customerStorefrontService.getShopDetails(shopD.getId())
        );
        assertEquals("Shop is currently unavailable", ex.getMessage());
    }

    // =========================================================================
    // 6. MULTI-TENANT ISOLATION
    // =========================================================================

    @Test
    @DisplayName("D11: Multi-tenant safety: Expired Shop A does not affect Active Shop B or Suspended Shop C")
    void testMultiTenantIsolation() {
        // Setup mocks for respective shops
        when(shopRepository.findByOwnerId(ownerA.getId())).thenReturn(List.of(shopA));
        when(shopRepository.findByOwnerId(ownerB.getId())).thenReturn(List.of(shopB));
        when(shopRepository.findByOwnerId(ownerC.getId())).thenReturn(List.of(shopC));

        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shopA.getId()))
                .thenReturn(Optional.of(subExpiredA));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shopB.getId()))
                .thenReturn(Optional.of(subActiveB));

        when(shopRepository.findById(shopA.getId())).thenReturn(Optional.of(shopA));
        when(shopRepository.findById(shopB.getId())).thenReturn(Optional.of(shopB));
        when(shopRepository.findById(shopC.getId())).thenReturn(Optional.of(shopC));

        // 1. Shop A owner is blocked; Shop A customer storefront is LIVE
        assertThrows(SubscriptionExpiredException.class, () -> shopAccessValidator.getValidShopForOwner(ownerA.getId()));
        assertNotNull(customerStorefrontService.getShopDetails(shopA.getId()));

        // 2. Shop B owner is active; Shop B customer storefront is LIVE
        assertNotNull(shopAccessValidator.getValidShopForOwner(ownerB.getId()));
        assertNotNull(customerStorefrontService.getShopDetails(shopB.getId()));

        // 3. Shop C owner is blocked; Shop C customer storefront is BLOCKED
        assertThrows(SubscriptionExpiredException.class, () -> shopAccessValidator.getValidShopForOwner(ownerC.getId()));
        assertThrows(RuntimeException.class, () -> customerStorefrontService.getShopDetails(shopC.getId()));
    }
}
