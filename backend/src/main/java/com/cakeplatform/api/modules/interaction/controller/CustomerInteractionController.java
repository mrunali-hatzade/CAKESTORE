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
    public ResponseEntity<Feedback> submitFeedback(
            @PathVariable Long shopId,
            @Valid @RequestBody FeedbackRequest request) {
        return ResponseEntity.ok(interactionService.submitFeedback(shopId, request));
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
