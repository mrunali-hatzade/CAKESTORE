package com.cakeplatform.api.modules.interaction.controller;

import com.cakeplatform.api.modules.interaction.*;
import com.cakeplatform.api.modules.interaction.dto.ConvertToOrderRequest;
import com.cakeplatform.api.modules.interaction.dto.ConvertToOrderResponse;
import com.cakeplatform.api.modules.interaction.dto.ReplyRequest;
import com.cakeplatform.api.modules.interaction.service.OwnerInteractionService;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerInteractionController {

    private final OwnerInteractionService ownerInteractionService;

    // --- Feedback ---
    @GetMapping("/feedback")
    public ResponseEntity<org.springframework.data.domain.Page<Feedback>> getMyFeedback(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String search) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(ownerInteractionService.getMyFeedback(userDetails.getId(), rating, search, pageable));
    }

    @PostMapping("/feedback/{id}/reply")
    public ResponseEntity<Feedback> replyToFeedback(
            @PathVariable Long id,
            @Valid @RequestBody ReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.replyToFeedback(userDetails.getId(), id, request));
    }

    @DeleteMapping("/feedback/{id}")
    public ResponseEntity<?> deleteFeedback(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ownerInteractionService.deleteFeedback(userDetails.getId(), id, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("message", "Feedback deleted successfully"));
    }

    @PatchMapping("/feedback/{id}/moderation")
    public ResponseEntity<Feedback> moderateFeedback(
            @PathVariable Long id,
            @RequestParam boolean isApproved,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.toggleFeedbackApproval(userDetails.getId(), id, isApproved));
    }

    // --- Enquiries ---
    @GetMapping("/enquiries")
    public ResponseEntity<org.springframework.data.domain.Page<Enquiry>> getMyEnquiries(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(ownerInteractionService.getMyEnquiries(userDetails.getId(), status, type, search, pageable));
    }

    @PostMapping("/enquiries/{id}/reply")
    public ResponseEntity<Enquiry> replyToEnquiry(
            @PathVariable Long id,
            @Valid @RequestBody ReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.replyToEnquiry(userDetails.getId(), id, request));
    }

    @PatchMapping("/enquiries/{id}/status")
    public ResponseEntity<Enquiry> updateEnquiryStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.updateEnquiryStatus(userDetails.getId(), id, status));
    }

    @DeleteMapping("/enquiries/{id}")
    public ResponseEntity<?> deleteEnquiry(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ownerInteractionService.deleteEnquiry(userDetails.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Enquiry deleted successfully"));
    }

    // --- Custom Cake Requests ---
    @GetMapping("/custom-cakes")
    public ResponseEntity<List<CustomCakeRequest>> getMyCustomCakeRequests(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.getMyCustomCakeRequests(userDetails.getId()));
    }

    @PostMapping("/custom-cakes/{id}/respond")
    public ResponseEntity<CustomCakeRequest> respondToCustomCakeRequest(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestBody(required = false) ReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.updateCustomCakeRequestStatus(userDetails.getId(), id, status, request));
    }

    @PostMapping("/custom-cakes/{id}/convert-to-order")
    public ResponseEntity<ConvertToOrderResponse> convertCustomCakeToOrder(
            @PathVariable Long id,
            @RequestBody(required = false) ConvertToOrderRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.convertToOrder(userDetails.getId(), id, request));
    }
}
