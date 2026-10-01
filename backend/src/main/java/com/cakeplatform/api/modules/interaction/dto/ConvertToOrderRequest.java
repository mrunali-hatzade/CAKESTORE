package com.cakeplatform.api.modules.interaction.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ConvertToOrderRequest {
    private BigDecimal agreedPrice;
    private BigDecimal deliveryCharge;
    private LocalDate deliveryDate;
    private String deliveryAddress;
    private String fulfillmentType; // DOORSTEP_DELIVERY or STORE_PICKUP
    private Long deliverySlotId;
    private String paymentMethod; // COD, ADVANCE_PAID, ONLINE_PAYMENT, etc.
    private String paymentStatus; // PENDING, PAID
    private String notes;
}
