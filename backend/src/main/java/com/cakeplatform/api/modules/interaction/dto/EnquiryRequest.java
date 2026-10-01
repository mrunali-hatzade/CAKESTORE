package com.cakeplatform.api.modules.interaction.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EnquiryRequest {
    @NotBlank
    private String customerName;

    @NotBlank
    @Email
    private String customerEmail;

    private String customerMobile;

    @NotBlank
    private String enquiryType;

    @NotBlank
    private String message;
}
