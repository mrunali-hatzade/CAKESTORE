package com.cakeplatform.api.modules.order.scheduler;

import com.cakeplatform.api.modules.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderExpiryScheduler {

    private final OrderService orderService;

    // Run every minute
    @Scheduled(fixedDelay = 60000)
    public void processExpiredOrders() {
        try {
            // PAYMENT_PENDING timeout = 15 minutes
            LocalDateTime expiryThreshold = LocalDateTime.now().minusMinutes(15);
            orderService.cancelStalePaymentPendingOrders(expiryThreshold);
        } catch (Exception e) {
            log.error("Error during scheduled PAYMENT_PENDING order expiry processing", e);
        }
    }
}
