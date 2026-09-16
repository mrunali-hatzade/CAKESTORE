package com.cakeplatform.api.modules.subscription.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import com.cakeplatform.api.modules.subscription.SubscriptionPlan;

@Data
@Builder
public class SubscriptionPlanResponse {
    private Long planId;
    private String name;
    private String description;
    private BigDecimal price;
    private String currency;
    private String billingCycle;
    private Integer durationDays;
    private String features;

    public static SubscriptionPlanResponse fromEntity(SubscriptionPlan plan) {
        return SubscriptionPlanResponse.builder()
                .planId(plan.getId())
                .name(plan.getName())
                .description(plan.getDescription())
                .price(plan.getPrice())
                .currency(plan.getCurrency())
                .billingCycle(plan.getBillingCycle())
                .durationDays(plan.getDurationDays())
                .features(plan.getFeatures())
                .build();
    }
}
