package com.cakeplatform.api.modules.interaction.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CustomCakeDto {
    @NotBlank
    private String customerName;

    @NotBlank
    @Email
    private String customerEmail;

    private String customerMobile;
    private String occasion;
    private String cakeType;
    private String flavour;
    private Integer servings;
    private String designDescription;
    private String referenceImageUrl;
    private BigDecimal budget;
    private LocalDate requiredDate;
    private String deliveryPreference;

    private java.util.List<DynamicFieldValueDto> dynamicFieldValues;
}
