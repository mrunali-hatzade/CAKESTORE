package com.cakeplatform.api.modules.storefront.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PopularCityDTO {
    private String cityName;
    private String stateName;
    private Long activeBakeryCount;
}
