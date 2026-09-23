package com.cakeplatform.api.modules.interaction.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FeedbackRequest {
    private String customerDisplayName;

    @NotNull
    @Min(1)
    @Max(5)
    private Integer rating;

    @NotBlank
    private String comment;

    private String orderReference;

    private String customerEmail;

    private Long productId;

    @jakarta.validation.constraints.Size(max = 255, message = "Product name cannot exceed 255 characters")
    private String productName;

    @jakarta.validation.constraints.Size(max = 2000, message = "Recommendation text cannot exceed 2000 characters")
    private String recommendationText;

    @jakarta.validation.constraints.Size(max = 1000, message = "Cake image URL cannot exceed 1000 characters")
    private String cakeImageUrl;

    @jakarta.validation.constraints.Size(max = 1000, message = "Cake video URL cannot exceed 1000 characters")
    private String cakeVideoUrl;
}
