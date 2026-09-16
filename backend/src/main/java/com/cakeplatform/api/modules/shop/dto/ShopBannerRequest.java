package com.cakeplatform.api.modules.shop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShopBannerRequest {
    @NotBlank
    private String imageUrl;
    private String title;
    private String subtitle;
    private String buttonText;
    private String buttonUrl;
    private Integer displayOrder = 0;
    private Boolean isActive = true;
}
