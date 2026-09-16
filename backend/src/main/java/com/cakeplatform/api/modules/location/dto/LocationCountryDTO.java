package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationCountryDTO {
    private Integer id;
    private String code;
    private String name;
    private String phoneCode;
}
