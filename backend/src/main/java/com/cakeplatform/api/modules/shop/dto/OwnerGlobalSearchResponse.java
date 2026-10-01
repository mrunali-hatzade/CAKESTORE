package com.cakeplatform.api.modules.shop.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerGlobalSearchResponse {

    @Builder.Default
    private List<OrderSearchResult> orders = new ArrayList<>();

    @Builder.Default
    private List<ProductSearchResult> products = new ArrayList<>();

    @Builder.Default
    private List<CustomerSearchResult> customers = new ArrayList<>();

    @Builder.Default
    private List<CustomCakeSearchResult> customCakes = new ArrayList<>();

    @Builder.Default
    private List<EnquirySearchResult> enquiries = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderSearchResult {
        private Long id;
        private String orderNumber;
        private String customerName;
        private String customerPhone;
        private BigDecimal totalAmount;
        private String orderStatus;
        private String paymentStatus;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductSearchResult {
        private Long id;
        private String name;
        private BigDecimal price;
        private String categoryName;
        private String imageUrl;
        private String status;
        private Boolean availability;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerSearchResult {
        private String name;
        private String email;
        private String mobile;
        private Long totalOrders;
        private BigDecimal totalSpent;
        private LocalDateTime lastOrderDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomCakeSearchResult {
        private Long id;
        private String customerName;
        private String occasion;
        private String flavour;
        private BigDecimal budget;
        private String status;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EnquirySearchResult {
        private Long id;
        private String customerName;
        private String enquiryType;
        private String messageSnippet;
        private String status;
        private LocalDateTime createdAt;
    }
}
