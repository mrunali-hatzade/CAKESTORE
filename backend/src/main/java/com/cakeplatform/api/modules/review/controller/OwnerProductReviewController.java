package com.cakeplatform.api.modules.review.controller;

import com.cakeplatform.api.modules.review.dto.OwnerProductReviewResponse;
import com.cakeplatform.api.modules.review.dto.OwnerReviewReplyRequest;
import com.cakeplatform.api.modules.review.service.ProductReviewService;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/owner/product-reviews")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerProductReviewController {

    private final ProductReviewService productReviewService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<OwnerProductReviewResponse>> getMyProductReviews(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) String search) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(productReviewService.getOwnerProductReviews(userDetails.getId(), rating, search, pageable));
    }

    @PostMapping("/{reviewId}/reply")
    public ResponseEntity<OwnerProductReviewResponse> replyToProductReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody OwnerReviewReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(productReviewService.replyToProductReview(userDetails.getId(), reviewId, request));
    }
}
