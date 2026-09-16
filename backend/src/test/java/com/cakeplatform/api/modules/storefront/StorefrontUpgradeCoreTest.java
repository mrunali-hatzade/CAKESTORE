package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.interaction.Feedback;
import com.cakeplatform.api.modules.interaction.FeedbackRepository;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderItem;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.product.*;
import com.cakeplatform.api.modules.review.ProductReviewRepository;
import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.shop.dto.*;
import com.cakeplatform.api.modules.shop.service.OwnerStorefrontService;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontOrderItem;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopResponse;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StorefrontUpgradeCoreTest {

    @Mock
    private ShopRepository shopRepository;
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
    @Mock
    private ShopBannerRepository shopBannerRepository;
    @Mock
    private ShopBusinessHoursRepository shopBusinessHoursRepository;
    @Mock
    private ShopDeliveryConfigRepository shopDeliveryConfigRepository;
    @Mock
    private ShopStorefrontSettingsRepository shopStorefrontSettingsRepository;
    @Mock
    private ShopCustomFormFieldRepository shopCustomFormFieldRepository;
    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private ProductReviewRepository productReviewRepository;
    @Mock
    private ShopAccessValidator shopAccessValidator;

    private CustomerStorefrontService customerStorefrontService;
    private OwnerStorefrontService ownerStorefrontService;

    private Shop shop;
    private Product product;

    @BeforeEach
    void setUp() {
        customerStorefrontService = new CustomerStorefrontService(
                shopRepository,
                productRepository,
                orderRepository,
                couponRepository,
                null,
                null,
                null,
                categoryRepository,
                deliverySlotRepository,
                shopBannerRepository,
                shopBusinessHoursRepository,
                shopDeliveryConfigRepository,
                shopStorefrontSettingsRepository,
                shopCustomFormFieldRepository,
                feedbackRepository,
                productReviewRepository
        );

        ownerStorefrontService = new OwnerStorefrontService(
                shopAccessValidator,
                shopBannerRepository,
                shopBusinessHoursRepository,
                shopDeliveryConfigRepository,
                shopStorefrontSettingsRepository,
                shopCustomFormFieldRepository
        );

        shop = new Shop();
        shop.setId(101L);
        shop.setBusinessName("Artisan Sweet Bakery");
        shop.setStatus(ShopStatus.ACTIVE);
        shop.setAboutStory("Founded in 2015 with love.");
        shop.setWhatsappNumber("+919876543210");

        product = new Product();
        product.setId(501L);
        product.setShop(shop);
        product.setName("Signature Velvet Cake");
        product.setPrice(BigDecimal.valueOf(800.00));
        product.setOriginalPrice(BigDecimal.valueOf(1000.00));
        product.setImageUrl("https://images.unsplash.com/velvet.jpg");
        product.setAvailability(true);
        product.setStatus("ACTIVE");
        product.setImages(new ArrayList<>());
        product.setHighlights(new ArrayList<>());
        product.setVariants(new ArrayList<>());
        product.setAddons(new ArrayList<>());
    }

    @Test
    void testGetShopDetails_IncludesStorefrontSettingsAndRatings() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shop));
        when(feedbackRepository.calculateAverageRatingByShopId(101L)).thenReturn(4.82);
        when(feedbackRepository.countApprovedByShopId(101L)).thenReturn(42L);

        ShopBanner banner = ShopBanner.builder().id(1L).imageUrl("banner1.jpg").title("Fresh Bakes").build();
        when(shopBannerRepository.findByShopIdAndIsActiveTrueOrderByDisplayOrderAsc(101L))
                .thenReturn(List.of(banner));

        ShopDeliveryConfig deliveryConfig = ShopDeliveryConfig.builder()
                .deliveryChargeType("FIXED")
                .fixedChargeAmount(BigDecimal.valueOf(60.00))
                .minOrderForFreeDelivery(BigDecimal.valueOf(1200.00))
                .build();
        when(shopDeliveryConfigRepository.findByShopId(101L)).thenReturn(Optional.of(deliveryConfig));

        StorefrontShopResponse response = customerStorefrontService.getShopDetails(101L);

        assertNotNull(response);
        assertEquals("Artisan Sweet Bakery", response.getBusinessName());
        assertEquals("Founded in 2015 with love.", response.getAboutStory());
        assertEquals("+919876543210", response.getWhatsappNumber());
        assertEquals(4.8, response.getAverageRating());
        assertEquals(42L, response.getTotalReviews());
        assertEquals(1, response.getBanners().size());
        assertEquals(BigDecimal.valueOf(60.00), response.getDeliveryConfig().getFixedChargeAmount());
    }

    @Test
    void testPlaceGuestOrder_CalculatesAuthoritativeDeliveryChargeAndSnapshotsOrderItem() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shop));
        when(productRepository.findByIdAndShopId(501L, 101L)).thenReturn(Optional.of(product));

        // Fixed Rs. 50 delivery charge, free if order >= Rs. 1000
        ShopDeliveryConfig config = ShopDeliveryConfig.builder()
                .deliveryChargeType("FIXED")
                .fixedChargeAmount(BigDecimal.valueOf(50.00))
                .minOrderForFreeDelivery(BigDecimal.valueOf(1000.00))
                .build();
        when(shopDeliveryConfigRepository.findByShopId(101L)).thenReturn(Optional.of(config));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GuestOrderRequest request = new GuestOrderRequest();
        request.setCustomerName("Alice Doe");
        request.setCustomerEmail("alice@example.com");
        request.setCustomerPhone("9988776655");
        request.setDeliveryAddress("123 Baker Street, Apt 4");
        request.setPaymentMethod("COD");
        request.setDeliveryDate(LocalDate.now().plusDays(2));

        StorefrontOrderItem item = new StorefrontOrderItem();
        item.setProductId(501L);
        item.setQuantity(1); // 1 * Rs. 800 = subtotal Rs. 800 (< Rs. 1000 threshold)
        request.setItems(List.of(item));

        Order order = customerStorefrontService.placeGuestOrder(101L, request);

        assertNotNull(order);
        assertEquals(BigDecimal.valueOf(800.00), order.getSubtotal());
        assertEquals(BigDecimal.valueOf(50.00), order.getDeliveryCharge());
        assertEquals(BigDecimal.valueOf(850.00), order.getTotalAmount());

        assertEquals(1, order.getItems().size());
        OrderItem orderItem = order.getItems().get(0);
        assertEquals("Signature Velvet Cake", orderItem.getProductNameSnapshot());
        assertEquals("https://images.unsplash.com/velvet.jpg", orderItem.getProductImageUrl());
        assertEquals(BigDecimal.valueOf(1000.00), orderItem.getOriginalPrice());
    }

    @Test
    void testPlaceGuestOrder_FreeDeliveryWhenThresholdMet() {
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shop));
        when(productRepository.findByIdAndShopId(501L, 101L)).thenReturn(Optional.of(product));

        ShopDeliveryConfig config = ShopDeliveryConfig.builder()
                .deliveryChargeType("FIXED")
                .fixedChargeAmount(BigDecimal.valueOf(50.00))
                .minOrderForFreeDelivery(BigDecimal.valueOf(1000.00))
                .build();
        when(shopDeliveryConfigRepository.findByShopId(101L)).thenReturn(Optional.of(config));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GuestOrderRequest request = new GuestOrderRequest();
        request.setCustomerName("Alice Doe");
        request.setCustomerEmail("alice@example.com");
        request.setCustomerPhone("9988776655");
        request.setDeliveryAddress("123 Baker Street");
        request.setPaymentMethod("COD");
        request.setDeliveryDate(LocalDate.now().plusDays(2));

        StorefrontOrderItem item = new StorefrontOrderItem();
        item.setProductId(501L);
        item.setQuantity(2); // 2 * Rs. 800 = subtotal Rs. 1600 (>= Rs. 1000 threshold -> Free delivery)
        request.setItems(List.of(item));

        Order order = customerStorefrontService.placeGuestOrder(101L, request);

        assertNotNull(order);
        assertEquals(BigDecimal.valueOf(1600.00), order.getSubtotal());
        assertEquals(BigDecimal.ZERO, order.getDeliveryCharge());
        assertEquals(BigDecimal.valueOf(1600.00), order.getTotalAmount());
    }

    @Test
    void testOwnerStorefrontService_TenantIsolationOnBannerModification() {
        Long ownerId = 99L;
        when(shopAccessValidator.getValidShopForOwner(ownerId)).thenReturn(shop);

        ShopBanner banner = ShopBanner.builder()
                .id(10L)
                .shop(shop)
                .imageUrl("new-banner.jpg")
                .title("Special Discount")
                .build();
        when(shopBannerRepository.findByIdAndShopId(10L, 101L)).thenReturn(Optional.of(banner));

        ShopBannerRequest updateReq = new ShopBannerRequest();
        updateReq.setImageUrl("updated-banner.jpg");
        updateReq.setTitle("Updated Title");

        when(shopBannerRepository.save(any(ShopBanner.class))).thenAnswer(i -> i.getArgument(0));

        ShopBanner updated = ownerStorefrontService.updateBanner(ownerId, 10L, updateReq);
        assertEquals("updated-banner.jpg", updated.getImageUrl());
        assertEquals("Updated Title", updated.getTitle());
    }
}
