package com.cakeplatform.api.modules.shop.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GalleryItemRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String caption;

    @NotBlank(message = "Image URL is required")
    private String imageUrl;

    private String categoryName;

    private Integer displayOrder;

    @JsonProperty("isActive")
    private Boolean isActive;
}
