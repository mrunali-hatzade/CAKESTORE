package com.cakeplatform.api.modules.location.service;

import com.cakeplatform.api.modules.location.dto.*;
import com.cakeplatform.api.modules.location.entity.*;
import com.cakeplatform.api.modules.location.exception.InvalidLocationException;
import com.cakeplatform.api.modules.location.exception.LocationServiceUnavailableException;
import com.cakeplatform.api.modules.location.readiness.LocationReadinessState;
import com.cakeplatform.api.modules.location.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class LocationService {

    private final LocationCountryRepository countryRepository;
    private final LocationStateRepository stateRepository;
    private final LocationDistrictRepository districtRepository;
    private final LocationCityRepository cityRepository;
    private final LocationLocalityRepository localityRepository;
    private final LocationPincodeRepository pincodeRepository;
    private final LocationDatasetMetadataDao metadataDao;
    private final LocationReadinessState readinessState;

    public void checkReadiness() {
        if (!readinessState.isReady()) {
            throw new LocationServiceUnavailableException("The canonical location catalog is currently initializing. Please retry shortly.");
        }
    }

    public LocationReadinessDTO getReadiness() {
        Optional<LocationDatasetMetadata> metaOpt = metadataDao.findByName(LocationDataReconciliationEngine.DATASET_NAME);
        if (metaOpt.isEmpty()) {
            return LocationReadinessDTO.builder()
                    .ready(readinessState.isReady())
                    .status("UNINITIALIZED")
                    .version(LocationDataReconciliationEngine.SOURCE_VERSION)
                    .build();
        }

        LocationDatasetMetadata meta = metaOpt.get();
        return LocationReadinessDTO.builder()
                .ready(readinessState.isReady())
                .status(meta.getStatus())
                .version(meta.getSourceVersion())
                .statesCount(meta.getStatesCount())
                .districtsCount(meta.getDistrictsCount())
                .citiesCount(meta.getCitiesCount())
                .pincodesCount(meta.getPincodesCount())
                .build();
    }

    public List<LocationCountryDTO> getCountries() {
        checkReadiness();
        return countryRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(c -> LocationCountryDTO.builder()
                        .id(c.getId())
                        .code(c.getCode())
                        .name(c.getName())
                        .phoneCode(c.getPhoneCode())
                        .build())
                .collect(Collectors.toList());
    }

    public List<LocationStateDTO> getStates(String countryCode) {
        checkReadiness();
        String code = (countryCode != null && !countryCode.isBlank()) ? countryCode.trim() : "IND";
        return stateRepository.findByCountryCodeIgnoreCaseAndIsActiveTrueOrderByNameAsc(code).stream()
                .map(s -> LocationStateDTO.builder()
                        .id(s.getId())
                        .countryId(s.getCountry().getId())
                        .code(s.getCode())
                        .name(s.getName())
                        .type(s.getType())
                        .lgdCode(s.getLgdCode())
                        .build())
                .collect(Collectors.toList());
    }

    public List<LocationDistrictDTO> getDistricts(Integer stateId) {
        checkReadiness();
        if (stateId == null) {
            throw new InvalidLocationException("State ID is required to fetch districts");
        }
        return districtRepository.findByStateIdAndIsActiveTrueOrderByNameAsc(stateId).stream()
                .map(d -> LocationDistrictDTO.builder()
                        .id(d.getId())
                        .stateId(d.getState().getId())
                        .stateName(d.getState().getName())
                        .name(d.getName())
                        .lgdCode(d.getLgdCode())
                        .build())
                .collect(Collectors.toList());
    }

    public List<LocationCityDTO> getCities(Integer districtId) {
        checkReadiness();
        if (districtId == null) {
            throw new InvalidLocationException("District ID is required to fetch cities");
        }
        return cityRepository.findByDistrictIdAndIsActiveTrueOrderByNameAsc(districtId).stream()
                .map(c -> LocationCityDTO.builder()
                        .id(c.getId())
                        .districtId(c.getDistrict().getId())
                        .districtName(c.getDistrict().getName())
                        .name(c.getName())
                        .tier(c.getTier())
                        .lgdUlbCode(c.getLgdUlbCode())
                        .build())
                .collect(Collectors.toList());
    }

    public List<LocationLocalityDTO> getLocalities(Integer cityId) {
        checkReadiness();
        if (cityId == null) {
            throw new InvalidLocationException("City ID is required to fetch localities");
        }
        return localityRepository.findByCityIdAndIsActiveTrueOrderByNameAsc(cityId).stream()
                .map(l -> LocationLocalityDTO.builder()
                        .id(l.getId())
                        .cityId(l.getCity().getId())
                        .cityName(l.getCity().getName())
                        .name(l.getName())
                        .latitude(l.getLatitude())
                        .longitude(l.getLongitude())
                        .build())
                .collect(Collectors.toList());
    }

    public List<String> getPincodes(Integer districtId, Integer localityId) {
        checkReadiness();
        if (localityId != null) {
            return pincodeRepository.findPincodesByLocalityId(localityId);
        }
        if (districtId != null) {
            return pincodeRepository.findByDistrictIdAndIsActiveTrueOrderByPincodeAsc(districtId).stream()
                    .map(LocationPincode::getPincode)
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    public PincodeLookupResponseDTO lookupPincode(String rawPincode) {
        checkReadiness();
        if (rawPincode == null || rawPincode.isBlank()) {
            throw new InvalidLocationException("PIN code is required");
        }

        String pin = rawPincode.trim();
        if (!pin.matches("^[1-9][0-9]{5}$")) {
            throw new InvalidLocationException("PIN code must be exactly 6 numeric digits and cannot begin with 0",
                    Map.of("pincode", "PIN code must be exactly 6 numeric digits and cannot begin with 0"));
        }

        LocationPincode pinRecord = pincodeRepository.findByPincodeWithDistrictAndState(pin)
                .orElseThrow(() -> new InvalidLocationException("PIN code " + pin + " is not registered in the active Indian postal directory",
                        Map.of("pincode", "PIN code " + pin + " is not registered in the active Indian postal directory")));

        LocationDistrict district = pinRecord.getDistrict();
        LocationState state = district.getState();

        LocationStateDTO stateDTO = LocationStateDTO.builder()
                .id(state.getId())
                .countryId(state.getCountry().getId())
                .code(state.getCode())
                .name(state.getName())
                .type(state.getType())
                .lgdCode(state.getLgdCode())
                .build();

        LocationDistrictDTO districtDTO = LocationDistrictDTO.builder()
                .id(district.getId())
                .stateId(state.getId())
                .stateName(state.getName())
                .name(district.getName())
                .lgdCode(district.getLgdCode())
                .build();

        List<LocationLocality> localities = localityRepository.findByPincode(pin);
        List<LocationLocalityDTO> localityDTOs = localities.stream()
                .map(l -> LocationLocalityDTO.builder()
                        .id(l.getId())
                        .cityId(l.getCity().getId())
                        .cityName(l.getCity().getName())
                        .name(l.getName())
                        .latitude(l.getLatitude())
                        .longitude(l.getLongitude())
                        .build())
                .collect(Collectors.toList());

        // Determine primaryCity: if all localities belong to the same city, return it; otherwise null (preserve ambiguity)
        LocationCityDTO primaryCityDTO = null;
        if (!localities.isEmpty()) {
            Set<Integer> cityIds = localities.stream().map(l -> l.getCity().getId()).collect(Collectors.toSet());
            if (cityIds.size() == 1) {
                LocationCity city = localities.get(0).getCity();
                primaryCityDTO = LocationCityDTO.builder()
                        .id(city.getId())
                        .districtId(district.getId())
                        .districtName(district.getName())
                        .name(city.getName())
                        .tier(city.getTier())
                        .lgdUlbCode(city.getLgdUlbCode())
                        .build();
            }
        }

        return PincodeLookupResponseDTO.builder()
                .pincode(pin)
                .state(stateDTO)
                .district(districtDTO)
                .primaryCity(primaryCityDTO)
                .primaryOfficeName(pinRecord.getPrimaryOfficeName())
                .officeType(pinRecord.getOfficeType())
                .deliveryStatus(pinRecord.getDeliveryStatus())
                .applicableLocalities(localityDTOs)
                .build();
    }
}
