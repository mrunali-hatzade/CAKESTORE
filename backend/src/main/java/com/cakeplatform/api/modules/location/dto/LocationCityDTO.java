package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationCityDTO {
    private Integer id;
    private Integer districtId;
    private String districtName;
    private String name;
    private String tier;
    private Integer lgdUlbCode;
}
