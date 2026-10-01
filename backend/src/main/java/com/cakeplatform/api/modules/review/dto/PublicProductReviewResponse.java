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
public class PublicProductReviewResponse {
    private Long id;
    private String customerDisplayName;
    private Integer rating;
    private String reviewText;
    private Boolean isVerifiedPurchase;
    private String ownerReply;
    private LocalDateTime ownerRepliedAt;
    private String cakeImageUrl;
    private String cakeVideoUrl;
    private LocalDateTime createdAt;
    private String source;
    private String editToken;
}
