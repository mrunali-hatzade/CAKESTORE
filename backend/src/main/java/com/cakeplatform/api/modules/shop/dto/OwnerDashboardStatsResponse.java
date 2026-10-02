package com.cakeplatform.api.modules.shop.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class OwnerDashboardStatsResponse {
    private long totalProducts;
    private long activeProducts;
    private long totalOrders;
    private long pendingOrders;
    private BigDecimal totalRevenue;
    private String shopStatus;
    private String subscriptionStatus;
    
    // Server authoritative operational metrics
    private BigDecimal todayRevenue;
    private long todayDeliveries;
    private long pendingConfirmationOrders;
    private long pendingCodOrders;
    private BigDecimal pendingCodAmount;
    private long unscheduledTodayDeliveries;
    private long pendingCustomEnquiries;
    private long totalActionItems;
}
