package com.cakeplatform.api.modules.shop;

import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.order.InvoiceService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderItem;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductCategoryRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.controller.OwnerCouponController;
import com.cakeplatform.api.modules.shop.dto.CouponRequest;
import com.cakeplatform.api.modules.shop.service.AnalyticsService;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontService;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontOrderItem;
import com.cakeplatform.api.modules.storefront.dto.ValidateCouponRequest;
import com.cakeplatform.api.modules.storefront.dto.ValidateCouponResponse;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StageDCouponAndDiscountTest {

    @Mock
    private CouponRepository couponRepository;
    @Mock
    private ShopAccessValidator shopAccessValidator;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ShopRepository shopRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private CustomCakeRequestRepository customCakeRequestRepository;
    @Mock
    private ProductCategoryRepository categoryRepository;
    @Mock
    private com.cakeplatform.api.modules.notification.AdminNotificationService adminNotificationService;
    @Mock
    private ShopDeliverySlotRepository deliverySlotRepository;

    @Mock
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;

    private OwnerCouponController ownerCouponController;
    private CustomerStorefrontService storefrontService;
    private AnalyticsService analyticsService;

    private User ownerA;
    private Shop shopA;
    private CustomUserDetails userDetailsA;

    private Shop shopB;

    @BeforeEach
    void setUp() {
        ownerA = new User();
        ownerA.setId(1L);
        ownerA.setEmail("owner@test.com");
        ownerA.setRole(UserRole.SHOP_OWNER);

        shopA = new Shop();
        shopA.setId(101L);
        shopA.setBusinessName("Sweet Delights");
        shopA.setStatus(ShopStatus.ACTIVE);
        shopA.setOwner(ownerA);
        
        com.cakeplatform.api.modules.subscription.Subscription subA = new com.cakeplatform.api.modules.subscription.Subscription();
        subA.setId(1L);
        subA.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        subA.setExpiryDate(java.time.LocalDateTime.now().plusDays(30));
        lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(101L)).thenReturn(java.util.Optional.of(subA));

        ShopDeliverySlot slot1 = new ShopDeliverySlot();
        slot1.setId(1L);
        slot1.setIsActive(true);
        slot1.setShop(shopA);
        shopA.getDeliverySlots().add(slot1);

        shopB = new Shop();
        shopB.setId(202L);
        shopB.setBusinessName("City Bakeries");
        shopB.setStatus(ShopStatus.ACTIVE);
        
        com.cakeplatform.api.modules.subscription.Subscription subB = new com.cakeplatform.api.modules.subscription.Subscription();
        subB.setId(2L);
        subB.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        subB.setExpiryDate(java.time.LocalDateTime.now().plusDays(30));
        lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(202L)).thenReturn(java.util.Optional.of(subB));

        userDetailsA = new CustomUserDetails(ownerA);

        ownerCouponController = new OwnerCouponController(couponRepository, shopAccessValidator);

        storefrontService = new CustomerStorefrontService(
                shopRepository,
                productRepository,
                orderRepository,
                couponRepository,
                notificationService,
                adminNotificationService,
                customCakeRequestRepository,
                categoryRepository,
                deliverySlotRepository,
                null, null, null, null, null, null, null,
                subscriptionRepository,
                null
        );

        analyticsService = new AnalyticsService(orderRepository, couponRepository, shopAccessValidator);
    }

    // ==========================================
    // D1 & D2: OWNER COUPON CRUD & NORMALIZATION
    // ==========================================

    @Test
    @DisplayName("D1: Coupon creation normalizes code to uppercase and trims whitespace")
    void testCreateCoupon_NormalizesCodeToUppercase() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "FESTIVE50")).thenReturn(Optional.empty());
        when(couponRepository.save(any(Coupon.class))).thenAnswer(invocation -> {
            Coupon c = invocation.getArgument(0);
            c.setId(10L);
            return c;
        });

        CouponRequest request = new CouponRequest();
        request.setCode("  festive50  ");
        request.setDiscountType(Coupon.DiscountType.PERCENTAGE);
        request.setDiscountValue(BigDecimal.valueOf(50));

        ResponseEntity<Coupon> response = ownerCouponController.createCoupon(userDetailsA, request);

        assertNotNull(response.getBody());
        assertEquals("FESTIVE50", response.getBody().getCode());
        assertEquals(0, response.getBody().getUsedCount());
        assertTrue(response.getBody().getIsActive());
        verify(couponRepository).save(argThat(c -> "FESTIVE50".equals(c.getCode())));
    }

    @Test
    @DisplayName("D1: Coupon creation rejects zero or negative discount value")
    void testCreateCoupon_RejectsZeroOrNegativeDiscount() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);

        CouponRequest request = new CouponRequest();
        request.setCode("ZEROOFF");
        request.setDiscountType(Coupon.DiscountType.FLAT);
        request.setDiscountValue(BigDecimal.ZERO);

        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.createCoupon(userDetailsA, request));

        request.setDiscountValue(BigDecimal.valueOf(-10));
        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.createCoupon(userDetailsA, request));
    }

    @Test
    @DisplayName("D1: Percentage discount cannot exceed 100%")
    void testCreateCoupon_RejectsPercentageAbove100() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);

        CouponRequest request = new CouponRequest();
        request.setCode("OVER100");
        request.setDiscountType(Coupon.DiscountType.PERCENTAGE);
        request.setDiscountValue(BigDecimal.valueOf(101));

        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.createCoupon(userDetailsA, request));
    }

    @Test
    @DisplayName("D1: Expiry date cannot be before start date")
    void testCreateCoupon_RejectsStartDateAfterExpiryDate() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);

        CouponRequest request = new CouponRequest();
        request.setCode("DATERANGE");
        request.setDiscountType(Coupon.DiscountType.FLAT);
        request.setDiscountValue(BigDecimal.valueOf(50));
        request.setStartDate(LocalDateTime.now().plusDays(5));
        request.setExpiryDate(LocalDateTime.now().plusDays(2));

        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.createCoupon(userDetailsA, request));
    }

    @Test
    @DisplayName("D1: Duplicate coupon code for same bakery is rejected case-insensitively")
    void testCreateCoupon_RejectsDuplicateCodeForSameBakery() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        Coupon existing = new Coupon();
        existing.setId(5L);
        existing.setCode("SAVE10");
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "SAVE10")).thenReturn(Optional.of(existing));

        CouponRequest request = new CouponRequest();
        request.setCode("save10");
        request.setDiscountType(Coupon.DiscountType.FLAT);
        request.setDiscountValue(BigDecimal.valueOf(10));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.createCoupon(userDetailsA, request));
        assertTrue(ex.getMessage().contains("already exists"));
    }

    // ==========================================
    // D2: STRICT TENANT ISOLATION
    // ==========================================

    @Test
    @DisplayName("D2: Owner cannot update coupon belonging to another bakery")
    void testTenantIsolation_OwnerCannotUpdateOtherBakeryCoupon() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(couponRepository.findByIdAndShopId(99L, 101L)).thenReturn(Optional.empty());

        CouponRequest request = new CouponRequest();
        request.setCode("STEAL");
        request.setDiscountType(Coupon.DiscountType.FLAT);
        request.setDiscountValue(BigDecimal.valueOf(50));

        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.updateCoupon(userDetailsA, 99L, request));
    }

    @Test
    @DisplayName("D2: Owner cannot toggle coupon belonging to another bakery")
    void testTenantIsolation_OwnerCannotToggleOtherBakeryCoupon() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(couponRepository.findByIdAndShopId(99L, 101L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.toggleCouponStatus(userDetailsA, 99L));
    }

    @Test
    @DisplayName("D2: Owner cannot delete coupon belonging to another bakery")
    void testTenantIsolation_OwnerCannotDeleteOtherBakeryCoupon() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(couponRepository.findByIdAndShopId(99L, 101L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
                ownerCouponController.deleteCoupon(userDetailsA, 99L));
    }

    @Test
    @DisplayName("D2: Unused coupon is permanently deleted")
    void testDeleteCoupon_UnusedCouponHardDeleted() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        Coupon coupon = new Coupon();
        coupon.setId(10L);
        coupon.setShop(shopA);
        coupon.setCode("UNUSED");
        coupon.setUsedCount(0);
        when(couponRepository.findByIdAndShopId(10L, 101L)).thenReturn(Optional.of(coupon));

        ResponseEntity<Map<String, String>> response = ownerCouponController.deleteCoupon(userDetailsA, 10L);

        assertEquals("Coupon deleted successfully.", response.getBody().get("message"));
        verify(couponRepository).delete(coupon);
        verify(couponRepository, never()).save(any());
    }

    @Test
    @DisplayName("D2: Used coupon is safely deactivated instead of deleted to protect order history")
    void testDeleteCoupon_UsedCouponDeactivatedInsteadOfDeleted() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        Coupon coupon = new Coupon();
        coupon.setId(10L);
        coupon.setShop(shopA);
        coupon.setCode("USED10");
        coupon.setUsedCount(5);
        coupon.setIsActive(true);
        when(couponRepository.findByIdAndShopId(10L, 101L)).thenReturn(Optional.of(coupon));

        ResponseEntity<Map<String, String>> response = ownerCouponController.deleteCoupon(userDetailsA, 10L);

        assertTrue(response.getBody().get("message").contains("deactivated to preserve audit records"));
        assertFalse(coupon.getIsActive());
        verify(couponRepository).save(coupon);
        verify(couponRepository, never()).delete(any());
    }

    // ==========================================
    // D3: STOREFRONT COUPON VALIDATION API
    // ==========================================

    @Test
    @DisplayName("D3: Validation fails when coupon code is not found")
    void testStorefrontValidation_CouponNotFound() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "NONEXISTENT")).thenReturn(Optional.empty());

        ValidateCouponRequest request = new ValidateCouponRequest("NONEXISTENT", BigDecimal.valueOf(500));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertFalse(response.isValid());
        assertEquals("Invalid coupon code", response.getMessage());
        assertEquals(BigDecimal.ZERO, response.getDiscountAmount());
    }

    @Test
    @DisplayName("D3: Validation fails when coupon is marked inactive")
    void testStorefrontValidation_CouponInactive() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("INACTIVE");
        coupon.setIsActive(false);
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "INACTIVE")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("INACTIVE", BigDecimal.valueOf(500));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertFalse(response.isValid());
        assertEquals("Coupon is inactive", response.getMessage());
    }

    @Test
    @DisplayName("D3: Validation fails when coupon start date is in the future")
    void testStorefrontValidation_FutureCouponNotActiveYet() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("FUTURE");
        coupon.setIsActive(true);
        coupon.setStartDate(LocalDateTime.now().plusDays(3));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "FUTURE")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("FUTURE", BigDecimal.valueOf(500));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertFalse(response.isValid());
        assertEquals("Coupon is not active yet", response.getMessage());
    }

    @Test
    @DisplayName("D3: Validation fails when coupon has expired")
    void testStorefrontValidation_ExpiredCoupon() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("EXPIRED");
        coupon.setIsActive(true);
        coupon.setExpiryDate(LocalDateTime.now().minusDays(1));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "EXPIRED")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("EXPIRED", BigDecimal.valueOf(500));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertFalse(response.isValid());
        assertEquals("Coupon has expired", response.getMessage());
    }

    @Test
    @DisplayName("D3: Validation fails when coupon usage limit is reached")
    void testStorefrontValidation_UsageLimitReached() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("MAXED");
        coupon.setIsActive(true);
        coupon.setUsageLimit(5);
        coupon.setUsedCount(5);
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "MAXED")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("MAXED", BigDecimal.valueOf(500));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertFalse(response.isValid());
        assertEquals("Coupon usage limit reached", response.getMessage());
    }

    @Test
    @DisplayName("D3: Validation fails when cart subtotal is below minOrderValue")
    void testStorefrontValidation_BelowMinOrderValue() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("BIGORDER");
        coupon.setIsActive(true);
        coupon.setMinOrderValue(BigDecimal.valueOf(1000));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "BIGORDER")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("BIGORDER", BigDecimal.valueOf(600));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertFalse(response.isValid());
        assertTrue(response.getMessage().contains("Minimum order value"));
    }

    // ==========================================
    // D4: SERVER DISCOUNT CALCULATIONS
    // ==========================================

    @Test
    @DisplayName("D4: Validation computes FLAT discount and newSubtotal correctly")
    void testStorefrontValidation_FlatDiscountSuccess() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("FLAT100");
        coupon.setIsActive(true);
        coupon.setDiscountType(Coupon.DiscountType.FLAT);
        coupon.setDiscountValue(BigDecimal.valueOf(100));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "FLAT100")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("flat100", BigDecimal.valueOf(650));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertTrue(response.isValid());
        assertEquals("FLAT100", response.getCode());
        assertEquals(BigDecimal.valueOf(100), response.getDiscountAmount());
        assertEquals(BigDecimal.valueOf(550), response.getNewSubtotal());
    }

    @Test
    @DisplayName("D4: Validation computes PERCENTAGE discount correctly")
    void testStorefrontValidation_PercentageDiscountSuccess() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("PERCENT20");
        coupon.setIsActive(true);
        coupon.setDiscountType(Coupon.DiscountType.PERCENTAGE);
        coupon.setDiscountValue(BigDecimal.valueOf(20));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "PERCENT20")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("PERCENT20", BigDecimal.valueOf(800));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertTrue(response.isValid());
        assertEquals(new BigDecimal("160.00"), response.getDiscountAmount());
        assertEquals(new BigDecimal("640.00"), response.getNewSubtotal());
    }

    @Test
    @DisplayName("D4: PERCENTAGE discount is capped at maxDiscountCap")
    void testStorefrontValidation_PercentageDiscountCappedAtMaxCap() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("CAP150");
        coupon.setIsActive(true);
        coupon.setDiscountType(Coupon.DiscountType.PERCENTAGE);
        coupon.setDiscountValue(BigDecimal.valueOf(50));
        coupon.setMaxDiscountCap(BigDecimal.valueOf(150));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "CAP150")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("CAP150", BigDecimal.valueOf(1000));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertTrue(response.isValid());
        assertEquals(BigDecimal.valueOf(150), response.getDiscountAmount());
        assertEquals(BigDecimal.valueOf(850), response.getNewSubtotal());
    }

    @Test
    @DisplayName("D4: Discount exceeding subtotal is capped to subtotal and never negative")
    void testStorefrontValidation_DiscountExceedingSubtotalCappedAtSubtotal() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));
        Coupon coupon = new Coupon();
        coupon.setCode("SUPER500");
        coupon.setIsActive(true);
        coupon.setDiscountType(Coupon.DiscountType.FLAT);
        coupon.setDiscountValue(BigDecimal.valueOf(500));
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "SUPER500")).thenReturn(Optional.of(coupon));

        ValidateCouponRequest request = new ValidateCouponRequest("SUPER500", BigDecimal.valueOf(300));
        ValidateCouponResponse response = storefrontService.validateCouponForStorefront(101L, request);

        assertTrue(response.isValid());
        assertEquals(BigDecimal.valueOf(300), response.getDiscountAmount());
        assertEquals(BigDecimal.ZERO, response.getNewSubtotal());
    }

    // ==========================================
    // D5: ATOMIC CONCURRENCY IN ORDER PLACEMENT
    // ==========================================

    @Test
    @DisplayName("D5: Order placement increments usedCount atomically within usage limit")
    void testPlaceOrder_AtomicIncrementWithinLimit() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));

        Product product = new Product();
        product.setId(10L);
        product.setShop(shopA);
        product.setName("Black Forest Cake");
        product.setPrice(BigDecimal.valueOf(600));
        product.setAvailability(true);
        product.setStatus("ACTIVE");
        when(productRepository.findByIdAndShopId(10L, 101L)).thenReturn(Optional.of(product));

        Coupon coupon = new Coupon();
        coupon.setId(55L);
        coupon.setCode("SAVE100");
        coupon.setIsActive(true);
        coupon.setDiscountType(Coupon.DiscountType.FLAT);
        coupon.setDiscountValue(BigDecimal.valueOf(100));
        coupon.setUsageLimit(50);
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "SAVE100")).thenReturn(Optional.of(coupon));
        when(couponRepository.incrementUsedCountIfWithinLimit(55L)).thenReturn(1);

        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(901L);
            return o;
        });

        GuestOrderRequest req = new GuestOrderRequest();
        req.setCustomerName("Rohan Gupta");
        req.setCustomerEmail("rohan@example.com");
        req.setCustomerPhone("+919876543210");
        req.setPaymentMethod("COD");
        req.setDeliveryAddress("123 Street");
        req.setDeliveryDate(LocalDate.now().plusDays(1));
        req.setDeliverySlotId(1L);
        req.setCouponCode("save100");

        StorefrontOrderItem item = new StorefrontOrderItem();
        item.setProductId(10L);
        item.setQuantity(1);
        req.setItems(List.of(item));

        Order order = storefrontService.placeGuestOrder(101L, req);

        assertNotNull(order);
        assertEquals("SAVE100", order.getCouponCode());
        assertEquals(0, new BigDecimal("100.00").compareTo(order.getDiscountAmount()));
        assertEquals(0, new BigDecimal("550.00").compareTo(order.getTotalAmount()));
        verify(couponRepository).incrementUsedCountIfWithinLimit(55L);
    }

    @Test
    @DisplayName("D5: Order placement fails atomically if usage limit was just reached")
    void testPlaceOrder_AtomicIncrementFailsWhenLimitReached() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopA));

        Product product = new Product();
        product.setId(10L);
        product.setShop(shopA);
        product.setName("Black Forest Cake");
        product.setPrice(BigDecimal.valueOf(600));
        product.setAvailability(true);
        product.setStatus("ACTIVE");
        when(productRepository.findByIdAndShopId(10L, 101L)).thenReturn(Optional.of(product));

        Coupon coupon = new Coupon();
        coupon.setId(55L);
        coupon.setCode("FLASH50");
        coupon.setIsActive(true);
        coupon.setDiscountType(Coupon.DiscountType.FLAT);
        coupon.setDiscountValue(BigDecimal.valueOf(50));
        coupon.setUsageLimit(10);
        when(couponRepository.findByShopIdAndCodeIgnoreCase(101L, "FLASH50")).thenReturn(Optional.of(coupon));
        when(couponRepository.incrementUsedCountIfWithinLimit(55L)).thenReturn(0);

        GuestOrderRequest req = new GuestOrderRequest();
        req.setCustomerName("Rohan Gupta");
        req.setCustomerEmail("rohan@example.com");
        req.setCustomerPhone("+919876543210");
        req.setPaymentMethod("COD");
        req.setDeliveryAddress("123 Street");
        req.setDeliveryDate(LocalDate.now().plusDays(1));
        req.setDeliverySlotId(1L);
        req.setCouponCode("flash50");

        StorefrontOrderItem item = new StorefrontOrderItem();
        item.setProductId(10L);
        item.setQuantity(1);
        req.setItems(List.of(item));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                storefrontService.placeGuestOrder(101L, req));
        assertEquals("Coupon usage limit reached", ex.getMessage());
        verify(orderRepository, never()).save(any(Order.class));
    }

    // ==========================================
    // D7: ANALYTICS INTEGRATION
    // ==========================================

    @Test
    @DisplayName("D7: Owner Analytics service calculates and aggregates coupon metrics")
    void testAnalyticsService_CalculatesCouponMetrics() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(orderRepository.countVisibleOrdersByShopId(101L)).thenReturn(15L);
        when(orderRepository.sumRevenueByShopId(101L)).thenReturn(new BigDecimal("12500.00"));
        when(orderRepository.sumGrossSalesByShopId(101L)).thenReturn(new BigDecimal("12500.00"));
        when(orderRepository.findRecentValidOrders(eq(101L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(101L), any())).thenReturn(Collections.emptyList());

        when(couponRepository.countByShopId(101L)).thenReturn(4L);
        when(couponRepository.countByShopIdAndIsActiveTrue(101L)).thenReturn(3L);
        when(orderRepository.sumTotalDiscountByShopId(101L)).thenReturn(new BigDecimal("850.00"));
        when(orderRepository.countCouponOrdersByShopId(101L)).thenReturn(7L);

        Map<String, Object> analytics = analyticsService.getDashboardAnalytics(1L);

        assertNotNull(analytics);
        assertEquals(4L, analytics.get("totalCoupons"));
        assertEquals(3L, analytics.get("activeCoupons"));
        assertEquals(new BigDecimal("850.00"), analytics.get("totalDiscountGranted"));
        assertEquals(7L, analytics.get("totalCouponOrders"));
    }

    // ==========================================
    // INVOICE SERVICE RUPEE FORMATTING
    // ==========================================

    @Test
    @DisplayName("D8: Invoice PDF generates with itemized rupee discount and totals")
    void testInvoiceService_GeneratesRupeeInvoice() throws Exception {
        InvoiceService invoiceService = new InvoiceService();

        Order order = new Order();
        order.setOrderNumber("ORD-STAGE-D-01");
        order.setShop(shopA);
        order.setCustomerName("Pooja Deshmukh");
        order.setCustomerPhone("+919823100000");
        order.setDeliveryAddress("Shivaji Nagar, Pune");
        order.setCreatedAt(LocalDateTime.now());
        order.setSubtotal(new BigDecimal("800.00"));
        order.setDiscountAmount(new BigDecimal("160.00"));
        order.setCouponCode("SAVE20");
        order.setDeliveryCharge(new BigDecimal("50.00"));
        order.setTotalAmount(new BigDecimal("690.00"));

        OrderItem item = new OrderItem();
        item.setProductNameSnapshot("Belgian Truffle Cake");
        item.setUnitPrice(new BigDecimal("800.00"));
        item.setQuantity(1);
        item.setTotalPrice(new BigDecimal("800.00"));
        order.setItems(List.of(item));

        byte[] pdf = invoiceService.generateInvoice(order);

        assertNotNull(pdf);
        assertTrue(pdf.length > 500, "PDF byte content should be non-empty");
    }
}