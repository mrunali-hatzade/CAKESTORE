package com.cakeplatform.api.modules.review.controller;

import com.cakeplatform.api.modules.review.dto.OrderItemEligibilityResponse;
import com.cakeplatform.api.modules.review.dto.ProductReviewsSummaryResponse;
import com.cakeplatform.api.modules.review.dto.PublicProductReviewResponse;
import com.cakeplatform.api.modules.review.dto.SubmitProductReviewRequest;
import com.cakeplatform.api.modules.review.service.ProductReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/storefront/shops/{shopId}")
@RequiredArgsConstructor
public class CustomerProductReviewController {

    private final ProductReviewService productReviewService;

    @GetMapping("/products/{productId}/reviews")
    public ResponseEntity<ProductReviewsSummaryResponse> getProductReviews(
            @PathVariable Long shopId,
            @PathVariable Long productId) {
        return ResponseEntity.ok(productReviewService.getProductReviewsSummary(shopId, productId));
    }

    @PostMapping("/products/{productId}/reviews")
    public ResponseEntity<PublicProductReviewResponse> submitProductReview(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @Valid @RequestBody SubmitProductReviewRequest request) {
        return ResponseEntity.ok(productReviewService.submitReview(shopId, productId, request));
    }

    @GetMapping("/reviews/eligibility")
    public ResponseEntity<List<OrderItemEligibilityResponse>> checkEligibility(
            @PathVariable Long shopId,
            @RequestParam String orderNumber,
            @RequestParam(required = false, defaultValue = "") String phone) {
        return ResponseEntity.ok(productReviewService.checkOrderEligibility(shopId, orderNumber, phone));
    }

    @PutMapping("/products/{productId}/reviews/{reviewId}")
    public ResponseEntity<PublicProductReviewResponse> updateProductReview(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestHeader(value = "X-Review-Token", required = false) String tokenHeader,
            @RequestParam(value = "token", required = false) String tokenParam,
            @Valid @RequestBody SubmitProductReviewRequest request) {
        String token = (tokenHeader != null && !tokenHeader.isBlank()) ? tokenHeader : tokenParam;
        return ResponseEntity.ok(productReviewService.updateReview(shopId, productId, reviewId, request, token));
    }

    @DeleteMapping("/products/{productId}/reviews/{reviewId}")
    public ResponseEntity<java.util.Map<String, String>> deleteProductReview(
            @PathVariable Long shopId,
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestParam(required = false, defaultValue = "") String orderNumber,
            @RequestParam(required = false, defaultValue = "") String phone,
            @RequestHeader(value = "X-Review-Token", required = false) String tokenHeader,
            @RequestParam(value = "token", required = false) String tokenParam) {
        String token = (tokenHeader != null && !tokenHeader.isBlank()) ? tokenHeader : tokenParam;
        productReviewService.deleteReview(shopId, productId, reviewId, orderNumber, phone, token);
        return ResponseEntity.ok(java.util.Map.of("message", "Review deleted successfully"));
    }
}
