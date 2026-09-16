package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationLocalityDTO {
    private Integer id;
    private Integer cityId;
    private String cityName;
    private String name;
    private Double latitude;
    private Double longitude;
}
