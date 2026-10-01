package com.cakeplatform.api.modules.interaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConvertToOrderResponse {
    private Long orderId;
    private String orderNumber;
    private Long customCakeRequestId;
    private BigDecimal totalAmount;
    private String orderStatus;
    private String paymentStatus;
    private String message;
}
