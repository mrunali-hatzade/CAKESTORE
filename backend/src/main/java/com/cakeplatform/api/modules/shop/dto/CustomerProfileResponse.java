package com.cakeplatform.api.modules.shop.dto;

import com.cakeplatform.api.modules.order.Order;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public class CustomerProfileResponse {
    private String name;
    private String email;
    private String mobile;
    private String address;
    private long totalOrders;
    private BigDecimal totalSpent;
    private LocalDateTime lastOrderDate;
    private List<Order> orderHistory;

    public CustomerProfileResponse(String name, String email, String mobile, String address, Long totalOrders, BigDecimal totalSpent, LocalDateTime lastOrderDate) {
        this.name = name;
        this.email = email;
        this.mobile = mobile;
        this.address = address;
        this.totalOrders = totalOrders != null ? totalOrders : 0L;
        this.totalSpent = totalSpent != null ? totalSpent : BigDecimal.ZERO;
        this.lastOrderDate = lastOrderDate;
    }
}
