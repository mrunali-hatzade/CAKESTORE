package com.cakeplatform.api;

import com.cakeplatform.api.modules.shop.dto.OwnerDashboardStatsResponse;
import com.cakeplatform.api.modules.shop.service.OwnerDashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@org.springframework.test.context.ActiveProfiles("test")
public class OwnerDashboardServiceDebug {

    @Autowired
    private OwnerDashboardService ownerDashboardService;

    @Test
    public void testStats() {
        OwnerDashboardStatsResponse stats = ownerDashboardService.getDashboardStats(9L);
        System.out.println("DEBUG_STATS: totalProducts=" + stats.getTotalProducts() + 
            ", activeProducts=" + stats.getActiveProducts());
    }
}
