package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationStateDTO {
    private Integer id;
    private Integer countryId;
    private String code;
    private String name;
    private String type;
    private Integer lgdCode;
}
