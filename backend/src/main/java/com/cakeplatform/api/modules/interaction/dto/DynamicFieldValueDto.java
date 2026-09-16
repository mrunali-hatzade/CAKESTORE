package com.cakeplatform.api.modules.interaction.dto;

import lombok.Data;

@Data
public class DynamicFieldValueDto {
    private String fieldKey;
    private String fieldLabel;
    private String fieldValue;
}
