package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationDistrictDTO {
    private Integer id;
    private Integer stateId;
    private String stateName;
    private String name;
    private Integer lgdCode;
}
