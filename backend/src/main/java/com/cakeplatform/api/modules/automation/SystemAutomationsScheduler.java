package com.cakeplatform.api.modules.automation;

import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class SystemAutomationsScheduler {
    
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;
    
    // Runs every day at 10 AM to remind owners to complete KYC
    @Scheduled(cron = "0 0 10 * * ?")
    public void processKycReminders() {
        log.info("Running automated KYC reminder check...");
        List<Shop> pendingShops = shopRepository.findByStatus(ShopStatus.PENDING);
        LocalDateTime now = LocalDateTime.now();
        int notificationsSent = 0;
        
        for (Shop shop : pendingShops) {
            if (shop.getCreatedAt() == null) continue;
            long daysPending = ChronoUnit.DAYS.between(shop.getCreatedAt().toLocalDate(), now.toLocalDate());
            
            // Send reminder at 3 days and 7 days
            if (daysPending == 3 || daysPending == 7) {
                notificationService.createNotification(
                        shop.getOwner(),
                        NotificationType.DOCUMENT_VERIFICATION,
                        "Action Required: Complete your KYC",
                        String.format("Your bakery '%s' has been pending verification for %d days. Please submit your business documents to activate your storefront.", shop.getBusinessName(), daysPending),
                        shop.getId().toString(),
                        true // triggers email and websocket
                );
                log.info("Sent KYC reminder to Shop ID {}", shop.getId());
                notificationsSent++;
            }
        }
        log.info("KYC reminder check completed. Sent {} reminders.", notificationsSent);
    }
}
