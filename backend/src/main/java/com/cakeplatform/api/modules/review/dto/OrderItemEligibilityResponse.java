package com.cakeplatform.api.modules.review.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemEligibilityResponse {
    private Long orderItemId;
    private Long productId;
    private String productName;
    private String variantName;
    private Boolean isDelivered;
    private Boolean hasReviewed;
    private Boolean isEligible;
    private Long existingReviewId;
    private Integer existingRating;
    private String existingReviewText;
    private String existingCakeImageUrl;
    private String existingCakeVideoUrl;
}
