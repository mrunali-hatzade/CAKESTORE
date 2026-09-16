package com.cakeplatform.api.modules.user.service;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.communication.PlatformFeedbackRepository;
import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.interaction.EnquiryRepository;
import com.cakeplatform.api.modules.interaction.FeedbackRepository;
import com.cakeplatform.api.modules.media.StorageService;
import com.cakeplatform.api.modules.notification.NotificationRepository;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductCategoryRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.BusinessDocument;
import com.cakeplatform.api.modules.shop.BusinessDocumentRepository;
import com.cakeplatform.api.modules.shop.CouponRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.shop.ShopPayoutDetailsRepository;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.dto.DeleteAccountRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class OwnerAccountDeletionService {

    private static final Set<String> TERMINAL_ORDER_STATUSES = Set.of("COMPLETED", "DELIVERED", "CANCELLED");
    public static final String REQUIRED_CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final OrderRepository orderRepository;
    private final ShopDeliverySlotRepository deliverySlotRepository;
    private final CouponRepository couponRepository;
    private final BusinessDocumentRepository businessDocumentRepository;
    private final ShopPayoutDetailsRepository payoutDetailsRepository;
    private final FeedbackRepository feedbackRepository;
    private final EnquiryRepository enquiryRepository;
    private final CustomCakeRequestRepository customCakeRequestRepository;
    private final PlatformFeedbackRepository platformFeedbackRepository;
    private final NotificationRepository notificationRepository;
    private final PaymentRepository paymentRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final StorageService storageService;
    private final ActivityLoggerService activityLogger;
    private final PasswordEncoder passwordEncoder;

    /**
     * Permanently deletes a SHOP_OWNER account and all owned/dependent resources.
     * Transactional: If any step fails, entire operation is rolled back.
     */
    @Transactional
    public void deleteOwnerAccount(Long ownerId, DeleteAccountRequest request) {
        log.info("Initiating permanent account deletion for owner ID: {}", ownerId);

        // 1. Resolve User
        User user = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + ownerId));

        // 2. Role Protection: Admin cannot be deleted via owner endpoint
        if (user.getRole() == UserRole.ADMIN) {
            log.warn("Security violation: Attempt to delete ADMIN account (ID: {}) via owner deletion service", ownerId);
            throw new AccessDeniedException("Admin accounts cannot be deleted through this endpoint");
        }

        if (user.getRole() != UserRole.SHOP_OWNER) {
            log.warn("Security violation: Non-owner role ({}) attempted owner account deletion (ID: {})", user.getRole(), ownerId);
            throw new AccessDeniedException("Only shop owners can delete bakery accounts");
        }

        // 3. Password Verification
        if (request == null || request.getPassword() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Failed deletion attempt for owner ID {}: Invalid password", ownerId);
            throw new IllegalArgumentException("Invalid account password");
        }

        // 4. Confirmation Text Verification
        if (request.getConfirmationText() == null ||
                !REQUIRED_CONFIRMATION_PHRASE.equals(request.getConfirmationText().trim())) {
            log.warn("Failed deletion attempt for owner ID {}: Mismatched confirmation phrase", ownerId);
            throw new IllegalArgumentException("Confirmation phrase must be exactly '" + REQUIRED_CONFIRMATION_PHRASE + "'");
        }

        // 5. Resolve Owned Shop(s)
        List<Shop> shops = shopRepository.findByOwnerId(ownerId);

        // 6. Active Orders Guardrail: Check all owned shops
        for (Shop shop : shops) {
            List<Order> orders = orderRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
            boolean hasActiveOrders = orders.stream().anyMatch(order -> {
                String status = order.getOrderStatus() != null ? order.getOrderStatus().trim().toUpperCase() : "";
                return !TERMINAL_ORDER_STATUSES.contains(status);
            });

            if (hasActiveOrders) {
                log.warn("Account deletion blocked for owner ID {}: Shop ID {} has active orders", ownerId, shop.getId());
                throw new IllegalStateException("Account cannot be deleted while there are active customer orders. Please fulfill or cancel existing orders first.");
            }
        }

        // 7. Deletion Sequence for each Shop
        for (Shop shop : shops) {
            Long shopId = shop.getId();
            log.info("Deleting dependent resources for Shop ID: {} (Owner: {})", shopId, ownerId);

            // A. Physical Media Cleanup (Best-effort safe file removal)
            storageService.deleteFileByUrl(shop.getLogoUrl());
            storageService.deleteFileByUrl(shop.getCoverImageUrl());

            List<Product> products = productRepository.findByShopId(shopId);
            for (Product product : products) {
                storageService.deleteFileByUrl(product.getImageUrl());
            }

            List<BusinessDocument> docs = businessDocumentRepository.findByShopId(shopId);
            for (BusinessDocument doc : docs) {
                storageService.deleteFileByUrl(doc.getFileUrl());
            }

            List<CustomCakeRequest> customRequests = customCakeRequestRepository.findByShopIdOrderByCreatedAtDesc(shopId);
            for (CustomCakeRequest cr : customRequests) {
                storageService.deleteFileByUrl(cr.getReferenceImageUrl());
            }

            // B. Customer Interaction records (Custom cake requests, Enquiries, Feedback)
            customCakeRequestRepository.deleteByShopId(shopId);
            enquiryRepository.deleteByShopId(shopId);
            feedbackRepository.deleteByShopId(shopId);
            platformFeedbackRepository.deleteByShopId(shopId);

            // C. Business Documents and Payout coordinates
            businessDocumentRepository.deleteByShopId(shopId);
            payoutDetailsRepository.deleteByShopId(shopId);

            // D. Orders and Delivery Slots
            // Break foreign key constraint from orders to shop_delivery_slots before deleting slots
            List<Order> orders = orderRepository.findByShopIdOrderByCreatedAtDesc(shopId);
            for (Order o : orders) {
                o.setDeliverySlot(null);
            }
            orderRepository.saveAll(orders);
            orderRepository.deleteAll(orders);

            deliverySlotRepository.deleteByShopId(shopId);

            // E. Coupons
            couponRepository.deleteByShopId(shopId);

            // F. Products, Variants & Addons, then Categories
            // Products reference ProductCategory with ON DELETE RESTRICT.
            // Deleting products first clears the restriction safely.
            productRepository.deleteAll(products);
            productCategoryRepository.deleteByShopId(shopId);

            // G. Payments and Subscriptions
            paymentRepository.deleteByShopId(shopId);
            subscriptionRepository.deleteByShopId(shopId);

            // H. Delete Shop entity
            shopRepository.delete(shop);
            log.info("Successfully deleted Shop ID: {}", shopId);
        }

        // 8. Delete Owner-specific Notifications & Platform Feedback
        notificationRepository.deleteByRecipientId(ownerId);
        platformFeedbackRepository.deleteByOwnerId(ownerId);

        // 9. Record minimal audit trail for platform compliance
        activityLogger.logActivity(
                null,
                null,
                "ACCOUNT_DELETED",
                "USER",
                ownerId,
                "Owner account " + user.getEmail() + " permanently deleted by owner."
        );

        // 10. Delete User entity
        userRepository.delete(user);
        log.info("Successfully permanently deleted owner User ID: {}", ownerId);
    }
}
