package com.cakeplatform.api.modules.payment.controller;

import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.Payment;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.payment.RazorpayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/storefront/orders")
@RequiredArgsConstructor
@Slf4j
public class CustomerPaymentController {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final RazorpayService razorpayService;
    private final NotificationService notificationService;
    private final com.cakeplatform.api.modules.notification.AdminNotificationService adminNotificationService;

    /**
     * C1: Create / initialize a real Razorpay payment order for a customer order.
     * The payable amount is strictly authoritative from the server-side Order entity.
     */
    @PostMapping("/{orderNumber}/create-payment-order")
    public ResponseEntity<Map<String, Object>> createCustomerPaymentOrder(
            @PathVariable String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderNumber));

        if ("CANCELLED".equalsIgnoreCase(order.getOrderStatus())) {
            throw new IllegalStateException("Cannot initiate payment for a cancelled order");
        }
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            throw new IllegalStateException("Order is already paid");
        }

        BigDecimal authoritativeAmount = order.getTotalAmount();
        long amountPaise = authoritativeAmount.multiply(BigDecimal.valueOf(100))
                .setScale(0, java.math.RoundingMode.UNNECESSARY).longValueExact();

        // Check if an existing PENDING payment order can be reused to avoid duplicates on repeated initiation
        String razorpayOrderId = null;
        Payment payment = null;
        if (order.getTransactionId() != null && order.getTransactionId().startsWith("order_")) {
            payment = paymentRepository.findByProviderOrderId(order.getTransactionId()).orElse(null);
            if (payment != null && "PENDING".equalsIgnoreCase(payment.getStatus())) {
                razorpayOrderId = payment.getProviderOrderId();
            }
        }

        if (razorpayOrderId == null) {
            String receiptId = "rcpt_" + order.getOrderNumber();
            Long shopId = order.getShop() != null ? order.getShop().getId() : null;
            razorpayOrderId = razorpayService.createCustomerOrder(authoritativeAmount, order.getOrderNumber(), shopId, receiptId);

            if (payment == null) {
                payment = new Payment();
                payment.setShop(order.getShop());
                payment.setAmount(authoritativeAmount);
                payment.setCurrency("INR");
                payment.setProvider("RAZORPAY");
                payment.setStatus("PENDING");
            }
            payment.setProviderOrderId(razorpayOrderId);
            payment.setFailureReason("ORDER:" + order.getOrderNumber());
            paymentRepository.save(payment);

            order.setPaymentMethod("RAZORPAY");
            order.setTransactionId(razorpayOrderId);
            orderRepository.save(order);
        }

        return ResponseEntity.ok(Map.of(
                "orderNumber", order.getOrderNumber(),
                "razorpayOrderId", razorpayOrderId,
                "amount", authoritativeAmount,
                "amountPaise", amountPaise,
                "currency", "INR",
                "keyId", razorpayService.getKeyId() != null ? razorpayService.getKeyId() : "",
                "shopName", order.getShop() != null ? order.getShop().getBusinessName() : "CakeStore",
                "customerName", order.getCustomerName() != null ? order.getCustomerName() : "",
                "customerEmail", order.getCustomerEmail() != null ? order.getCustomerEmail() : "",
                "customerPhone", order.getCustomerPhone() != null ? order.getCustomerPhone() : ""
        ));
    }

    /**
     * C1: Verify payment signature for customer order and update state idempotently.
     */
    @PostMapping("/{orderNumber}/verify-payment")
    public ResponseEntity<Map<String, Object>> verifyCustomerPayment(
            @PathVariable String orderNumber,
            @RequestBody Map<String, String> payload) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new IllegalArgumentException("Order not found: " + orderNumber));

        if ("CANCELLED".equalsIgnoreCase(order.getOrderStatus())) {
            throw new IllegalStateException("Cannot verify payment for a cancelled order");
        }

        String razorpayOrderId = payload.get("razorpayOrderId");
        String razorpayPaymentId = payload.get("razorpayPaymentId");
        String razorpaySignature = payload.get("razorpaySignature");

        if (razorpayOrderId == null || razorpayOrderId.isBlank()
                || razorpayPaymentId == null || razorpayPaymentId.isBlank()
                || razorpaySignature == null || razorpaySignature.isBlank()) {
            throw new IllegalArgumentException("Missing required payment verification parameters");
        }

        // Verify Razorpay order ID belongs to this local order/payment
        if (order.getTransactionId() != null 
                && !order.getTransactionId().equals(razorpayOrderId) 
                && !order.getTransactionId().equals(razorpayPaymentId) 
                && !"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            log.warn("Razorpay order ID mismatch for order {}. Expected {}, got {}", 
                    orderNumber, order.getTransactionId(), razorpayOrderId);
            throw new IllegalArgumentException("Payment verification failed. Razorpay order ID does not match local order.");
        }

        // Idempotency: if already PAID, return success without duplicate actions
        if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            Payment existingPayment = paymentRepository.findByProviderPaymentId(razorpayPaymentId)
                    .or(() -> paymentRepository.findByProviderOrderId(razorpayOrderId))
                    .orElse(null);
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "Order already verified and paid",
                    "orderNumber", order.getOrderNumber(),
                    "paymentId", existingPayment != null ? existingPayment.getId() : 0L
            ));
        }

        // Signature check and authoritative order verification when credentials are configured
        if (razorpayService.isConfigured()) {
            boolean valid = razorpayService.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
            if (!valid) {
                log.warn("Payment verification failed for customer order {}", orderNumber);
                Payment failedPayment = paymentRepository.findByProviderOrderId(razorpayOrderId).orElse(null);
                if (failedPayment != null && "PENDING".equalsIgnoreCase(failedPayment.getStatus())) {
                    failedPayment.setStatus("FAILED");
                    failedPayment.setFailureReason("Invalid signature");
                    paymentRepository.save(failedPayment);
                }
                throw new IllegalArgumentException("Payment verification failed. Invalid signature.");
            }
            // Double check that Razorpay recorded the expected amount and currency
            razorpayService.verifyOrderDetails(razorpayOrderId, order.getTotalAmount(), "INR");
        }

        // Update Order
        order.setPaymentStatus("PAID");
        order.setPaymentMethod("RAZORPAY");
        order.setTransactionId(razorpayPaymentId);
        order.setPaidAt(LocalDateTime.now());
        if ("NEW".equalsIgnoreCase(order.getOrderStatus()) || "PENDING".equalsIgnoreCase(order.getOrderStatus())) {
            order.setOrderStatus("CONFIRMED");
        }
        orderRepository.save(order);

        // Record / Update Payment
        Payment payment = paymentRepository.findByProviderOrderId(razorpayOrderId)
                .or(() -> paymentRepository.findByProviderPaymentId(razorpayPaymentId))
                .orElseGet(Payment::new);
        payment.setShop(order.getShop());
        payment.setAmount(order.getTotalAmount());
        payment.setCurrency("INR");
        payment.setProvider("RAZORPAY");
        payment.setProviderOrderId(razorpayOrderId);
        payment.setProviderPaymentId(razorpayPaymentId);
        payment.setStatus("COMPLETED");
        payment.setPaidAt(LocalDateTime.now());
        payment.setFailureReason("ORDER:" + order.getOrderNumber());
        paymentRepository.save(payment);

        // Dispatch Notification to Bakery Owner
        if (order.getShop() != null && order.getShop().getOwner() != null && notificationService != null) {
            notificationService.createNotification(
                    order.getShop().getOwner(),
                    NotificationType.NEW_ORDER,
                    "Payment Received (Razorpay)",
                    String.format("Payment of ₹%s for Order %s has been confirmed.", order.getTotalAmount(), order.getOrderNumber()),
                    order.getId().toString(),
                    true
            );
        }

        // Dispatch Admin Notification (PAYMENT_RECEIVED - idempotent by payment ID)
        try {
            adminNotificationService.dispatchAdminNotification(
                    com.cakeplatform.api.modules.notification.AdminNotificationType.PAYMENT_RECEIVED,
                    "Payment Received: ₹" + order.getTotalAmount(),
                    String.format("Payment of ₹%s received for order %s (%s).",
                            order.getTotalAmount(), order.getOrderNumber(),
                            order.getShop() != null ? order.getShop().getBusinessName() : "Bakery"),
                    com.cakeplatform.api.modules.notification.AdminNotificationPriority.NORMAL,
                    com.cakeplatform.api.modules.notification.AdminNotificationCategory.PAYMENTS,
                    razorpayPaymentId,
                    "PAYMENT",
                    order.getShop() != null ? "/admin/shops/" + order.getShop().getId() : "/admin/shops"
            );
        } catch (Exception ignored) {}

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Payment verified and order confirmed",
                "orderNumber", order.getOrderNumber(),
                "paymentId", payment.getId() != null ? payment.getId() : 0L
        ));
    }
}
