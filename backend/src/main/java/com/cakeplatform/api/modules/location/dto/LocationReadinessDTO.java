package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationReadinessDTO {
    private boolean ready;
    private String status;
    private String version;
    private int statesCount;
    private int districtsCount;
    private int citiesCount;
    private int pincodesCount;
}
