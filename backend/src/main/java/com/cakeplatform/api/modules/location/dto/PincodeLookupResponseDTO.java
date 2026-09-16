package com.cakeplatform.api.modules.location.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PincodeLookupResponseDTO {
    private String pincode;
    private LocationStateDTO state;
    private LocationDistrictDTO district;
    private LocationCityDTO primaryCity;
    private String primaryOfficeName;
    private String officeType;
    private String deliveryStatus;
    private List<LocationLocalityDTO> applicableLocalities;
}
