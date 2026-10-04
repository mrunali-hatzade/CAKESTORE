package com.cakeplatform.api.modules.shop;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.notification.AdminNotificationCategory;
import com.cakeplatform.api.modules.notification.AdminNotificationPriority;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.modules.notification.AdminNotificationType;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopStatusManager {

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;


    private final ShopRepository shopRepository;
    private final ActivityLoggerService activityLogger;
    private final AdminNotificationService adminNotificationService;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

        @Transactional
    public void activateShop(Long shopId, Long actorUserId) {
        // Enforce Subscription Paywall: Admin cannot manually activate an EXPIRED shop without a payment
        boolean hasActiveSubscription = subscriptionRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(shopId, com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE).isPresent();
        if (!hasActiveSubscription) {
            throw new RuntimeException("Cannot activate shop: This bakery does not have an active subscription. They must pay to automatically activate.");
        }
        changeShopStatus(shopId, ShopStatus.ACTIVE, actorUserId, "SHOP_ACTIVATED");
    }

    @Transactional
    public void markShopInactive(Long shopId, Long actorUserId) {
        changeShopStatus(shopId, ShopStatus.INACTIVE, actorUserId, "SHOP_BECAME_INACTIVE");
    }

    @Transactional
    public void suspendShop(Long shopId, Long actorUserId, String reason) {
        String metadata = (reason != null && !reason.trim().isEmpty())
                ? "Suspended: " + reason.trim()
                : "Status changed to SUSPENDED";
        changeShopStatus(shopId, ShopStatus.SUSPENDED, actorUserId, "SHOP_SUSPENDED", metadata);
    }

    @Transactional
    public void suspendShop(Long shopId, Long actorUserId) {
        suspendShop(shopId, actorUserId, null);
    }

    private void changeShopStatus(Long shopId, ShopStatus newStatus, Long actorUserId, String action) {
        changeShopStatus(shopId, newStatus, actorUserId, action, "Status changed to " + newStatus.name());
    }

    private void changeShopStatus(Long shopId, ShopStatus newStatus, Long actorUserId, String action, String metadata) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        
        shop.setStatus(newStatus);
        shopRepository.save(shop);

        activityLogger.logActivity(
                actorUserId,
                shopId,
                action,
                "SHOP",
                shopId,
                metadata
        );

        if (newStatus == ShopStatus.SUSPENDED) {
            try {
                adminNotificationService.dispatchAdminNotification(
                        AdminNotificationType.BAKERY_SUSPENDED,
                        "Bakery Suspended: " + shop.getBusinessName(),
                        String.format("Bakery %s has been suspended. Reason: %s", shop.getBusinessName(), metadata != null ? metadata : "Administrative action"),
                        AdminNotificationPriority.HIGH,
                        AdminNotificationCategory.BAKERY,
                        shopId.toString(),
                        "SHOP",
                        "/admin/shops/" + shopId
                );

                User owner = userRepository.findById(shop.getOwner().getId()).orElse(null);
                if (owner != null) {
                    notificationService.createNotification(owner, NotificationType.ADMIN_MESSAGE, "Bakery Account Suspended", "Your bakery has been suspended. Reason: " + metadata, shopId.toString(), true);
                }
            } catch (Exception ex) {
                log.error("Failed to dispatch admin notification for shop suspension: {}", ex.getMessage());
            }
        }
    }
}
