package com.cakeplatform.api.modules.shop.dto;

import com.cakeplatform.api.modules.shop.ShopGalleryItem;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GalleryItemResponse {

    private Long id;
    private Long shopId;
    private String title;
    private String caption;
    private String imageUrl;
    private String categoryName;
    private Integer displayOrder;

    @JsonProperty("isActive")
    private Boolean isActive;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static GalleryItemResponse fromEntity(ShopGalleryItem item) {
        if (item == null) return null;
        return GalleryItemResponse.builder()
                .id(item.getId())
                .shopId(item.getShop() != null ? item.getShop().getId() : null)
                .title(item.getTitle())
                .caption(item.getCaption())
                .imageUrl(item.getImageUrl())
                .categoryName(item.getCategoryName())
                .displayOrder(item.getDisplayOrder())
                .isActive(item.getIsActive())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
