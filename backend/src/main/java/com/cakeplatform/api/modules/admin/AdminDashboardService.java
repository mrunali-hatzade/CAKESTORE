package com.cakeplatform.api.modules.admin;

import com.cakeplatform.api.modules.admin.dto.AdminShopDetailsResponse;
import com.cakeplatform.api.modules.admin.dto.AdminShopSummaryResponse;
import com.cakeplatform.api.modules.admin.dto.DashboardStatsResponse;
import com.cakeplatform.api.modules.audit.ActivityLogRepository;
import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionStatus;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminDashboardService {

    private final ShopRepository shopRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ActivityLogRepository activityLogRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final ShopStatusManager shopStatusManager;
    private final BusinessDocumentRepository businessDocumentRepository;
    private final NotificationService notificationService;
    private final ActivityLoggerService activityLogger;
    @Autowired(required = false)
    private com.cakeplatform.api.modules.storefront.StorefrontCacheService storefrontCacheService;

    @Autowired
    public AdminDashboardService(
            ShopRepository shopRepository,
            UserRepository userRepository,
            PaymentRepository paymentRepository,
            SubscriptionRepository subscriptionRepository,
            ActivityLogRepository activityLogRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ShopStatusManager shopStatusManager,
            BusinessDocumentRepository businessDocumentRepository,
            NotificationService notificationService,
            ActivityLoggerService activityLogger) {
        this.shopRepository = shopRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.activityLogRepository = activityLogRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.shopStatusManager = shopStatusManager;
        this.businessDocumentRepository = businessDocumentRepository;
        this.notificationService = notificationService;
        this.activityLogger = activityLogger;
    }

    // Backwards-compatible constructor for existing test suites
    public AdminDashboardService(
            ShopRepository shopRepository,
            UserRepository userRepository,
            PaymentRepository paymentRepository,
            SubscriptionRepository subscriptionRepository,
            ActivityLogRepository activityLogRepository,
            ProductRepository productRepository,
            OrderRepository orderRepository,
            ShopStatusManager shopStatusManager) {
        this(shopRepository, userRepository, paymentRepository, subscriptionRepository, activityLogRepository,
             productRepository, orderRepository, shopStatusManager, null, null, null);
    }

    @Value("${app.business.default-timezone:Asia/Kolkata}")
    private String configuredTimezone;

    public ZoneId getOperationalZone() {
        try {
            return ZoneId.of(configuredTimezone);
        } catch (Exception e) {
            return ZoneId.of("Asia/Kolkata");
        }
    }

    public DashboardStatsResponse getPlatformStats() {
        DashboardStatsResponse stats = new DashboardStatsResponse();
        stats.setTotalShops(shopRepository.count());
        stats.setActiveShops(shopRepository.countByStatus(ShopStatus.ACTIVE));
        stats.setSuspendedShops(shopRepository.countByStatus(ShopStatus.SUSPENDED));
        stats.setInactiveShops(shopRepository.countByStatus(ShopStatus.INACTIVE));
        stats.setPendingShops(shopRepository.countByStatus(ShopStatus.PENDING));
        stats.setTotalUsers(userRepository.count());

        // Timezone-bounded metrics using configured business timezone
        ZoneId zone = getOperationalZone();
        LocalDate today = LocalDate.now(zone);
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();

        stats.setTodayRegistrations(userRepository.countByCreatedAtGreaterThanEqual(startOfDay));
        stats.setActiveSubscriptions(subscriptionRepository.countByStatus(SubscriptionStatus.ACTIVE));
        stats.setExpiredSubscriptions(subscriptionRepository.countByStatus(SubscriptionStatus.EXPIRED));
        stats.setTodayPayments(paymentRepository.countTodayCompletedPayments(startOfDay));

        // Canonical Realized Revenue (Phase 6A unified rule across platform)
        BigDecimal monthlyRev = orderRepository.sumMonthlyRealizedRevenue(startOfMonth);
        if (monthlyRev == null || monthlyRev.compareTo(BigDecimal.ZERO) == 0) {
            BigDecimal subRev = paymentRepository.getMonthlyRevenue(startOfMonth);
            if (subRev != null && subRev.compareTo(BigDecimal.ZERO) > 0) {
                monthlyRev = subRev;
            } else if (monthlyRev == null) {
                monthlyRev = BigDecimal.ZERO;
            }
        }
        stats.setMonthlyRevenue(monthlyRev);

        BigDecimal revenue = paymentRepository.getTotalRevenue();
        stats.setTotalRevenue(revenue != null ? revenue : BigDecimal.ZERO);

        return stats;
    }

    public List<AdminShopSummaryResponse> getAllShops() {
        return shopRepository.findAll().stream().map(shop -> {
            AdminShopSummaryResponse summary = new AdminShopSummaryResponse();
            summary.setShopId(shop.getId());
            summary.setBusinessName(shop.getBusinessName());
            summary.setShopStatus(shop.getStatus().name());
            summary.setRegisteredAt(shop.getCreatedAt());

            User owner = shop.getOwner();
            if (owner != null) {
                summary.setOwnerName(owner.getFullName());
                summary.setOwnerEmail(owner.getEmail());
            }

            return summary;
        }).collect(Collectors.toList());
    }

    public AdminShopDetailsResponse getShopDetails(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found with id: " + shopId));

        AdminShopDetailsResponse details = new AdminShopDetailsResponse();
        details.setShop(shop);
        details.setSubscriptions(subscriptionRepository.findByShopId(shopId));
        details.setPayments(paymentRepository.findByShopId(shopId));
        details.setActivityLogs(activityLogRepository.findByShopIdOrderByTimestampDesc(shopId));
        details.setBusinessDocuments(businessDocumentRepository.findByShopId(shopId));
        details.setTotalProducts(productRepository.countByShopId(shopId));
        details.setTotalOrders(orderRepository.countByShopId(shopId));

        ZoneId zone = getOperationalZone();
        LocalDate today = LocalDate.now(zone);
        LocalDateTime startOfMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime startOfWeek = today.minusDays(today.getDayOfWeek().getValue() - 1).atStartOfDay();

        BigDecimal totalRev = orderRepository.sumRevenueByShopId(shopId);
        details.setTotalRevenue(totalRev != null ? totalRev : BigDecimal.ZERO);

        List<com.cakeplatform.api.modules.order.Order> recentOrders = orderRepository.findRecentRealizedOrders(shopId, startOfMonth);
        BigDecimal monthlyRev = BigDecimal.ZERO;
        BigDecimal weeklyRev = BigDecimal.ZERO;
        if (recentOrders != null) {
            for (com.cakeplatform.api.modules.order.Order o : recentOrders) {
                if (o.getTotalAmount() != null) {
                    monthlyRev = monthlyRev.add(o.getTotalAmount());
                    if (o.getCreatedAt() != null && !o.getCreatedAt().isBefore(startOfWeek)) {
                        weeklyRev = weeklyRev.add(o.getTotalAmount());
                    }
                }
            }
        }
        details.setMonthlyRevenue(monthlyRev);
        details.setWeeklyRevenue(weeklyRev);

        long completed = orderRepository.countByShopIdAndOrderStatus(shopId, "COMPLETED")
                + orderRepository.countByShopIdAndOrderStatus(shopId, "DELIVERED");
        details.setCompletedOrders(completed);
        details.setCancelledOrders(orderRepository.countByShopIdAndOrderStatus(shopId, "CANCELLED"));

        return details;
    }

    @Transactional
    public Shop updateShopStatus(Long shopId, String status, String reason, Long actorUserId) {
        if ("SUSPENDED".equals(status)) {
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("Suspension reason is mandatory and cannot be blank");
            }
            shopStatusManager.suspendShop(shopId, actorUserId, reason.trim());
        } else if ("ACTIVE".equals(status)) {
            // Admin forcefully re-activating a shop
            shopStatusManager.activateShop(shopId, actorUserId);
        } else if ("INACTIVE".equals(status)) {
            shopStatusManager.markShopInactive(shopId, actorUserId);
        }
        if (storefrontCacheService != null) {
            storefrontCacheService.evictShopDetails(shopId);
        }
        return shopRepository.findById(shopId).orElseThrow();
    }

    @Transactional
    public Shop updateShopStatus(Long shopId, String status, Long actorUserId) {
        if ("SUSPENDED".equals(status)) {
            shopStatusManager.suspendShop(shopId, actorUserId);
            return shopRepository.findById(shopId).orElseThrow();
        }
        return updateShopStatus(shopId, status, null, actorUserId);
    }

    @Transactional
    public Shop updateShopStatus(Long shopId, String status) {
        return updateShopStatus(shopId, status, null, null);
    }

    @Transactional
    public Shop reviewShopVerification(Long shopId, String action, String reason, Long actorUserId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found with id: " + shopId));

        if (action == null || (!action.equalsIgnoreCase("APPROVE") && !action.equalsIgnoreCase("REJECT"))) {
            throw new IllegalArgumentException("Invalid verification action: " + action + ". Must be APPROVE or REJECT.");
        }

        List<BusinessDocument> docs = businessDocumentRepository.findByShopId(shopId);

        if (action.equalsIgnoreCase("APPROVE")) {
            shop.setVerificationStatus(VerificationStatus.VERIFIED);
            
            // Idempotent safety reconciliation: if shop was still PENDING despite an active subscription, activate it
            if (shop.getStatus() == ShopStatus.PENDING && subscriptionRepository != null) {
                subscriptionRepository.findFirstByShopIdAndStatusOrderByCreatedAtDesc(
                        shopId, com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE)
                        .ifPresent(sub -> {
                            if (sub.getExpiryDate() == null || sub.getExpiryDate().isAfter(java.time.LocalDateTime.now())) {
                                shop.setStatus(ShopStatus.ACTIVE);
                            }
                        });
            }

            shopRepository.save(shop);

            for (BusinessDocument doc : docs) {
                doc.setStatus(VerificationStatus.VERIFIED);
                businessDocumentRepository.save(doc);
            }

            activityLogger.logActivity(
                    actorUserId,
                    shopId,
                    "KYC_VERIFIED",
                    "SHOP",
                    shopId,
                    "Bakery KYC verified by admin"
            );

            if (shop.getOwner() != null) {
                notificationService.createNotification(
                        shop.getOwner(),
                        NotificationType.DOCUMENT_VERIFICATION,
                        "KYC Verification Approved",
                        "Congratulations! Your bakery verification has been approved. Your storefront is now verified on CakeStore.",
                        shop.getId().toString(),
                        false
                );
            }
        } else {
            // REJECT
            if (reason == null || reason.trim().isEmpty()) {
                throw new IllegalArgumentException("Rejection reason is mandatory and cannot be blank");
            }
            String trimmedReason = reason.trim();

            shop.setVerificationStatus(VerificationStatus.REJECTED);
            shopRepository.save(shop);

            for (BusinessDocument doc : docs) {
                doc.setStatus(VerificationStatus.REJECTED);
                businessDocumentRepository.save(doc);
            }

            activityLogger.logActivity(
                    actorUserId,
                    shopId,
                    "KYC_REJECTED",
                    "SHOP",
                    shopId,
                    "Rejection reason: " + trimmedReason
            );

            if (shop.getOwner() != null) {
                notificationService.createNotification(
                        shop.getOwner(),
                        NotificationType.DOCUMENT_VERIFICATION,
                        "KYC Verification Action Required",
                        "Your bakery KYC verification was rejected. Reason: " + trimmedReason + ". Please upload updated documents in your compliance settings.",
                        shop.getId().toString(),
                        false
                );
            }
        }

        if (storefrontCacheService != null) {
            storefrontCacheService.evictShopDetails(shopId);
        }

        return shop;
    }
}
