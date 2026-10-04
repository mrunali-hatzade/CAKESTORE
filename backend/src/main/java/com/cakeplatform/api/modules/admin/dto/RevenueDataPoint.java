package com.cakeplatform.api.modules.admin.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RevenueDataPoint {
    private String month; // e.g. "Jan", "Feb"
    private String fullMonth; // e.g. "January 2026"
    private BigDecimal amount;
}
