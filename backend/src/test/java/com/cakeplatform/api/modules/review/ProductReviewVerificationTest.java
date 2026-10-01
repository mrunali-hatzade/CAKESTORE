package com.cakeplatform.api.modules.review;

import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderItem;
import com.cakeplatform.api.modules.order.OrderItemRepository;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.review.dto.*;
import com.cakeplatform.api.modules.review.service.ProductReviewService;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductReviewVerificationTest {

    @Mock
    private ProductReviewRepository productReviewRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private ShopRepository shopRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private com.cakeplatform.api.modules.notification.EmailService emailService;
    @Mock
    private com.cakeplatform.api.modules.notification.SmsService smsService;
    @Mock
    private com.cakeplatform.api.modules.interaction.FeedbackRepository feedbackRepository;

    @InjectMocks
    private ProductReviewService productReviewService;

    private Shop testShop;
    private User testOwner;
    private Product testProduct;
    private Order testOrder;
    private OrderItem testOrderItem;

    @BeforeEach
    void setUp() {
        testOwner = new User();
        testOwner.setId(100L);
        testOwner.setEmail("baker100@example.com");
        testOwner.setFullName("Baker 100");

        testShop = new Shop();
        testShop.setId(15L);
        testShop.setBusinessName("Sweet Delights");
        testShop.setStatus(ShopStatus.ACTIVE);
        testShop.setOwner(testOwner);

        testProduct = new Product();
        testProduct.setId(201L);
        testProduct.setName("Belgian Dark Truffle");
        testProduct.setShop(testShop);
        testProduct.setPrice(BigDecimal.valueOf(850));

        testOrder = new Order();
        testOrder.setId(501L);
        testOrder.setOrderNumber("ORD-TEST1234");
        testOrder.setShop(testShop);
        testOrder.setCustomerName("Priya Deshmukh");
        testOrder.setCustomerPhone("+919823100000");
        testOrder.setOrderStatus("DELIVERED");

        testOrderItem = new OrderItem();
        testOrderItem.setId(901L);
        testOrderItem.setOrder(testOrder);
        testOrderItem.setProduct(testProduct);
        testOrderItem.setProductNameSnapshot("Belgian Dark Truffle");
        testOrderItem.setQuantity(1);
        testOrderItem.setTotalPrice(BigDecimal.valueOf(850));
    }

    @Test
    @DisplayName("Delivered order item submission succeeds with verified purchase badge")
    void testSubmitReview_DeliveredOrder_Success() {
        when(shopRepository.findById(15L)).thenReturn(Optional.of(testShop));
        when(productRepository.findById(201L)).thenReturn(Optional.of(testProduct));
        when(orderRepository.findByOrderNumber("ORD-TEST1234")).thenReturn(Optional.of(testOrder));
        when(orderItemRepository.findById(901L)).thenReturn(Optional.of(testOrderItem));
        when(productReviewRepository.existsByOrderItemId(901L)).thenReturn(false);

        ProductReview saved = ProductReview.builder()
                .id(1L)
                .shop(testShop)
                .product(testProduct)
                .order(testOrder)
                .orderItem(testOrderItem)
                .customerName("Priya Deshmukh")
                .customerPhone("+919823100000")
                .rating(5)
                .reviewText("Absolutely heavenly chocolate taste!")
                .isVerifiedPurchase(true)
                .createdAt(LocalDateTime.now())
                .build();
        when(productReviewRepository.save(any(ProductReview.class))).thenReturn(saved);

        SubmitProductReviewRequest request = new SubmitProductReviewRequest();
        request.setOrderNumber("ORD-TEST1234");
        request.setCustomerPhone("9823100000");
        request.setOrderItemId(901L);
        request.setRating(5);
        request.setReviewText("Absolutely heavenly chocolate taste!");

        PublicProductReviewResponse response = productReviewService.submitReview(15L, 201L, request);

        assertNotNull(response);
        assertEquals(5, response.getRating());
        assertEquals("Priya D.", response.getCustomerDisplayName());
        assertTrue(response.getIsVerifiedPurchase());
        verify(productReviewRepository, times(1)).save(any(ProductReview.class));
    }

    @Test
    @DisplayName("Non-delivered order rejects review submission with IllegalStateException")
    void testSubmitReview_NonDelivered_ThrowsException() {
        testOrder.setOrderStatus("PREPARING");

        when(shopRepository.findById(15L)).thenReturn(Optional.of(testShop));
        when(productRepository.findById(201L)).thenReturn(Optional.of(testProduct));
        when(orderRepository.findByOrderNumber("ORD-TEST1234")).thenReturn(Optional.of(testOrder));

        SubmitProductReviewRequest request = new SubmitProductReviewRequest();
        request.setOrderNumber("ORD-TEST1234");
        request.setCustomerPhone("9823100000");
        request.setOrderItemId(901L);
        request.setRating(5);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                productReviewService.submitReview(15L, 201L, request));

        assertTrue(ex.getMessage().contains("Only delivered or completed"));
        verify(productReviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Mismatched customer phone rejects review submission with SecurityException")
    void testSubmitReview_PhoneMismatch_ThrowsSecurityException() {
        when(shopRepository.findById(15L)).thenReturn(Optional.of(testShop));
        when(productRepository.findById(201L)).thenReturn(Optional.of(testProduct));
        when(orderRepository.findByOrderNumber("ORD-TEST1234")).thenReturn(Optional.of(testOrder));

        SubmitProductReviewRequest request = new SubmitProductReviewRequest();
        request.setOrderNumber("ORD-TEST1234");
        request.setCustomerPhone("9999999999"); // different phone
        request.setOrderItemId(901L);
        request.setRating(5);

        SecurityException ex = assertThrows(SecurityException.class, () ->
                productReviewService.submitReview(15L, 201L, request));

        assertTrue(ex.getMessage().contains("phone number does not match"));
        verify(productReviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Duplicate review submission on same purchased item rejects with IllegalStateException")
    void testSubmitReview_DuplicateItem_ThrowsException() {
        when(shopRepository.findById(15L)).thenReturn(Optional.of(testShop));
        when(productRepository.findById(201L)).thenReturn(Optional.of(testProduct));
        when(orderRepository.findByOrderNumber("ORD-TEST1234")).thenReturn(Optional.of(testOrder));
        when(orderItemRepository.findById(901L)).thenReturn(Optional.of(testOrderItem));
        when(productReviewRepository.existsByOrderItemId(901L)).thenReturn(true); // already reviewed

        SubmitProductReviewRequest request = new SubmitProductReviewRequest();
        request.setOrderNumber("ORD-TEST1234");
        request.setCustomerPhone("9823100000");
        request.setOrderItemId(901L);
        request.setRating(4);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                productReviewService.submitReview(15L, 201L, request));

        assertTrue(ex.getMessage().contains("already been submitted"));
        verify(productReviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("Owner reply with authorized tenant ownership updates review successfully")
    void testOwnerReply_AuthorizedOwner_Success() {
        when(shopRepository.findByOwnerId(100L)).thenReturn(List.of(testShop));

        ProductReview existing = ProductReview.builder()
                .id(50L)
                .shop(testShop)
                .product(testProduct)
                .order(testOrder)
                .orderItem(testOrderItem)
                .customerName("Priya Deshmukh")
                .rating(5)
                .reviewText("Amazing cake!")
                .build();
        when(productReviewRepository.findById(50L)).thenReturn(Optional.of(existing));
        when(productReviewRepository.save(any(ProductReview.class))).thenAnswer(i -> i.getArgument(0));

        OwnerReviewReplyRequest replyRequest = new OwnerReviewReplyRequest();
        replyRequest.setReply("Thank you so much Priya! It was a delight baking for you.");

        OwnerProductReviewResponse result = productReviewService.replyToProductReview(100L, 50L, replyRequest);

        assertNotNull(result);
        assertEquals("Thank you so much Priya! It was a delight baking for you.", result.getOwnerReply());
        assertNotNull(result.getOwnerRepliedAt());
    }
}
