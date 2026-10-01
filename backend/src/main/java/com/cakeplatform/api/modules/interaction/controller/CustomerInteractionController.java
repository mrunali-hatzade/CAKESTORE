package com.cakeplatform.api.modules.interaction.controller;

import com.cakeplatform.api.modules.interaction.*;
import com.cakeplatform.api.modules.interaction.dto.*;
import com.cakeplatform.api.modules.interaction.service.InteractionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/storefront/shops/{shopId}")
@RequiredArgsConstructor
public class CustomerInteractionController {

    private final InteractionService interactionService;
    private final FeedbackRepository feedbackRepository;

    @GetMapping("/feedback")
    public ResponseEntity<List<Feedback>> getShopFeedback(@PathVariable Long shopId) {
        // Return only approved non-deleted feedback for storefront
        return ResponseEntity.ok(feedbackRepository.findByShopIdAndIsApprovedTrueAndDeletedAtIsNullOrderByCreatedAtDesc(shopId));
    }

    @PostMapping("/feedback")
    public ResponseEntity<FeedbackSubmissionResponse> submitFeedback(
            @PathVariable Long shopId,
            @Valid @RequestBody FeedbackRequest request) {
        Feedback saved = interactionService.submitFeedback(shopId, request);
        return ResponseEntity.ok(FeedbackSubmissionResponse.builder()
                .id(saved.getId())
                .customerDisplayName(saved.getCustomerDisplayName())
                .rating(saved.getRating())
                .comment(saved.getComment())
                .orderReference(saved.getOrderReference())
                .productName(saved.getProductName())
                .recommendationText(saved.getRecommendationText())
                .cakeImageUrl(saved.getCakeImageUrl())
                .cakeVideoUrl(saved.getCakeVideoUrl())
                .editToken(saved.getEditToken())
                .createdAt(saved.getCreatedAt())
                .message("Feedback submitted successfully")
                .build());
    }

    @PutMapping("/feedback/{feedbackId}")
    public ResponseEntity<FeedbackSubmissionResponse> updateFeedback(
            @PathVariable Long shopId,
            @PathVariable Long feedbackId,
            @RequestHeader(value = "X-Review-Token", required = false) String tokenHeader,
            @RequestParam(value = "token", required = false) String tokenParam,
            @Valid @RequestBody FeedbackRequest request) {
        String token = (tokenHeader != null && !tokenHeader.isBlank()) ? tokenHeader : tokenParam;
        Feedback updated = interactionService.updateCustomerFeedback(shopId, feedbackId, request, token);
        return ResponseEntity.ok(FeedbackSubmissionResponse.builder()
                .id(updated.getId())
                .customerDisplayName(updated.getCustomerDisplayName())
                .rating(updated.getRating())
                .comment(updated.getComment())
                .orderReference(updated.getOrderReference())
                .productName(updated.getProductName())
                .recommendationText(updated.getRecommendationText())
                .cakeImageUrl(updated.getCakeImageUrl())
                .cakeVideoUrl(updated.getCakeVideoUrl())
                .editToken(updated.getEditToken())
                .createdAt(updated.getCreatedAt())
                .message("Feedback updated successfully")
                .build());
    }

    @DeleteMapping("/feedback/{feedbackId}")
    public ResponseEntity<java.util.Map<String, String>> deleteFeedback(
            @PathVariable Long shopId,
            @PathVariable Long feedbackId,
            @RequestHeader(value = "X-Review-Token", required = false) String tokenHeader,
            @RequestHeader(value = "X-Customer-Name", required = false) String customerNameHeader,
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestParam(value = "customerName", required = false) String customerNameParam) {
        String token = (tokenHeader != null && !tokenHeader.isBlank()) ? tokenHeader : tokenParam;
        String customerName = (customerNameHeader != null && !customerNameHeader.isBlank()) ? customerNameHeader : customerNameParam;
        interactionService.deleteCustomerFeedback(shopId, feedbackId, token, customerName);
        return ResponseEntity.ok(java.util.Map.of("message", "Feedback deleted successfully"));
    }

    @PostMapping("/enquiries")
    public ResponseEntity<Enquiry> submitEnquiry(
            @PathVariable Long shopId,
            @Valid @RequestBody EnquiryRequest request) {
        return ResponseEntity.ok(interactionService.submitEnquiry(shopId, request));
    }

    @PostMapping("/custom-cakes")
    public ResponseEntity<CustomCakeRequest> submitCustomCakeRequest(
            @PathVariable Long shopId,
            @Valid @RequestBody CustomCakeDto request) {
        return ResponseEntity.ok(interactionService.submitCustomCakeRequest(shopId, request));
    }
}
