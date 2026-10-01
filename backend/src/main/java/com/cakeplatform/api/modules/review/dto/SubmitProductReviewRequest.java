package com.cakeplatform.api.modules.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SubmitProductReviewRequest {
    @NotBlank(message = "Order number is required")
    private String orderNumber;

    @NotBlank(message = "Customer phone number is required for verification")
    private String customerPhone;

    @NotNull(message = "Order item ID is required")
    private Long orderItemId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    private Integer rating;

    @Size(max = 1000, message = "Review text cannot exceed 1000 characters")
    private String reviewText;

    private String cakeImageUrl;

    private String cakeVideoUrl;
}
