package com.cakeplatform.api.modules.admin.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DashboardStatsResponse {
    // 1. Users
    private long totalAdmins;
    private long totalShopOwners;

    // 2. Bakeries
    private long totalRegisteredBakeries;
    private long activeBakeries;
    private long verifiedBakeries;
    private long suspendedBakeries;
    private long inactiveBakeries;
    private long pendingBakeries;
    
    // 3. Subscriptions
    private long activeSubscribedBakeries;
    private long expiredSubscribedBakeries;
    private long pendingPaymentBakeries;

    // Financials & Others
    private long todayRegistrations;
    private long todayPayments;
    private BigDecimal monthlyPlatformRevenue;
    private BigDecimal totalPlatformRevenue;
    private BigDecimal monthlyGmv;
    private BigDecimal totalGmv;
    
    private LocalDate startDate;
    private LocalDate endDate;
}
