package com.cakeplatform.api.modules.interaction.controller;

import com.cakeplatform.api.modules.interaction.*;
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
@PreAuthorize("hasRole('SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerInteractionController {

    private final OwnerInteractionService ownerInteractionService;

    // --- Feedback ---
    @GetMapping("/feedback")
    public ResponseEntity<List<Feedback>> getMyFeedback(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.getMyFeedback(userDetails.getId()));
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
    public ResponseEntity<List<Enquiry>> getMyEnquiries(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.getMyEnquiries(userDetails.getId()));
    }

    @PostMapping("/enquiries/{id}/reply")
    public ResponseEntity<Enquiry> replyToEnquiry(
            @PathVariable Long id,
            @Valid @RequestBody ReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerInteractionService.replyToEnquiry(userDetails.getId(), id, request));
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
}
