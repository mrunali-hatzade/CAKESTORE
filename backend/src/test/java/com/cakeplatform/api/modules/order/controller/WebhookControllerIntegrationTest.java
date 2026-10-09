package com.cakeplatform.api.modules.order.controller;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.payment.WebhookEventRepository;
import com.cakeplatform.api.modules.payment.RazorpayService;
import com.cakeplatform.api.modules.subscription.SubscriptionService;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.security.CustomUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(SpringExtension.class)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class WebhookControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private WebhookEventRepository webhookEventRepository;

    @MockBean
    private RazorpayService razorpayService; // mock signature verification & secret handling

    @MockBean
    private SubscriptionService subscriptionService; // stub to avoid side effects

    @MockBean
    private NotificationService notificationService; // stub

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private ActivityLoggerService activityLogger;

    private String eventId;
    private String orderNumber;
    private String razorpayOrderId;
    private String transactionId;

    @BeforeEach
    public void setUp() {
        long timestamp = System.currentTimeMillis();
        eventId = "evt_" + timestamp;
        orderNumber = "ORD-" + timestamp;
        razorpayOrderId = "order_" + timestamp;
        transactionId = "pay_" + timestamp;

        // Ensure razorpay service behaves as if secret is configured and signature is valid.
        Mockito.when(razorpayService.getWebhookSecret()).thenReturn("test_secret");
        Mockito.when(razorpayService.verifyWebhookSignature(Mockito.anyString(), Mockito.anyString()))
                .thenReturn(true);

        userRepository.deleteAll();
        shopRepository.deleteAll();

        User owner = new User();
        owner.setEmail("owner" + System.currentTimeMillis() + "@test.com");
        owner.setRole(UserRole.SHOP_OWNER);
        owner.setMobile(java.util.UUID.randomUUID().toString().substring(0, 10));
        owner.setFullName("First Last");
        owner.setPasswordHash("pass");
        owner = userRepository.saveAndFlush(owner);

        Shop shop = new Shop();
        shop.setBusinessName("Test Shop");
        shop.setOwner(owner);
        shop.setPhone("1234567890");
        shop.setAddressLine1("Address");
        shop.setCity("City");
        shop.setState("State");
        shop.setPincode("123456");
        shop = shopRepository.saveAndFlush(shop);

        // Clean repositories before each test.
        paymentRepository.deleteAll();
        orderRepository.deleteAll();
        webhookEventRepository.deleteAll();
    }

    private String buildPayload(String event) {
        Map<String, Object> entity = new HashMap<>();
        entity.put("id", transactionId);
        entity.put("order_id", razorpayOrderId);
        entity.put("amount", 105000L); // paise (₹1050)
        entity.put("currency", "INR");
        Map<String, Object> notes = new HashMap<>();
        notes.put("internal_order_number", orderNumber);
        entity.put("notes", notes);
        Map<String, Object> payment = new HashMap<>();
        payment.put("entity", entity);
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", event);
        Map<String, Object> payloadWrapper = new HashMap<>();
        payloadWrapper.put("payment", payment);
        payload.put("payload", payloadWrapper);
        try {
            return new ObjectMapper().writeValueAsString(payload);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    public void testValidSignatureFirstDeliveryProcessesOrder() throws Exception {
        // Arrange: persist an order that matches the internal_order_number.
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setPaymentStatus("PENDING");
        order.setOrderStatus("NEW");
        order.setTotalAmount(new BigDecimal("1050"));
        order.setSubtotal(new BigDecimal("1050"));
        order.setShop(shopRepository.findAll().get(0));
        orderRepository.save(order);

        String payload = buildPayload("payment.captured");

        // Act & Assert
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "valid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("order confirmed")));

        // Verify DB state
        Order updated = orderRepository.findByOrderNumber(orderNumber).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(updated.getPaymentStatus()).isEqualTo("PAID");
        org.assertj.core.api.Assertions.assertThat(updated.getOrderStatus()).isEqualTo("CONFIRMED");
        org.assertj.core.api.Assertions.assertThat(paymentRepository.findByProviderPaymentId(transactionId)).isPresent();
        org.assertj.core.api.Assertions.assertThat(webhookEventRepository.existsByEventId(eventId)).isTrue();
    }

    @Test
    public void testInvalidSignatureNoDatabaseChanges() throws Exception {
        Mockito.when(razorpayService.verifyWebhookSignature(Mockito.anyString(), Mockito.anyString()))
                .thenReturn(false);
        String payload = buildPayload("payment.captured");
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "invalid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Invalid webhook signature")));

        // Ensure nothing was persisted
        org.assertj.core.api.Assertions.assertThat(orderRepository.count()).isZero();
        org.assertj.core.api.Assertions.assertThat(paymentRepository.count()).isZero();
        org.assertj.core.api.Assertions.assertThat(webhookEventRepository.count()).isZero();
    }

    @Test
    public void testDuplicateDeliveryIsIdempotent() throws Exception {
        // First successful delivery
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setPaymentStatus("PENDING");
        order.setOrderStatus("NEW");
        order.setTotalAmount(new BigDecimal("1050"));
        order.setSubtotal(new BigDecimal("1050"));
        order.setShop(shopRepository.findAll().get(0));
        orderRepository.save(order);
        String payload = buildPayload("payment.captured");
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "valid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());

        // Second duplicate delivery
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "valid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("duplicate")));

        // Verify only one payment record exists
        org.assertj.core.api.Assertions.assertThat(paymentRepository.findAll()).hasSize(1);
    }

    @Test
    public void testProcessingFailureRollsBackAllChanges() throws Exception {
        // Simulate a failure after the webhook event is saved by forcing orderRepository.save to throw.
        Mockito.doThrow(new RuntimeException("forced failure"))
                .when(activityLogger).logActivity(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());

        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setPaymentStatus("PENDING");
        order.setOrderStatus("NEW");
        order.setTotalAmount(new BigDecimal("1050"));
        order.setSubtotal(new BigDecimal("1050"));
        order.setShop(shopRepository.findAll().get(0));
        orderRepository.save(order);
        String payload = buildPayload("payment.captured");

        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "valid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isInternalServerError());

        // Verify that neither order nor payment nor webhook event persisted.
        org.assertj.core.api.Assertions.assertThat(orderRepository.findByOrderNumber(orderNumber)).isEmpty();
        org.assertj.core.api.Assertions.assertThat(paymentRepository.count()).isZero();
        org.assertj.core.api.Assertions.assertThat(webhookEventRepository.existsByEventId(eventId)).isFalse();
    }

    @Test
    public void testRetryAfterFailureSucceeds() throws Exception {
        // First request fails due to mocked exception.
        Mockito.doThrow(new RuntimeException("forced failure"))
                .when(activityLogger).logActivity(Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any());
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setPaymentStatus("PENDING");
        order.setOrderStatus("NEW");
        order.setTotalAmount(new BigDecimal("1050"));
        order.setSubtotal(new BigDecimal("1050"));
        order.setShop(shopRepository.findAll().get(0));
        orderRepository.save(order);
        String payload = buildPayload("payment.captured");
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "valid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isInternalServerError());

        // Reset mock to succeed.
        Mockito.reset(activityLogger);
        // Persist order again for retry.
        orderRepository.save(order);
        mockMvc.perform(post("/api/webhooks/razorpay")
                .header("X-Razorpay-Signature", "valid_sig")
                .header("X-Razorpay-Event-Id", eventId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isOk());

        // Verify successful processing.
        org.assertj.core.api.Assertions.assertThat(orderRepository.findByOrderNumber(orderNumber)).isPresent();
        org.assertj.core.api.Assertions.assertThat(paymentRepository.findAll()).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(webhookEventRepository.existsByEventId(eventId)).isTrue();
    }

    @Test
    public void testConcurrentDuplicateDeliveryOnlyOneProcessing() throws Exception {
        // Prepare order.
        Order order = new Order();
        order.setOrderNumber(orderNumber);
        order.setPaymentStatus("PENDING");
        order.setOrderStatus("NEW");
        order.setTotalAmount(new BigDecimal("1050"));
        order.setSubtotal(new BigDecimal("1050"));
        order.setShop(shopRepository.findAll().get(0));
        orderRepository.save(order);
        String payload = buildPayload("payment.captured");

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    mockMvc.perform(post("/api/webhooks/razorpay")
                            .header("X-Razorpay-Signature", "valid_sig")
                            .header("X-Razorpay-Event-Id", eventId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload))
                            .andExpect(status().isOk());
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await();
        executor.shutdown();

        // Only one payment record should exist.
        org.assertj.core.api.Assertions.assertThat(paymentRepository.findAll()).hasSize(1);
        // Webhook event should exist only once.
        org.assertj.core.api.Assertions.assertThat(webhookEventRepository.count()).isEqualTo(1);
    }
}
