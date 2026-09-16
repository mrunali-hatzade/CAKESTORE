package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationValidationDTO {
    private String country;
    private String state;
    private String district;
    private String city;
    private String area;
    private String pincode;
}
