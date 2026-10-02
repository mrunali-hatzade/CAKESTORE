package com.cakeplatform.api.modules.communication;

import com.cakeplatform.api.modules.communication.dto.CreatePlatformFeedbackRequest;
import com.cakeplatform.api.modules.notification.AdminNotificationCategory;
import com.cakeplatform.api.modules.notification.AdminNotificationPriority;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.modules.notification.AdminNotificationType;
import com.cakeplatform.api.modules.notification.EmailService;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PlatformFeedbackService {

    private final PlatformFeedbackRepository feedbackRepository;
    private final ContactEnquiryRepository enquiryRepository;
    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final AdminNotificationService adminNotificationService;
    private final EmailService emailService;

    /**
     * Submit platform feedback from an authenticated shop owner.
     * Guaranteed transactional database save + persistent admin notification + isolated transactional email.
     */
    @Transactional
    public PlatformFeedback submitFeedback(Long ownerId, CreatePlatformFeedbackRequest request) {
        log.info("Processing platform feedback submission from owner ID: {}", ownerId);

        // 1. Authenticated User & Role Verification
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + ownerId));

        if (owner.getRole() != UserRole.SHOP_OWNER) {
            log.warn("Access denied: Non-owner role ({}) attempted to submit owner platform feedback", owner.getRole());
            throw new AccessDeniedException("Only shop owners can submit platform feedback");
        }

        // 2. Resolve Bakery / Shop
        Shop shop = shopRepository.findByOwnerId(ownerId).stream().findFirst().orElse(null);

        // 3. Parse Category
        PlatformFeedbackCategory category = PlatformFeedbackCategory.GENERAL;
        if (request.getCategory() != null && !request.getCategory().trim().isEmpty()) {
            try {
                category = PlatformFeedbackCategory.valueOf(request.getCategory().trim().toUpperCase());
            } catch (IllegalArgumentException ex) {
                log.debug("Unknown category '{}', defaulting to GENERAL", request.getCategory());
            }
        }

        // 4. Save Platform Feedback to PostgreSQL
        PlatformFeedback feedback = PlatformFeedback.builder()
                .owner(owner)
                .shop(shop)
                .rating(request.getRating())
                .category(category)
                .message(request.getMessage().trim())
                .isRead(false)
                .build();

        PlatformFeedback saved = feedbackRepository.save(feedback);
        log.info("Saved platform_feedback record ID: {}", saved.getId());

        // 5. Generate Real ADMIN_NOTIFICATION (type = OWNER_FEEDBACK)
        String shopName = shop != null ? shop.getBusinessName() : "Direct Owner (" + owner.getFullName() + ")";
        String summaryMessage = String.format("%s gave %d/5 stars (%s): \"%s\"",
                shopName,
                saved.getRating(),
                saved.getCategory(),
                truncate(saved.getMessage(), 120)
        );

        adminNotificationService.dispatchAdminNotification(
                AdminNotificationType.OWNER_FEEDBACK,
                "New Owner Feedback: " + shopName,
                summaryMessage,
                saved.getRating() <= 2 ? AdminNotificationPriority.HIGH : AdminNotificationPriority.NORMAL,
                AdminNotificationCategory.COMMUNICATION,
                saved.getId().toString(),
                "PLATFORM_FEEDBACK",
                "/admin/feedback"
        );

        // 6. Asynchronously dispatch transactional email (Safe error isolation: never fails DB transaction)
        try {
            emailService.sendOwnerFeedbackEmail(saved, shop != null ? shop.getBusinessName() : null, owner.getEmail());
        } catch (Exception ex) {
            log.error("Email notification dispatch error for feedback ID {}: {}", saved.getId(), ex.getMessage());
        }

        return saved;
    }

    /**
     * Retrieve platform feedback with optional read/unread filter and text search.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<PlatformFeedback> getFeedback(Boolean isRead, String search, org.springframework.data.domain.Pageable pageable) {
        return feedbackRepository.findWithFilters(isRead, search, pageable);
    }

    /**
     * Mark platform feedback as read.
     */
    @Transactional
    public void markAsRead(Long id) {
        PlatformFeedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found with ID: " + id));

        feedback.setIsRead(true);
        feedbackRepository.save(feedback);
        log.info("Marked platform feedback ID {} as read", id);
    }

    /**
     * Communication summary for Super Admin header/overview.
     */
    @Transactional(readOnly = true)
    public CommunicationSummaryResponse getSummary() {
        long unreadFeedback = feedbackRepository.countByIsReadFalse();
        long unreadEnquiries = enquiryRepository.countByIsReadFalse();
        return new CommunicationSummaryResponse(unreadFeedback, unreadEnquiries);
    }

    private String truncate(String str, int maxLen) {
        if (str == null) return "";
        return str.length() <= maxLen ? str : str.substring(0, maxLen) + "...";
    }

    public record CommunicationSummaryResponse(long unreadFeedbackCount, long unreadEnquiriesCount) {}
}
