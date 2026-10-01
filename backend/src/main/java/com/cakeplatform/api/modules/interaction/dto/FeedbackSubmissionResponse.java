package com.cakeplatform.api.modules.interaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackSubmissionResponse {
    private Long id;
    private String customerDisplayName;
    private Integer rating;
    private String comment;
    private String orderReference;
    private String productName;
    private String recommendationText;
    private String cakeImageUrl;
    private String cakeVideoUrl;
    private String editToken;
    private LocalDateTime createdAt;
    private String message;
}
