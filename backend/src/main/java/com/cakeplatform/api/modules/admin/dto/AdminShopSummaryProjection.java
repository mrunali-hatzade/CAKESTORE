package com.cakeplatform.api.modules.admin.dto;

public interface AdminShopSummaryProjection {
    Long getShopId();
    String getBusinessName();
    String getOwnerName();
    String getOwnerEmail();
    String getShopStatus();
    java.time.LocalDateTime getRegisteredAt();
}
