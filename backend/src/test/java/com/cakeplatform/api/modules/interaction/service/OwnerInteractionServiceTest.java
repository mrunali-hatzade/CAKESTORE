package com.cakeplatform.api.modules.interaction.service;

import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeStatus;
import com.cakeplatform.api.modules.interaction.dto.ConvertToOrderRequest;
import com.cakeplatform.api.modules.interaction.dto.ReplyRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.interaction.EnquiryRepository;
import com.cakeplatform.api.modules.interaction.FeedbackRepository;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.notification.EmailService;
import com.cakeplatform.api.modules.notification.SmsService;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Service‑level tests for {@link OwnerInteractionService} covering the five scenarios required for
 * Custom Cakes Phase 1.
 */
class OwnerInteractionServiceTest {

    @Mock
    private FeedbackRepository feedbackRepository;
    @Mock
    private EnquiryRepository enquiryRepository;
    @Mock
    private CustomCakeRequestRepository customCakeRequestRepository;
    @Mock
    private ShopAccessValidator shopAccessValidator;
    @Mock
    private EmailService emailService;
    @Mock
    private SmsService smsService;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private ShopDeliverySlotRepository deliverySlotRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ActivityLoggerService activityLogger;

    @InjectMocks
    private OwnerInteractionService service;

    private Shop mockShop;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        mockShop = new Shop();
        mockShop.setId(1L);
        mockShop.setBusinessName("Test Bakery");
        mockShop.setPhone("+123456789");
        when(shopAccessValidator.getValidShopForOwner(anyLong())).thenReturn(mockShop);
        // Ensure repository.save returns the entity itself for further processing
        when(customCakeRequestRepository.save(any(CustomCakeRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ---------------------------------------------------------------------
    // 1. Valid and invalid status values for updateCustomCakeRequestStatus
    // ---------------------------------------------------------------------
    @Test
    void updateStatus_validStatus_updatesEntity() {
        CustomCakeRequest req = new CustomCakeRequest();
        req.setId(10L);
        req.setShop(mockShop);
        when(customCakeRequestRepository.findByIdAndShopId(eq(10L), eq(mockShop.getId()))).thenReturn(Optional.of(req));

        ReplyRequest reply = new ReplyRequest();
        reply.setReply("We will bake it!");
        CustomCakeRequest saved = service.updateCustomCakeRequestStatus(1L, 10L, CustomCakeStatus.ACCEPTED.name(), reply);
        assertEquals(CustomCakeStatus.ACCEPTED.name(), saved.getStatus());
        assertEquals("We will bake it!", saved.getOwnerResponse());
        verify(customCakeRequestRepository).save(req);
    }

    @Test
    void updateStatus_nullOrBlankStatus_throws() {
        CustomCakeRequest req = new CustomCakeRequest();
        req.setId(11L);
        req.setShop(mockShop);
        when(customCakeRequestRepository.findByIdAndShopId(eq(11L), eq(mockShop.getId()))).thenReturn(Optional.of(req));
        // null status
        IllegalArgumentException ex1 = assertThrows(IllegalArgumentException.class, () ->
                service.updateCustomCakeRequestStatus(1L, 11L, null, new ReplyRequest()));
        assertTrue(ex1.getMessage().contains("Status must be provided"));
        // blank status
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () ->
                service.updateCustomCakeRequestStatus(1L, 11L, "   ", new ReplyRequest()));
        assertTrue(ex2.getMessage().contains("Status must be provided"));
        // unsupported status
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class, () ->
                service.updateCustomCakeRequestStatus(1L, 11L, "UNKNOWN", new ReplyRequest()));
        assertTrue(ex3.getMessage().contains("Invalid status"));
    }

    // ------------------------------------------------------------
    // 2. Cross‑shop protection – request not found for given shop
    // ------------------------------------------------------------
    @Test
    void updateStatus_requestNotInShop_throws() {
        when(customCakeRequestRepository.findByIdAndShopId(eq(999L), anyLong()))
                .thenReturn(Optional.empty());
        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                service.updateCustomCakeRequestStatus(1L, 999L, CustomCakeStatus.PENDING.name(), new ReplyRequest()));
        assertTrue(ex.getMessage().contains("Custom cake request not found"));
    }

    // ------------------------------------------------------------
    // 3. Successful conversion to Order (happy path)
    // ------------------------------------------------------------
    @Test
    void convertToOrder_happyPath_createsOrderAndUpdatesRequest() {
        CustomCakeRequest req = new CustomCakeRequest();
        req.setId(20L);
        req.setShop(mockShop);
        req.setCustomerName("John Doe");
        req.setCustomerEmail("john@example.com");
        req.setCustomerMobile("+111222333");
        req.setOccasion("Birthday");
        req.setFlavour("Vanilla");
        req.setServings(12);
        req.setRequiredDate(LocalDate.now().plusDays(5));
        when(customCakeRequestRepository.findByIdAndShopId(eq(20L), eq(mockShop.getId()))).thenReturn(Optional.of(req));

        // Mock order persistence
        Order savedOrder = new Order();
        savedOrder.setId(100L);
        savedOrder.setOrderNumber("ORD-1234");
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order o = invocation.getArgument(0);
            o.setId(100L);
            o.setOrderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            return o;
        });
        when(orderRepository.findById(anyLong())).thenReturn(Optional.of(savedOrder));

        ConvertToOrderRequest convReq = new ConvertToOrderRequest();
        convReq.setAgreedPrice(BigDecimal.valueOf(5000));
        convReq.setPaymentMethod("COD");
        convReq.setPaymentStatus("PENDING");
        convReq.setDeliveryCharge(BigDecimal.valueOf(200));

        var response = service.convertToOrder(1L, 20L, convReq);
        assertNotNull(response);
        assertEquals(savedOrder.getId(), response.getOrderId());
        // Verify request status is now ACCEPTED and linked order id set
        assertEquals("ACCEPTED", req.getStatus());
        assertEquals(savedOrder.getId(), req.getConvertedOrderId());
        verify(customCakeRequestRepository).save(req);
        verify(orderRepository).save(any(Order.class));
    }

    // ------------------------------------------------------------
    // 4. Negative pricing rejection
    // ------------------------------------------------------------
    @Test
    void convertToOrder_negativePrice_throws() {
        CustomCakeRequest req = new CustomCakeRequest();
        req.setId(30L);
        req.setShop(mockShop);
        when(customCakeRequestRepository.findByIdAndShopId(eq(30L), eq(mockShop.getId()))).thenReturn(Optional.of(req));
        ConvertToOrderRequest convReq = new ConvertToOrderRequest();
        convReq.setAgreedPrice(BigDecimal.valueOf(-10));
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                service.convertToOrder(1L, 30L, convReq));
        assertTrue(ex.getMessage().contains("cannot be negative"));
    }

    // ------------------------------------------------------------
    // 5. Duplicate conversion rejection
    // ------------------------------------------------------------
    @Test
    void convertToOrder_alreadyConverted_throws() {
        CustomCakeRequest req = new CustomCakeRequest();
        req.setId(40L);
        req.setShop(mockShop);
        req.setConvertedOrderId(200L);
        when(customCakeRequestRepository.findByIdAndShopId(eq(40L), eq(mockShop.getId()))).thenReturn(Optional.of(req));
        Order existing = new Order();
        existing.setId(200L);
        existing.setOrderNumber("ORD-EXIST");
        when(orderRepository.findById(eq(200L))).thenReturn(Optional.of(existing));
        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                service.convertToOrder(1L, 40L, null));
        assertTrue(ex.getMessage().contains("already been converted"));
    }
}
