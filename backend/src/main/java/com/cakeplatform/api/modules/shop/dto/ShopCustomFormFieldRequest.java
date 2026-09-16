package com.cakeplatform.api.modules.shop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ShopCustomFormFieldRequest {
    @NotBlank
    private String fieldKey;
    @NotBlank
    private String fieldLabel;
    @NotBlank
    private String fieldType; // TEXT, TEXTAREA, NUMBER, DROPDOWN, RADIO, CHECKBOX, DATE, TIME, IMAGE
    private Boolean isRequired = false;
    private Boolean isEnabled = true;
    private String optionsJson;
    private Integer displayOrder = 0;
}
