package com.cakeplatform.api.modules.admin.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class DashboardStatsResponse {
    private long totalShops;
    private long activeShops;
    private long suspendedShops;
    private long inactiveShops;
    private long pendingShops;
    private long totalUsers;
    private long todayRegistrations;
    private long activeSubscriptions;
    private long expiredSubscriptions;
    private long todayPayments;
    private BigDecimal monthlyPlatformRevenue;
    private BigDecimal totalPlatformRevenue;
    private BigDecimal monthlyGmv;
    private BigDecimal totalGmv;
}
