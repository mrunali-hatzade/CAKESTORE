package com.cakeplatform.api.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerAddressRequest {
    @NotBlank(message = "Label is required")
    private String label;

    @NotBlank(message = "Recipient name is required")
    private String recipientName;

    @NotBlank(message = "Recipient phone is required")
    private String recipientPhone;

    @NotBlank(message = "Delivery address is required")
    private String deliveryAddress;
    
    private boolean isDefault;
}
