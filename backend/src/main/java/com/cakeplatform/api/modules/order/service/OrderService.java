package com.cakeplatform.api.modules.order.service;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.notification.EmailService;
import com.cakeplatform.api.modules.notification.SmsService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.shop.Shop;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final com.cakeplatform.api.modules.security.ShopAccessValidator shopAccessValidator;
    private final ActivityLoggerService activityLogger;
    private final EmailService emailService;
    private final SmsService smsService;

    private Shop getShopByOwnerId(Long ownerId) {
        return shopAccessValidator.getValidShopForOwner(ownerId);
    }

    public org.springframework.data.domain.Page<Order> getPaginatedOrdersByUserId(Long userId, org.springframework.data.domain.Pageable pageable) {
        Shop shop = getShopByOwnerId(userId);
        return orderRepository.findVisibleOrdersByShopId(shop.getId(), pageable);
    }

    public List<Order> getOrdersByUserId(Long userId) {
        Shop shop = getShopByOwnerId(userId);
        return orderRepository.findVisibleOrdersByShopId(shop.getId());
    }

    public Order getOrderDetails(Long userId, Long orderId) {
        Shop shop = getShopByOwnerId(userId);
        return orderRepository.findByIdAndShopId(orderId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Order not found or unauthorized"));
    }

    private static final java.util.Map<String, java.util.List<String>> ALLOWED_TRANSITIONS = java.util.Map.of(
        "NEW", java.util.List.of("CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"),
        "CONFIRMED", java.util.List.of("PREPARING", "READY", "COMPLETED", "CANCELLED"),
        "PREPARING", java.util.List.of("READY", "COMPLETED", "CANCELLED"),
        "READY", java.util.List.of("DELIVERED", "COMPLETED", "CANCELLED"),
        "DELIVERED", java.util.List.of("COMPLETED")
    );

    @Transactional
    public Order updateOrderStatus(Long userId, Long orderId, String newStatusRaw) {
        String newStatus = newStatusRaw != null ? newStatusRaw.trim().toUpperCase() : "";
        Shop shop = getShopByOwnerId(userId);
        Order order = orderRepository.findByIdAndShopId(orderId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Order not found or unauthorized"));

        String currentStatus = order.getOrderStatus() != null ? order.getOrderStatus().toUpperCase() : "NEW";

        if ("COMPLETED".equals(currentStatus) || "CANCELLED".equals(currentStatus)) {
            throw new IllegalStateException("Order is in a terminal state and cannot be modified.");
        }

        if (currentStatus.equals(newStatus)) {
            return order;
        }

        java.util.List<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, java.util.List.of());
        if (!allowed.contains(newStatus)) {
            throw new IllegalArgumentException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        order.setOrderStatus(newStatus);
        Order updated = orderRepository.save(order);
        
        activityLogger.logActivity(userId, shop.getId(), "ORDER_STATUS_CHANGED", "ORDER", updated.getId(), "Status: " + newStatus);

        notifyCustomer(shop, updated);

        return updated;
    }

    private void notifyCustomer(Shop shop, Order order) {
        try {
            String shopName = shop.getBusinessName() != null ? shop.getBusinessName() : "CakeStore Bakery";
            String subject = String.format("Order Update: Your order #%s is now %s", order.getOrderNumber(), order.getOrderStatus());
            String body = String.format("Hello %s,\n\nYour order #%s at %s has been updated. The current status is now: %s.\n\nThank you for choosing us!",
                    order.getCustomerName() != null ? order.getCustomerName() : "Customer",
                    order.getOrderNumber(),
                    shopName,
                    order.getOrderStatus()
            );

            if (order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
                emailService.sendEmail(order.getCustomerEmail(), subject, body);
            }

            if (order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) {
                String smsBody = String.format("Update from %s: Your order #%s is now %s.", shopName, order.getOrderNumber(), order.getOrderStatus());
                smsService.sendSms(order.getCustomerPhone(), smsBody);
            }
        } catch (Exception e) {
            // Failsafe to ensure notification exceptions NEVER roll back the transaction
        }
    }

    @Transactional
    public Order updatePaymentStatus(Long userId, Long orderId, String newPaymentStatusRaw, String paymentNote) {
        String newStatus = newPaymentStatusRaw != null ? newPaymentStatusRaw.trim().toUpperCase() : "PAID";
        Shop shop = getShopByOwnerId(userId);
        Order order = orderRepository.findByIdAndShopId(orderId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Order not found or unauthorized"));

        if (order.getPaymentStatus() != null && order.getPaymentStatus().equalsIgnoreCase(newStatus)) {
            return order;
        }

        order.setPaymentStatus(newStatus);
        if ("PAID".equalsIgnoreCase(newStatus)) {
            order.setPaidAt(java.time.LocalDateTime.now());
            if (order.getTransactionId() == null || order.getTransactionId().isBlank()) {
                order.setTransactionId(paymentNote != null && !paymentNote.isBlank() ? paymentNote : "CASH_COLLECTED");
            }
        } else if ("PENDING".equalsIgnoreCase(newStatus)) {
            order.setPaidAt(null);
            if ("CASH_COLLECTED".equalsIgnoreCase(order.getTransactionId())) {
                order.setTransactionId(null);
            }
        }

        Order updated = orderRepository.save(order);

        activityLogger.logActivity(userId, shop.getId(), "ORDER_PAYMENT_STATUS_CHANGED", "ORDER", updated.getId(),
                "Payment Status: " + newStatus + (paymentNote != null ? " (" + paymentNote + ")" : ""));

        notifyCustomerPaymentReceived(shop, updated);

        return updated;
    }

    private void notifyCustomerPaymentReceived(Shop shop, Order order) {
        try {
            if (!"PAID".equalsIgnoreCase(order.getPaymentStatus())) return;
            String shopName = shop.getBusinessName() != null ? shop.getBusinessName() : "CakeStore Bakery";
            String subject = String.format("Payment Received: Order #%s at %s", order.getOrderNumber(), shopName);
            String body = String.format("Hello %s,\n\nWe have successfully received payment of ₹%s for your order #%s at %s (Payment Mode: %s).\n\nThank you for ordering with us!",
                    order.getCustomerName() != null ? order.getCustomerName() : "Customer",
                    order.getTotalAmount(),
                    order.getOrderNumber(),
                    shopName,
                    "COD".equalsIgnoreCase(order.getPaymentMethod()) ? "Cash on Delivery" : "Online / Prepaid"
            );

            if (order.getCustomerEmail() != null && !order.getCustomerEmail().isBlank()) {
                emailService.sendEmail(order.getCustomerEmail(), subject, body);
            }

            if (order.getCustomerPhone() != null && !order.getCustomerPhone().isBlank()) {
                String smsBody = String.format("Payment received: ₹%s for order #%s at %s. Thank you!",
                        order.getTotalAmount(), order.getOrderNumber(), shopName);
                smsService.sendSms(order.getCustomerPhone(), smsBody);
            }
        } catch (Exception e) {
            // Non-blocking notification failsafe
        }
    }
}
