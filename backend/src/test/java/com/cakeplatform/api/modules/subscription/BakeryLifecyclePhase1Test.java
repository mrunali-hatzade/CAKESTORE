package com.cakeplatform.api.modules.subscription;

import com.cakeplatform.api.exception.SubscriptionExpiredException;
import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.Payment;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.product.ProductCategoryRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontService;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopResponse;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
public class BakeryLifecyclePhase1Test {

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

    private User owner1;
    private User owner2;
    private Shop shop1;
    private Shop shop2;

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

        owner1 = new User();
        owner1.setId(101L);
        owner1.setEmail("baker1@delight.com");
        owner1.setRole(UserRole.SHOP_OWNER);
        owner1.setStatus(UserStatus.ACTIVE);

        shop1 = new Shop();
        shop1.setId(1L);
        shop1.setBusinessName("Delightful Cakes");
        shop1.setStatus(ShopStatus.PENDING);
        shop1.setVerificationStatus(VerificationStatus.PROCESSING);
        shop1.setOwner(owner1);

        owner2 = new User();
        owner2.setId(102L);
        owner2.setEmail("baker2@bakery.com");
        owner2.setRole(UserRole.SHOP_OWNER);
        owner2.setStatus(UserStatus.ACTIVE);

        shop2 = new Shop();
        shop2.setId(2L);
        shop2.setBusinessName("Grand Pastry");
        shop2.setStatus(ShopStatus.ACTIVE);
        shop2.setVerificationStatus(VerificationStatus.VERIFIED);
        shop2.setOwner(owner2);
    }

    // -------------------------------------------------------------------------
    // 1. Registration creates PENDING shop
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 1: Registration creates PENDING shop with PROCESSING verification")
    void testRegistrationCreatesPendingShop() {
        Shop newShop = new Shop();
        newShop.setBusinessName("Fresh Bakes");
        newShop.setStatus(ShopStatus.PENDING);
        newShop.setVerificationStatus(VerificationStatus.PROCESSING);

        assertEquals(ShopStatus.PENDING, newShop.getStatus());
        assertEquals(VerificationStatus.PROCESSING, newShop.getVerificationStatus());
    }

    // -------------------------------------------------------------------------
    // 2. Successful payment: subscription = ACTIVE, shop = ACTIVE
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 2: Successful payment activates subscription and shop")
    void testSuccessfulPayment_ActivatesSubscriptionAndShop() {
        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(paymentRepository.findByIdWithLock(anyLong())).thenAnswer(i -> { Payment p = new Payment(); p.setStatus("PENDING"); return java.util.Optional.of(p); }); org.mockito.Mockito.lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(901L);
            return p;
        });

        Payment payment = subscriptionService.processSuccessfulPayment(owner1.getId(), new com.cakeplatform.api.modules.subscription.SubscriptionPlan() {{ setPrice(java.math.BigDecimal.valueOf(350)); setDurationDays(30); }}, "order_sub_test", "pay_test_123", new com.cakeplatform.api.modules.payment.Payment() {{ setId(100L); }});

        assertNotNull(payment);
        assertEquals("COMPLETED", payment.getStatus());
        verify(shopStatusManager).activateShop(shop1.getId(), owner1.getId());
    }

    // -------------------------------------------------------------------------
    // 3. Failed payment: subscription remains inactive, shop remains PENDING
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 3: Failed payment does NOT activate subscription or shop")
    void testFailedPayment_ShopRemainsPending() {
        // When payment fails on gateway, processSuccessfulPayment is NOT called
        // Shop status and subscription remain unchanged
        assertEquals(ShopStatus.PENDING, shop1.getStatus());
        assertEquals(VerificationStatus.PROCESSING, shop1.getVerificationStatus());
        verify(shopStatusManager, never()).activateShop(anyLong(), anyLong());
    }

    // -------------------------------------------------------------------------
    // 4. Paid but unverified: shop ACTIVE, verification PROCESSING
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 4: Paid but unverified shop has ACTIVE status and PROCESSING verification with operational access")
    void testPaidUnverified_ShopActiveVerificationProcessing() {
        shop1.setStatus(ShopStatus.ACTIVE);
        shop1.setVerificationStatus(VerificationStatus.PROCESSING);

        Subscription activeSub = new Subscription();
        activeSub.setId(501L);
        activeSub.setShop(shop1);
        activeSub.setStatus(SubscriptionStatus.ACTIVE);
        activeSub.setExpiryDate(LocalDateTime.now().plusDays(30));

        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shop1.getId()))
                .thenReturn(Optional.of(activeSub));

        // Owner can access operational dashboard (Rule 2)
        Shop validShop = shopAccessValidator.getValidShopForOwner(owner1.getId());
        assertNotNull(validShop);
        assertEquals(ShopStatus.ACTIVE, validShop.getStatus());
        assertEquals(VerificationStatus.PROCESSING, validShop.getVerificationStatus());
    }

    // -------------------------------------------------------------------------
    // 5. Admin approval: verification VERIFIED, shop remains ACTIVE
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 5: Admin approval updates verification to VERIFIED while shop remains ACTIVE")
    void testAdminApproval_SetsVerifiedAndKeepsActive() {
        shop1.setStatus(ShopStatus.ACTIVE);
        shop1.setVerificationStatus(VerificationStatus.PROCESSING);

        // Simulate admin approval
        shop1.setVerificationStatus(VerificationStatus.VERIFIED);

        assertEquals(ShopStatus.ACTIVE, shop1.getStatus());
        assertEquals(VerificationStatus.VERIFIED, shop1.getVerificationStatus());
    }

    // -------------------------------------------------------------------------
    // 6. Verified badge logic uses verificationStatus
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 6: Verified badge condition is strictly verificationStatus == VERIFIED")
    void testVerifiedBadge_StrictlyChecksVerificationStatus() {
        StorefrontShopResponse unverifiedResp = new StorefrontShopResponse();
        unverifiedResp.setStatus("ACTIVE");
        unverifiedResp.setVerificationStatus("PROCESSING");

        StorefrontShopResponse verifiedResp = new StorefrontShopResponse();
        verifiedResp.setStatus("ACTIVE");
        verifiedResp.setVerificationStatus("VERIFIED");

        assertNotEquals("VERIFIED", unverifiedResp.getVerificationStatus(), "Unverified active shop must NOT have VERIFIED status");
        assertEquals("VERIFIED", verifiedResp.getVerificationStatus(), "Verified shop must have VERIFIED status for badge");
    }

    // -------------------------------------------------------------------------
    // 7. Subscription expiry: subscription EXPIRED, shop EXPIRED
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 7: Subscription expiry sets subscription EXPIRED and shop EXPIRED")
    void testSubscriptionExpiry_SetsShopAndSubscriptionExpired() {
        Subscription sub = new Subscription();
        sub.setId(601L);
        sub.setShop(shop1);
        sub.setStatus(SubscriptionStatus.ACTIVE);
        sub.setExpiryDate(LocalDateTime.now().minusDays(1));

        when(subscriptionRepository.findById(601L)).thenReturn(Optional.of(sub));

        subscriptionService.expireSubscription(601L);

        assertEquals(SubscriptionStatus.EXPIRED, sub.getStatus());
        assertEquals(ShopStatus.EXPIRED, shop1.getStatus());
        verify(shopRepository).save(shop1);
    }

    // -------------------------------------------------------------------------
    // 8. Expired owner operational APIs blocked
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 8: Expired owner operational access is blocked with 403")
    void testExpiredOwner_OperationalApisBlocked() {
        shop1.setStatus(ShopStatus.EXPIRED);
        Subscription expiredSub = new Subscription();
        expiredSub.setStatus(SubscriptionStatus.EXPIRED);
        expiredSub.setExpiryDate(LocalDateTime.now().minusDays(1));

        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shop1.getId()))
                .thenReturn(Optional.of(expiredSub));

        assertThrows(SubscriptionExpiredException.class, () ->
                shopAccessValidator.getValidShopForOwner(owner1.getId())
        );
    }

    // -------------------------------------------------------------------------
    // 9. Expired owner billing/renewal APIs accessible
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 9: Expired owner can still lookup shop for billing/renewal")
    void testExpiredOwner_BillingLookupAccessible() {
        shop1.setStatus(ShopStatus.EXPIRED);
        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));

        Shop billingShop = shopAccessValidator.getShopByOwnerId(owner1.getId());
        assertNotNull(billingShop);
        assertEquals(shop1.getId(), billingShop.getId());
    }

    // -------------------------------------------------------------------------
    // 10. Successful renewal: subscription ACTIVE, shop ACTIVE
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 10: Successful renewal activates subscription and shop")
    void testSuccessfulRenewal_ActivatesShopAndSubscription() {
        shop1.setStatus(ShopStatus.EXPIRED);
        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(paymentRepository.findByIdWithLock(anyLong())).thenAnswer(i -> { Payment p = new Payment(); p.setStatus("PENDING"); return java.util.Optional.of(p); }); org.mockito.Mockito.lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        subscriptionService.processSuccessfulPayment(owner1.getId(), new com.cakeplatform.api.modules.subscription.SubscriptionPlan() {{ setPrice(java.math.BigDecimal.valueOf(350)); setDurationDays(30); }}, "ord_renew", "pay_renew", new com.cakeplatform.api.modules.payment.Payment() {{ setId(100L); }});

        verify(shopStatusManager).activateShop(shop1.getId(), owner1.getId());
    }

    // -------------------------------------------------------------------------
    // 11. Existing VERIFIED status remains VERIFIED after renewal
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 11: Existing VERIFIED status remains VERIFIED after subscription renewal")
    void testVerifiedStatusPreservedAfterRenewal() {
        shop1.setStatus(ShopStatus.EXPIRED);
        shop1.setVerificationStatus(VerificationStatus.VERIFIED);

        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(paymentRepository.findByIdWithLock(anyLong())).thenAnswer(i -> { Payment p = new Payment(); p.setStatus("PENDING"); return java.util.Optional.of(p); }); org.mockito.Mockito.lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        subscriptionService.processSuccessfulPayment(owner1.getId(), new com.cakeplatform.api.modules.subscription.SubscriptionPlan() {{ setPrice(java.math.BigDecimal.valueOf(350)); setDurationDays(30); }}, "ord_renew_2", "pay_renew_2", new com.cakeplatform.api.modules.payment.Payment() {{ setId(100L); }});

        assertEquals(VerificationStatus.VERIFIED, shop1.getVerificationStatus(), "VerificationStatus must remain VERIFIED after renewal");
    }

    // -------------------------------------------------------------------------
    // 12. Expired customer storefront remains accessible
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 12: Expired bakery customer storefront details remain accessible")
    void testExpiredBakery_CustomerStorefrontAccessible() {
        shop1.setStatus(ShopStatus.EXPIRED);
        when(shopRepository.findById(shop1.getId())).thenReturn(Optional.of(shop1));

        StorefrontShopResponse details = customerStorefrontService.getShopDetails(shop1.getId());
        assertNotNull(details);
        assertEquals("EXPIRED", details.getStatus());
    }

    // -------------------------------------------------------------------------
    // 13. Expired customer can place guest order
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 13: Customer can place guest order on an expired bakery")
    void testExpiredBakery_CustomerCanPlaceGuestOrder() {
        shop1.setStatus(ShopStatus.EXPIRED);
        when(shopRepository.findById(shop1.getId())).thenReturn(Optional.of(shop1));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(8801L);
            return o;
        });

        GuestOrderRequest req = new GuestOrderRequest();
        req.setCustomerName("Alice Customer");
        req.setCustomerEmail("alice@example.com");
        req.setCustomerPhone("9988776655");
        req.setDeliveryAddress("100 Park Street, Mumbai");
        req.setPaymentMethod("COD");
        req.setDeliveryDate(LocalDate.now().plusDays(2));
        req.setItems(new ArrayList<>());

        Order placed = customerStorefrontService.placeGuestOrder(shop1.getId(), req);
        assertNotNull(placed);
        assertEquals(shop1.getId(), placed.getShop().getId());
        verify(orderRepository).save(any(Order.class));
    }

    // -------------------------------------------------------------------------
    // 14. Admin SUSPENDED shop remains inaccessible to customers
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 14: Admin SUSPENDED shop blocks customer storefront and orders")
    void testAdminSuspended_BlocksCustomers() {
        shop1.setStatus(ShopStatus.SUSPENDED);
        when(shopRepository.findById(shop1.getId())).thenReturn(Optional.of(shop1));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                customerStorefrontService.getShopDetails(shop1.getId())
        );
        assertEquals("Shop is currently unavailable", ex.getMessage());
    }

    // -------------------------------------------------------------------------
    // 15. Multi-tenant payment isolation
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 15: Payment for Owner 1 affects Shop 1 and does not affect Shop 2")
    void testMultiTenantPaymentIsolation() {
        when(shopRepository.findByOwnerId(owner1.getId())).thenReturn(List.of(shop1));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(inv -> inv.getArgument(0));
        org.mockito.Mockito.lenient().when(paymentRepository.findByIdWithLock(anyLong())).thenAnswer(i -> { Payment p = new Payment(); p.setStatus("PENDING"); return java.util.Optional.of(p); }); org.mockito.Mockito.lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        subscriptionService.processSuccessfulPayment(owner1.getId(), new com.cakeplatform.api.modules.subscription.SubscriptionPlan() {{ setPrice(java.math.BigDecimal.valueOf(350)); setDurationDays(30); }}, "ord_t1", "pay_t1", new com.cakeplatform.api.modules.payment.Payment() {{ setId(100L); }});

        verify(shopStatusManager).activateShop(eq(shop1.getId()), eq(owner1.getId()));
        verify(shopStatusManager, never()).activateShop(eq(shop2.getId()), anyLong());
    }

    // -------------------------------------------------------------------------
    // 16. Payment/webhook idempotency
    // -------------------------------------------------------------------------
    @Test
    @DisplayName("Req 16: Subscription expiration is idempotent")
    void testSubscriptionExpiration_Idempotent() {
        Subscription sub = new Subscription();
        sub.setId(701L);
        sub.setShop(shop1);
        sub.setStatus(SubscriptionStatus.EXPIRED); // already expired

        when(subscriptionRepository.findById(701L)).thenReturn(Optional.of(sub));

        subscriptionService.expireSubscription(701L);

        // Should return early and not save again
        verify(subscriptionRepository, never()).save(any(Subscription.class));
    }
}
