package com.cakeplatform.api.modules.location.service;

import com.cakeplatform.api.modules.location.dto.LocationValidationDTO;
import com.cakeplatform.api.modules.location.entity.LocationCity;
import com.cakeplatform.api.modules.location.entity.LocationDistrict;
import com.cakeplatform.api.modules.location.entity.LocationPincode;
import com.cakeplatform.api.modules.location.entity.LocationState;
import com.cakeplatform.api.modules.location.exception.InvalidLocationException;
import com.cakeplatform.api.modules.location.exception.LocationServiceUnavailableException;
import com.cakeplatform.api.modules.location.readiness.LocationReadinessState;
import com.cakeplatform.api.modules.location.repository.LocationCityRepository;
import com.cakeplatform.api.modules.location.repository.LocationDistrictRepository;
import com.cakeplatform.api.modules.location.repository.LocationPincodeRepository;
import com.cakeplatform.api.modules.location.repository.LocationStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LocationValidationService {

    private final LocationReadinessState readinessState;
    private final LocationStateRepository stateRepository;
    private final LocationDistrictRepository districtRepository;
    private final LocationCityRepository cityRepository;
    private final LocationPincodeRepository pincodeRepository;

    public void validateLocation(LocationValidationDTO req) {
        // 0. Fail-Closed Readiness Check
        if (!readinessState.isReady()) {
            throw new LocationServiceUnavailableException("The canonical location catalog is currently initializing or undergoing verification. Please retry shortly.");
        }

        if (req == null) {
            throw new InvalidLocationException("Location validation payload cannot be null");
        }

        Map<String, String> fieldErrors = new LinkedHashMap<>();

        // 1. Normalize strings
        String normState = normalize(req.getState());
        String normDistrict = normalize(req.getDistrict());
        String normCity = normalize(req.getCity());
        String pincode = req.getPincode() != null ? req.getPincode().trim() : null;

        // 2. Validate State
        if (normState == null || normState.isBlank()) {
            fieldErrors.put("state", "State is required.");
            throw new InvalidLocationException("Location validation failed.", fieldErrors);
        }

        LocationState state = stateRepository.findByNormalizedName(normState).orElse(null);
        if (state == null || !state.getIsActive()) {
            fieldErrors.put("state", "State '" + req.getState() + "' is not a recognized or active Indian State / UT.");
            throw new InvalidLocationException("Location validation failed.", fieldErrors);
        }

        // 3. Validate District (parent-scoped to State)
        LocationDistrict district = null;
        if (normDistrict != null && !normDistrict.isBlank()) {
            district = districtRepository.findByStateIdAndNormalizedName(state.getId(), normDistrict).orElse(null);
            if (district == null || !district.getIsActive()) {
                fieldErrors.put("district", "District '" + req.getDistrict() + "' does not belong to State '" + state.getName() + "'.");
            }
        }

        // 4. Validate City (parent-scoped to District)
        if (normCity != null && !normCity.isBlank() && district != null) {
            LocationCity city = cityRepository.findByDistrictIdAndNormalizedName(district.getId(), normCity).orElse(null);
            if (city == null || !city.getIsActive()) {
                fieldErrors.put("city", "City '" + req.getCity() + "' is not registered under District '" + district.getName() + "'.");
            }
        }

        // 5. Validate PIN Code (Decoupled Stage A Format + Stage B Canonical Relationship)
        if (pincode != null && !pincode.isBlank()) {
            // Stage A: Strict 6-Digit Format
            if (!pincode.matches("^[1-9][0-9]{5}$")) {
                fieldErrors.put("pincode", "PIN code must be exactly 6 numeric digits and cannot begin with 0.");
            } else {
                // Stage B: Canonical Database Check (State derived via District)
                LocationPincode pinRecord = pincodeRepository.findById(pincode).orElse(null);
                if (pinRecord == null || !pinRecord.getIsActive()) {
                    fieldErrors.put("pincode", "PIN code " + pincode + " is not registered in the active Indian postal directory.");
                } else {
                    LocationDistrict pinDistrict = pinRecord.getDistrict();
                    LocationState pinState = pinDistrict.getState();

                    if (!pinState.getId().equals(state.getId())) {
                        fieldErrors.put("pincode", "PIN code " + pincode + " belongs to " + pinState.getName() + ", not " + state.getName() + ".");
                    } else if (district != null && !pinDistrict.getId().equals(district.getId())) {
                        fieldErrors.put("pincode", "PIN code " + pincode + " belongs to District " + pinDistrict.getName() + ", not " + district.getName() + ".");
                    }
                }
            }
        }

        if (!fieldErrors.isEmpty()) {
            throw new InvalidLocationException("Location hierarchy validation failed.", fieldErrors);
        }
    }

    private String normalize(String val) {
        if (val == null) return null;
        return val.trim().toLowerCase().replaceAll("\\s+", " ");
    }
}
