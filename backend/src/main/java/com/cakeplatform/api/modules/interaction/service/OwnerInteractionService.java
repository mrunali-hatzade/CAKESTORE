package com.cakeplatform.api.modules.interaction.service;

import com.cakeplatform.api.modules.interaction.*;
import com.cakeplatform.api.modules.interaction.dto.ReplyRequest;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OwnerInteractionService {

    private final FeedbackRepository feedbackRepository;
    private final EnquiryRepository enquiryRepository;
    private final CustomCakeRequestRepository customCakeRequestRepository;
    private final ShopAccessValidator shopAccessValidator;

    public List<Feedback> getMyFeedback(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return feedbackRepository.findByShopIdAndDeletedAtIsNullOrderByCreatedAtDesc(shop.getId());
    }

    @Transactional
    public Feedback replyToFeedback(Long ownerId, Long feedbackId, ReplyRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setOwnerReply(request.getReply());
        return feedbackRepository.save(feedback);
    }

    @Transactional
    public void deleteFeedback(Long ownerId, Long feedbackId, String deletedBy) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setDeletedAt(LocalDateTime.now());
        feedback.setDeletedBy(deletedBy);
        feedbackRepository.save(feedback);
    }

    @Transactional
    public Feedback toggleFeedbackApproval(Long ownerId, Long feedbackId, boolean isApproved) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Feedback feedback = feedbackRepository.findByIdAndShopId(feedbackId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Feedback not found"));
        
        feedback.setIsApproved(isApproved);
        return feedbackRepository.save(feedback);
    }

    public List<Enquiry> getMyEnquiries(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return enquiryRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
    }

    @Transactional
    public Enquiry replyToEnquiry(Long ownerId, Long enquiryId, ReplyRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Enquiry enquiry = enquiryRepository.findByIdAndShopId(enquiryId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Enquiry not found"));
        
        enquiry.setOwnerReply(request.getReply());
        enquiry.setStatus("REPLIED");
        return enquiryRepository.save(enquiry);
    }

    public List<CustomCakeRequest> getMyCustomCakeRequests(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return customCakeRequestRepository.findByShopIdOrderByCreatedAtDesc(shop.getId());
    }

    @Transactional
    public CustomCakeRequest updateCustomCakeRequestStatus(Long ownerId, Long requestId, String status, ReplyRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        CustomCakeRequest cakeReq = customCakeRequestRepository.findByIdAndShopId(requestId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Custom cake request not found"));
        
        cakeReq.setStatus(status);
        if (request != null && request.getReply() != null) {
            cakeReq.setOwnerResponse(request.getReply());
        }
        return customCakeRequestRepository.save(cakeReq);
    }
}
