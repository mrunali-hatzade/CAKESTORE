package com.cakeplatform.api.modules.review.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerProductReviewResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private String orderNumber;
    private String customerName;
    private Integer rating;
    private String reviewText;
    private Boolean isVerifiedPurchase;
    private String ownerReply;
    private LocalDateTime ownerRepliedAt;
    private String cakeImageUrl;
    private String cakeVideoUrl;
    private LocalDateTime createdAt;
}
