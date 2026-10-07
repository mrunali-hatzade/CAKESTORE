package com.cakeplatform.api.modules.user.dto;

import lombok.Data;

@Data
public class CustomerAddressResponse {
    private Long id;
    private String label;
    private String recipientName;
    private String recipientPhone;
    private String deliveryAddress;
    private boolean isDefault;
}
