package com.cakeplatform.api.modules.admin.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class AnalyticsChartResponse {
    private List<RevenueDataPoint> saasRevenue;
    private List<RevenueDataPoint> networkGmv;
}
