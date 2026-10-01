package com.cakeplatform.api.modules.interaction.service;

import com.cakeplatform.api.modules.interaction.*;
import com.cakeplatform.api.modules.interaction.dto.*;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class InteractionService {

    private final FeedbackRepository feedbackRepository;
    private final EnquiryRepository enquiryRepository;
    private final CustomCakeRequestRepository customCakeRequestRepository;
    private final CustomCakeRequestFieldValueRepository customCakeRequestFieldValueRepository;
    private final ShopRepository shopRepository;
    private final NotificationService notificationService;
    private final com.cakeplatform.api.modules.product.ProductRepository productRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.cakeplatform.api.modules.storefront.StorefrontCacheService storefrontCacheService;

    @org.springframework.beans.factory.annotation.Autowired
    public InteractionService(
            FeedbackRepository feedbackRepository,
            EnquiryRepository enquiryRepository,
            CustomCakeRequestRepository customCakeRequestRepository,
            CustomCakeRequestFieldValueRepository customCakeRequestFieldValueRepository,
            ShopRepository shopRepository,
            NotificationService notificationService,
            com.cakeplatform.api.modules.product.ProductRepository productRepository
    ) {
        this.feedbackRepository = feedbackRepository;
        this.enquiryRepository = enquiryRepository;
        this.customCakeRequestRepository = customCakeRequestRepository;
        this.customCakeRequestFieldValueRepository = customCakeRequestFieldValueRepository;
        this.shopRepository = shopRepository;
        this.notificationService = notificationService;
        this.productRepository = productRepository;
    }

    // Backward-compatible constructor for existing callers
    public InteractionService(
            FeedbackRepository feedbackRepository,
            EnquiryRepository enquiryRepository,
            CustomCakeRequestRepository customCakeRequestRepository,
            CustomCakeRequestFieldValueRepository customCakeRequestFieldValueRepository,
            ShopRepository shopRepository,
            NotificationService notificationService
    ) {
        this(feedbackRepository, enquiryRepository, customCakeRequestRepository, customCakeRequestFieldValueRepository, shopRepository, notificationService, null);
    }

    // Backward-compatible constructor for existing tests
    public InteractionService(
            FeedbackRepository feedbackRepository,
            EnquiryRepository enquiryRepository,
            CustomCakeRequestRepository customCakeRequestRepository,
            ShopRepository shopRepository,
            NotificationService notificationService
    ) {
        this(feedbackRepository, enquiryRepository, customCakeRequestRepository, null, shopRepository, notificationService, null);
    }

    private Shop getActiveShop(Long shopId) {
        Shop shop = shopRepository.findById(shopId)
                .orElseThrow(() -> new RuntimeException("Shop not found"));
        if (shop.getStatus() != ShopStatus.ACTIVE) {
            throw new RuntimeException("Shop is currently unavailable");
        }
        return shop;
    }

    @Transactional
    public Feedback submitFeedback(Long shopId, FeedbackRequest request) {
        Shop shop = getActiveShop(shopId);
        
        Feedback feedback = new Feedback();
        feedback.setShop(shop);
        feedback.setCustomerDisplayName(request.getCustomerDisplayName());
        feedback.setRating(request.getRating());
        feedback.setComment(request.getComment());
        feedback.setOrderReference(request.getOrderReference());
        feedback.setCustomerEmail(request.getCustomerEmail());
        feedback.setIsApproved(true);

        // Product association & validation
        if (request.getProductId() != null) {
            if (productRepository == null) {
                throw new IllegalStateException("Product repository is not configured");
            }
            com.cakeplatform.api.modules.product.Product product = productRepository.findById(request.getProductId())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found with ID: " + request.getProductId()));
            if (product.getShop() == null || !product.getShop().getId().equals(shop.getId())) {
                throw new IllegalArgumentException("Product does not belong to this bakery");
            }
            feedback.setProduct(product);
            // Derive authoritative product name from database
            feedback.setProductName(product.getName());
        } else if (request.getProductName() != null && !request.getProductName().isBlank()) {
            String pName = request.getProductName().trim();
            feedback.setProductName(pName);
            if (productRepository != null) {
                productRepository.findByShopId(shop.getId()).stream()
                        .filter(p -> p.getName() != null && p.getName().trim().equalsIgnoreCase(pName))
                        .findFirst()
                        .ifPresent(feedback::setProduct);
            }
        }

        if (request.getRecommendationText() != null && !request.getRecommendationText().isBlank()) {
            feedback.setRecommendationText(request.getRecommendationText().trim());
        }

        if (request.getCakeImageUrl() != null && !request.getCakeImageUrl().isBlank()) {
            feedback.setCakeImageUrl(request.getCakeImageUrl().trim());
        }

        if (request.getCakeVideoUrl() != null && !request.getCakeVideoUrl().isBlank()) {
            feedback.setCakeVideoUrl(request.getCakeVideoUrl().trim());
        }

        String editToken = java.util.UUID.randomUUID().toString();
        feedback.setEditToken(editToken);
        
        Feedback saved = feedbackRepository.save(feedback);

        notificationService.createNotification(
                shop.getOwner(),
                NotificationType.NEW_FEEDBACK,
                "New Feedback",
                "You have received a new " + request.getRating() + "-star rating.",
                saved.getId() != null ? saved.getId().toString() : "0",
                true
        );

        if (storefrontCacheService != null) {
            storefrontCacheService.evictShopDetails(shopId);
        }

        return saved;
    }

    @Transactional
    public Enquiry submitEnquiry(Long shopId, EnquiryRequest request) {
        Shop shop = getActiveShop(shopId);

        Enquiry enquiry = new Enquiry();
        enquiry.setShop(shop);
        enquiry.setCustomerName(request.getCustomerName());
        enquiry.setCustomerEmail(request.getCustomerEmail());
        if (request.getCustomerMobile() != null && !request.getCustomerMobile().isBlank()) {
            enquiry.setCustomerMobile(request.getCustomerMobile().trim());
        }
        enquiry.setEnquiryType(request.getEnquiryType());
        enquiry.setMessage(request.getMessage());
        
        Enquiry saved = enquiryRepository.save(enquiry);

        notificationService.createNotification(
                shop.getOwner(),
                NotificationType.NEW_ENQUIRY,
                "New Enquiry",
                "You have received a new " + request.getEnquiryType() + " enquiry from " + request.getCustomerName(),
                saved.getId() != null ? saved.getId().toString() : "0",
                true
        );

        return saved;
    }

    @Transactional
    public CustomCakeRequest submitCustomCakeRequest(Long shopId, CustomCakeDto request) {
        Shop shop = getActiveShop(shopId);

        CustomCakeRequest cakeRequest = new CustomCakeRequest();
        cakeRequest.setShop(shop);
        cakeRequest.setCustomerName(request.getCustomerName());
        cakeRequest.setCustomerEmail(request.getCustomerEmail());
        cakeRequest.setCustomerMobile(request.getCustomerMobile());
        cakeRequest.setOccasion(request.getOccasion());
        cakeRequest.setCakeType(request.getCakeType());
        cakeRequest.setFlavour(request.getFlavour());
        cakeRequest.setServings(request.getServings());
        cakeRequest.setDesignDescription(request.getDesignDescription());
        cakeRequest.setReferenceImageUrl(request.getReferenceImageUrl());
        cakeRequest.setBudget(request.getBudget());
        cakeRequest.setRequiredDate(request.getRequiredDate());
        cakeRequest.setDeliveryPreference(request.getDeliveryPreference());

        CustomCakeRequest saved = customCakeRequestRepository.save(cakeRequest);

        if (request.getDynamicFieldValues() != null && !request.getDynamicFieldValues().isEmpty()) {
            for (DynamicFieldValueDto valDto : request.getDynamicFieldValues()) {
                if (valDto != null && valDto.getFieldKey() != null) {
                    CustomCakeRequestFieldValue val = CustomCakeRequestFieldValue.builder()
                            .request(saved)
                            .fieldKey(valDto.getFieldKey())
                            .fieldLabel(valDto.getFieldLabel() != null ? valDto.getFieldLabel() : valDto.getFieldKey())
                            .fieldValue(valDto.getFieldValue())
                            .build();
                    customCakeRequestFieldValueRepository.save(val);
                }
            }
        }

        notificationService.createNotification(
                shop.getOwner(),
                NotificationType.CUSTOM_ORDER_REQUEST,
                "Custom Cake Request",
                "New custom cake request received from " + request.getCustomerName(),
                saved.getId() != null ? saved.getId().toString() : "0",
                true
        );

        return saved;
    }

    private void validateAuthorToken(Feedback feedback, String providedToken, FeedbackRequest request, String customerName) {
        String storedToken = feedback.getEditToken();
        // 1. If edit token matches, verified!
        if (storedToken != null && !storedToken.isBlank() && providedToken != null && !providedToken.isBlank()
                && storedToken.trim().equals(providedToken.trim())) {
            return;
        }

        // 2. Fallback to customer display name matching for author convenience / legacy entries
        String incomingName = request != null && request.getCustomerDisplayName() != null ? request.getCustomerDisplayName() : customerName;
        if (incomingName != null && !incomingName.isBlank() && feedback.getCustomerDisplayName() != null
                && feedback.getCustomerDisplayName().trim().equalsIgnoreCase(incomingName.trim())) {
            return;
        }

        // 3. Fallback to order reference
        if (request != null && request.getOrderReference() != null && !request.getOrderReference().isBlank()
                && feedback.getOrderReference() != null
                && feedback.getOrderReference().trim().equalsIgnoreCase(request.getOrderReference().trim())) {
            return;
        }

        // 4. If storedToken is null/blank, allowed
        if (storedToken == null || storedToken.isBlank()) {
            return;
        }

        throw new org.springframework.security.access.AccessDeniedException("Unauthorized: You do not have permission to edit or delete this review.");
    }

    @Transactional
    public Feedback updateCustomerFeedback(Long shopId, Long feedbackId, FeedbackRequest request) {
        return updateCustomerFeedback(shopId, feedbackId, request, null);
    }

    @Transactional
    public Feedback updateCustomerFeedback(Long shopId, Long feedbackId, FeedbackRequest request, String token) {
        Shop shop = getActiveShop(shopId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found"));

        if (feedback.getDeletedAt() != null) {
            throw new IllegalArgumentException("Feedback has been deleted");
        }

        validateAuthorToken(feedback, token, request, null);

        if (request.getRating() != null) {
            feedback.setRating(request.getRating());
        }
        if (request.getComment() != null) {
            feedback.setComment(request.getComment().trim());
        }
        if (request.getCustomerDisplayName() != null && !request.getCustomerDisplayName().isBlank()) {
            feedback.setCustomerDisplayName(request.getCustomerDisplayName().trim());
        }
        if (request.getRecommendationText() != null) {
            feedback.setRecommendationText(request.getRecommendationText().trim());
        }
        if (request.getCakeImageUrl() != null) {
            feedback.setCakeImageUrl(request.getCakeImageUrl().trim());
        }
        if (request.getCakeVideoUrl() != null) {
            feedback.setCakeVideoUrl(request.getCakeVideoUrl().trim());
        }

        Feedback updated = feedbackRepository.save(feedback);
        if (storefrontCacheService != null) {
            storefrontCacheService.evictShopDetails(shopId);
        }
        return updated;
    }

    @Transactional
    public void deleteCustomerFeedback(Long shopId, Long feedbackId) {
        deleteCustomerFeedback(shopId, feedbackId, null, null);
    }

    @Transactional
    public void deleteCustomerFeedback(Long shopId, Long feedbackId, String token) {
        deleteCustomerFeedback(shopId, feedbackId, token, null);
    }

    @Transactional
    public void deleteCustomerFeedback(Long shopId, Long feedbackId, String token, String customerName) {
        Shop shop = getActiveShop(shopId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Feedback not found"));

        validateAuthorToken(feedback, token, null, customerName);

        feedback.setDeletedAt(LocalDateTime.now());
        feedback.setDeletedBy("CUSTOMER");
        feedbackRepository.save(feedback);

        if (storefrontCacheService != null) {
            storefrontCacheService.evictShopDetails(shopId);
        }
    }
}
