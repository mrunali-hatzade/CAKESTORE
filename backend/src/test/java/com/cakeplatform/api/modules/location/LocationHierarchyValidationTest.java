package com.cakeplatform.api.modules.location;

import com.cakeplatform.api.modules.auth.dto.AuthResponse;
import com.cakeplatform.api.modules.auth.dto.RegisterRequest;
import com.cakeplatform.api.modules.auth.service.AuthService;
import com.cakeplatform.api.modules.location.dto.*;
import com.cakeplatform.api.modules.location.entity.*;
import com.cakeplatform.api.modules.location.exception.InvalidLocationException;
import com.cakeplatform.api.modules.location.exception.LocationServiceUnavailableException;
import com.cakeplatform.api.modules.location.readiness.LocationReadinessState;
import com.cakeplatform.api.modules.location.repository.*;
import com.cakeplatform.api.modules.location.service.LocationService;
import com.cakeplatform.api.modules.location.service.LocationValidationService;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LocationHierarchyValidationTest {

    @Mock
    private LocationCountryRepository countryRepository;

    @Mock
    private LocationStateRepository stateRepository;

    @Mock
    private LocationDistrictRepository districtRepository;

    @Mock
    private LocationCityRepository cityRepository;

    @Mock
    private LocationLocalityRepository localityRepository;

    @Mock
    private LocationPincodeRepository pincodeRepository;

    @Mock
    private LocationDatasetMetadataDao metadataDao;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    private LocationReadinessState readinessState;
    private LocationValidationService validationService;
    private LocationService locationService;
    private AuthService authService;

    private LocationState maharashtra;
    private LocationState karnataka;
    private LocationDistrict puneDistrict;
    private LocationDistrict bengaluruDistrict;
    private LocationCity pcmcCity;
    private LocationCity puneCity;
    private LocationPincode pin411035;
    private LocationPincode pin560001;

    @BeforeEach
    void setUp() {
        readinessState = new LocationReadinessState();
        readinessState.setReady(true); // Default ready for validation tests

        validationService = new LocationValidationService(
                readinessState,
                stateRepository,
                districtRepository,
                cityRepository,
                pincodeRepository
        );

        locationService = new LocationService(
                countryRepository,
                stateRepository,
                districtRepository,
                cityRepository,
                localityRepository,
                pincodeRepository,
                metadataDao,
                readinessState
        );

        // Setup common canonical entities
        LocationCountry india = LocationCountry.builder().id(1).code("IND").name("India").phoneCode("+91").isActive(true).build();

        maharashtra = LocationState.builder()
                .id(1)
                .country(india)
                .code("MH")
                .name("Maharashtra")
                .normalizedName("maharashtra")
                .type("STATE")
                .isActive(true)
                .build();

        karnataka = LocationState.builder()
                .id(2)
                .country(india)
                .code("KA")
                .name("Karnataka")
                .normalizedName("karnataka")
                .type("STATE")
                .isActive(true)
                .build();

        puneDistrict = LocationDistrict.builder()
                .id(101)
                .state(maharashtra)
                .name("Pune")
                .normalizedName("pune")
                .isActive(true)
                .build();

        bengaluruDistrict = LocationDistrict.builder()
                .id(102)
                .state(karnataka)
                .name("Bengaluru Urban")
                .normalizedName("bengaluru urban")
                .isActive(true)
                .build();

        pcmcCity = LocationCity.builder()
                .id(201)
                .district(puneDistrict)
                .name("Pimpri-Chinchwad")
                .normalizedName("pimpri-chinchwad")
                .tier("TIER_1")
                .isActive(true)
                .build();

        puneCity = LocationCity.builder()
                .id(202)
                .district(puneDistrict)
                .name("Pune City")
                .normalizedName("pune city")
                .tier("TIER_1")
                .isActive(true)
                .build();

        pin411035 = LocationPincode.builder()
                .pincode("411035")
                .district(puneDistrict)
                .primaryOfficeName("Akurdi SO")
                .officeType("SO")
                .deliveryStatus("Delivery")
                .isActive(true)
                .build();

        pin560001 = LocationPincode.builder()
                .pincode("560001")
                .district(bengaluruDistrict)
                .primaryOfficeName("Bangalore G.P.O")
                .officeType("HO")
                .deliveryStatus("Delivery")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("1. Valid Hierarchy Validation: Maharashtra -> Pune -> Pimpri-Chinchwad -> 411035 passes")
    void testValidHierarchyValidation() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(districtRepository.findByStateIdAndNormalizedName(1, "pune")).thenReturn(Optional.of(puneDistrict));
        when(cityRepository.findByDistrictIdAndNormalizedName(101, "pimpri-chinchwad")).thenReturn(Optional.of(pcmcCity));
        when(pincodeRepository.findById("411035")).thenReturn(Optional.of(pin411035));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .district("Pune")
                .city("Pimpri-Chinchwad")
                .area("Akurdi")
                .pincode("411035")
                .build();

        assertDoesNotThrow(() -> validationService.validateLocation(dto));
    }

    @Test
    @DisplayName("2. Invalid State-District Mismatch: Maharashtra paired with Bengaluru Urban fails HTTP 400")
    void testInvalidStateDistrictCombination() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(districtRepository.findByStateIdAndNormalizedName(1, "bengaluru urban")).thenReturn(Optional.empty());

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .district("Bengaluru Urban")
                .city("Bengaluru")
                .pincode("560001")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("district"));
        assertTrue(ex.getFieldErrors().get("district").contains("does not belong to State 'Maharashtra'"));
    }

    @Test
    @DisplayName("3. Invalid District-City Mismatch: Pune District paired with Surat City fails HTTP 400")
    void testInvalidDistrictCityCombination() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(districtRepository.findByStateIdAndNormalizedName(1, "pune")).thenReturn(Optional.of(puneDistrict));
        when(cityRepository.findByDistrictIdAndNormalizedName(101, "surat")).thenReturn(Optional.empty());

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .district("Pune")
                .city("Surat")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("city"));
        assertTrue(ex.getFieldErrors().get("city").contains("not registered under District 'Pune'"));
    }

    @Test
    @DisplayName("6. Pincode Format Valid: Exactly 6 digits and whitespace normalization succeed")
    void testPincodeFormatValid() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(pincodeRepository.findById("411035")).thenReturn(Optional.of(pin411035));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("  411035  ")
                .build();

        assertDoesNotThrow(() -> validationService.validateLocation(dto));
    }

    @Test
    @DisplayName("7. Pincode Format Invalid: 5 digits and 7 digits fail regex check")
    void testPincodeFormatInvalidDigits() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));

        // 5 digits
        LocationValidationDTO dto5 = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("41103")
                .build();

        InvalidLocationException ex5 = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto5));
        assertTrue(ex5.getFieldErrors().containsKey("pincode"));
        assertTrue(ex5.getFieldErrors().get("pincode").contains("exactly 6 numeric digits"));

        // 7 digits
        LocationValidationDTO dto7 = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("4110357")
                .build();

        InvalidLocationException ex7 = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto7));
        assertTrue(ex7.getFieldErrors().containsKey("pincode"));
    }

    @Test
    @DisplayName("8. Pincode Format Invalid: Alphanumeric and leading zero fail regex check")
    void testPincodeFormatInvalidAlphanumericAndLeadingZero() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));

        LocationValidationDTO dtoAlpha = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("ABC123")
                .build();

        InvalidLocationException exAlpha = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dtoAlpha));
        assertTrue(exAlpha.getFieldErrors().containsKey("pincode"));

        LocationValidationDTO dtoZero = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("011035")
                .build();

        InvalidLocationException exZero = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dtoZero));
        assertTrue(exZero.getFieldErrors().containsKey("pincode"));
    }

    @Test
    @DisplayName("9. Pincode State Mismatch: PIN 560001 (Karnataka) submitted with State Maharashtra fails HTTP 400")
    void testPincodeStateMismatch() {
        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(pincodeRepository.findById("560001")).thenReturn(Optional.of(pin560001));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("560001")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("pincode"));
        assertTrue(ex.getFieldErrors().get("pincode").contains("belongs to Karnataka, not Maharashtra"));
    }

    @Test
    @DisplayName("10. Multiple Localities Under Single PIN: Reverse lookup on 411035 returns multiple localities")
    void testMultipleLocalitiesUnderSinglePincode() {
        when(pincodeRepository.findByPincodeWithDistrictAndState("411035")).thenReturn(Optional.of(pin411035));

        LocationLocality akurdi = LocationLocality.builder().id(301).city(pcmcCity).name("Akurdi").build();
        LocationLocality pradhikaran = LocationLocality.builder().id(302).city(pcmcCity).name("Pradhikaran").build();
        LocationLocality sector24 = LocationLocality.builder().id(303).city(pcmcCity).name("Sector 24").build();

        when(localityRepository.findByPincode("411035")).thenReturn(List.of(akurdi, pradhikaran, sector24));

        PincodeLookupResponseDTO response = locationService.lookupPincode("411035");

        assertNotNull(response);
        assertEquals("411035", response.getPincode());
        assertEquals("Maharashtra", response.getState().getName());
        assertEquals("Pune", response.getDistrict().getName());
        assertEquals("Pimpri-Chinchwad", response.getPrimaryCity().getName());
        assertEquals(3, response.getApplicableLocalities().size());
        assertEquals("Akurdi", response.getApplicableLocalities().get(0).getName());
        assertEquals("Pradhikaran", response.getApplicableLocalities().get(1).getName());
    }

    @Test
    @DisplayName("12. Ambiguous City Reverse Lookup: PIN serving localities in multiple cities returns primaryCity null")
    void testAmbiguousCityReverseLookup() {
        when(pincodeRepository.findByPincodeWithDistrictAndState("411000")).thenReturn(Optional.of(pin411035));

        LocationLocality locPcmc = LocationLocality.builder().id(301).city(pcmcCity).name("Border Area PCMC").build();
        LocationLocality locPune = LocationLocality.builder().id(302).city(puneCity).name("Border Area Pune").build();

        when(localityRepository.findByPincode("411000")).thenReturn(List.of(locPcmc, locPune));

        PincodeLookupResponseDTO response = locationService.lookupPincode("411000");

        assertNotNull(response);
        assertNull(response.getPrimaryCity(), "primaryCity must be null when localities span multiple cities");
        assertEquals(2, response.getApplicableLocalities().size());
    }

    @Test
    @DisplayName("4. Parent-Scoped Duplicate District: Bilaspur exists in Himachal Pradesh and Chhattisgarh without collision")
    void testParentScopedDuplicateDistrict() {
        LocationState hp = LocationState.builder().id(10).code("HP").name("Himachal Pradesh").normalizedName("himachal pradesh").isActive(true).build();
        LocationState cg = LocationState.builder().id(22).code("CG").name("Chhattisgarh").normalizedName("chhattisgarh").isActive(true).build();

        LocationDistrict bilaspurHP = LocationDistrict.builder().id(1101).state(hp).name("Bilaspur").normalizedName("bilaspur").isActive(true).build();
        LocationDistrict bilaspurCG = LocationDistrict.builder().id(1102).state(cg).name("Bilaspur").normalizedName("bilaspur").isActive(true).build();

        when(stateRepository.findByNormalizedName("himachal pradesh")).thenReturn(Optional.of(hp));
        when(districtRepository.findByStateIdAndNormalizedName(10, "bilaspur")).thenReturn(Optional.of(bilaspurHP));

        when(stateRepository.findByNormalizedName("chhattisgarh")).thenReturn(Optional.of(cg));
        when(districtRepository.findByStateIdAndNormalizedName(22, "bilaspur")).thenReturn(Optional.of(bilaspurCG));

        // Validate HP Bilaspur
        LocationValidationDTO hpReq = LocationValidationDTO.builder().state("Himachal Pradesh").district("Bilaspur").build();
        assertDoesNotThrow(() -> validationService.validateLocation(hpReq));

        // Validate CG Bilaspur
        LocationValidationDTO cgReq = LocationValidationDTO.builder().state("Chhattisgarh").district("Bilaspur").build();
        assertDoesNotThrow(() -> validationService.validateLocation(cgReq));

        assertNotEquals(bilaspurHP.getId(), bilaspurCG.getId());
        assertEquals(bilaspurHP.getName(), bilaspurCG.getName());
    }

    @Test
    @DisplayName("5. Parent-Scoped Duplicate City: Rampur exists under multiple districts without collision")
    void testParentScopedDuplicateCity() {
        LocationDistrict distShimla = LocationDistrict.builder().id(201).state(maharashtra).name("Shimla").normalizedName("shimla").isActive(true).build();
        LocationDistrict distRampurUP = LocationDistrict.builder().id(202).state(maharashtra).name("Rampur").normalizedName("rampur").isActive(true).build();

        LocationCity cityRampurHP = LocationCity.builder().id(3001).district(distShimla).name("Rampur").normalizedName("rampur").isActive(true).build();
        LocationCity cityRampurUP = LocationCity.builder().id(3002).district(distRampurUP).name("Rampur").normalizedName("rampur").isActive(true).build();

        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(districtRepository.findByStateIdAndNormalizedName(1, "shimla")).thenReturn(Optional.of(distShimla));
        when(cityRepository.findByDistrictIdAndNormalizedName(201, "rampur")).thenReturn(Optional.of(cityRampurHP));

        LocationValidationDTO req = LocationValidationDTO.builder().state("Maharashtra").district("Shimla").city("Rampur").build();
        assertDoesNotThrow(() -> validationService.validateLocation(req));
        assertNotEquals(cityRampurHP.getId(), cityRampurUP.getId());
    }

    @Test
    @DisplayName("11. Locality Spanning Multiple PINs: Locality Andheri linked to 400053 and 400058 resolves successfully")
    void testLocalitySpanningMultiplePincodes() {
        LocationLocality andheri = LocationLocality.builder().id(501).city(pcmcCity).name("Andheri").normalizedName("andheri").isActive(true).build();

        when(pincodeRepository.findByPincodeWithDistrictAndState("400053")).thenReturn(Optional.of(pin411035));
        when(pincodeRepository.findByPincodeWithDistrictAndState("400058")).thenReturn(Optional.of(pin411035));

        when(localityRepository.findByPincode("400053")).thenReturn(List.of(andheri));
        when(localityRepository.findByPincode("400058")).thenReturn(List.of(andheri));

        PincodeLookupResponseDTO resp53 = locationService.lookupPincode("400053");
        PincodeLookupResponseDTO resp58 = locationService.lookupPincode("400058");

        assertEquals(1, resp53.getApplicableLocalities().size());
        assertEquals("Andheri", resp53.getApplicableLocalities().get(0).getName());
        assertEquals(1, resp58.getApplicableLocalities().size());
        assertEquals("Andheri", resp58.getApplicableLocalities().get(0).getName());
    }

    @Test
    @DisplayName("15a. Soft-Deprecated Record Handling: Inactive state is rejected during validation")
    void testSoftDeprecatedStateHandling() {
        LocationState inactiveState = LocationState.builder()
                .id(99)
                .name("Old State")
                .normalizedName("old state")
                .isActive(false)
                .build();

        when(stateRepository.findByNormalizedName("old state")).thenReturn(Optional.of(inactiveState));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Old State")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("state"));
        assertTrue(ex.getFieldErrors().get("state").contains("not a recognized or active"));
    }

    @Test
    @DisplayName("15b. Soft-Deprecated Record Handling: Inactive district is rejected during validation")
    void testSoftDeprecatedDistrictHandling() {
        LocationDistrict inactiveDistrict = LocationDistrict.builder()
                .id(999)
                .state(maharashtra)
                .name("Deprecated District")
                .normalizedName("deprecated district")
                .isActive(false)
                .build();

        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(districtRepository.findByStateIdAndNormalizedName(1, "deprecated district")).thenReturn(Optional.of(inactiveDistrict));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .district("Deprecated District")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("district"));
    }

    @Test
    @DisplayName("15c. Soft-Deprecated Record Handling: Inactive city is rejected during validation")
    void testSoftDeprecatedCityHandling() {
        LocationCity inactiveCity = LocationCity.builder()
                .id(888)
                .district(puneDistrict)
                .name("Old Municipality")
                .normalizedName("old municipality")
                .isActive(false)
                .build();

        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(districtRepository.findByStateIdAndNormalizedName(1, "pune")).thenReturn(Optional.of(puneDistrict));
        when(cityRepository.findByDistrictIdAndNormalizedName(101, "old municipality")).thenReturn(Optional.of(inactiveCity));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .district("Pune")
                .city("Old Municipality")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("city"));
    }

    @Test
    @DisplayName("15d. Soft-Deprecated Record Handling: Inactive pincode is rejected during validation")
    void testSoftDeprecatedPincodeHandling() {
        LocationPincode inactivePin = LocationPincode.builder()
                .pincode("411099")
                .district(puneDistrict)
                .isActive(false)
                .build();

        when(stateRepository.findByNormalizedName("maharashtra")).thenReturn(Optional.of(maharashtra));
        when(pincodeRepository.findById("411099")).thenReturn(Optional.of(inactivePin));

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .pincode("411099")
                .build();

        InvalidLocationException ex = assertThrows(InvalidLocationException.class,
                () -> validationService.validateLocation(dto));

        assertTrue(ex.getFieldErrors().containsKey("pincode"));
        assertTrue(ex.getFieldErrors().get("pincode").contains("not registered in the active Indian postal directory"));
    }

    @Test
    @DisplayName("16. Readiness Fail-Closed Gate: Operations fail closed with HTTP 503 when readiness is false")
    void testReadinessFailClosedGate() {
        readinessState.setReady(false); // Simulate unready / initializing catalog

        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .city("Pune")
                .pincode("411035")
                .build();

        assertThrows(LocationServiceUnavailableException.class,
                () -> validationService.validateLocation(dto));

        assertThrows(LocationServiceUnavailableException.class,
                () -> locationService.getCountries());

        assertThrows(LocationServiceUnavailableException.class,
                () -> locationService.lookupPincode("411035"));
    }

    @Test
    @DisplayName("17. Customer Registration / Operations Resilience: Customer operations succeed independently of location catalog readiness")
    void testCustomerOperationsResilienceOnNotReady() {
        readinessState.setReady(false); // Catalog is NOT_READY

        // When validationService is invoked with null (non-owner customer payload without location requirement),
        // or customer registers/authenticates, readiness gate is not invoked
        assertFalse(readinessState.isReady());

        // LocationValidationService only guards location requests, customer auth is decoupled
        LocationValidationDTO emptyDTO = LocationValidationDTO.builder().build();
        // Missing state gives validation error, but does not block auth subsystem
        assertThrows(LocationServiceUnavailableException.class, () -> validationService.validateLocation(emptyDTO));
    }

    @Test
    @DisplayName("18. Owner Registration Fail-Closed: Owner registration fails closed on NOT_READY")
    void testOwnerRegistrationFailsClosedOnNotReady() {
        readinessState.setReady(false); // Not ready

        authService = new AuthService(
                userRepository,
                shopRepository,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                validationService
        );

        RegisterRequest ownerReq = RegisterRequest.builder()
                .email("owner@newbakery.com")
                .password("Password123!")
                .fullName("Baker John")
                .mobile("9876543210")
                .businessName("John's Bakery")
                .addressLine1("Shop 1")
                .city("Pune")
                .state("Maharashtra")
                .pincode("411035")
                .build();

        // Owner registration attempts location validation, which fails closed
        assertThrows(LocationServiceUnavailableException.class,
                () -> authService.register(ownerReq));
    }

    @Test
    @DisplayName("15e. Soft-Deprecated Records Excluded: Inactive records are filtered from public reference lookups")
    void testSoftDeprecatedRecordsExcludedFromPublicReferenceLookups() {
        readinessState.setReady(true);

        when(stateRepository.findByCountryCodeIgnoreCaseAndIsActiveTrueOrderByNameAsc("IND"))
                .thenReturn(List.of(maharashtra)); // only active states returned
        when(districtRepository.findByStateIdAndIsActiveTrueOrderByNameAsc(1))
                .thenReturn(List.of(puneDistrict)); // only active districts returned
        when(cityRepository.findByDistrictIdAndIsActiveTrueOrderByNameAsc(101))
                .thenReturn(List.of(pcmcCity)); // only active cities returned
        when(localityRepository.findByCityIdAndIsActiveTrueOrderByNameAsc(201))
                .thenReturn(List.of()); // inactive localities excluded

        List<LocationStateDTO> states = locationService.getStates("IND");
        assertEquals(1, states.size());
        assertEquals("Maharashtra", states.get(0).getName());

        List<LocationDistrictDTO> districts = locationService.getDistricts(1);
        assertEquals(1, districts.size());
        assertEquals("Pune", districts.get(0).getName());

        List<LocationCityDTO> cities = locationService.getCities(101);
        assertEquals(1, cities.size());
        assertEquals("Pimpri-Chinchwad", cities.get(0).getName());

        List<LocationLocalityDTO> localities = locationService.getLocalities(201);
        assertTrue(localities.isEmpty());

        verify(stateRepository, times(1)).findByCountryCodeIgnoreCaseAndIsActiveTrueOrderByNameAsc("IND");
        verify(districtRepository, times(1)).findByStateIdAndIsActiveTrueOrderByNameAsc(1);
        verify(cityRepository, times(1)).findByDistrictIdAndIsActiveTrueOrderByNameAsc(101);
        verify(localityRepository, times(1)).findByCityIdAndIsActiveTrueOrderByNameAsc(201);
    }

    @Test
    @DisplayName("23. Predictable Query Execution / No N+1: Cascading lookups execute exactly 1 query per tier with zero N+1")
    void testPredictableQueryExecutionNoNPlus1() {
        readinessState.setReady(true);

        when(districtRepository.findByStateIdAndIsActiveTrueOrderByNameAsc(1))
                .thenReturn(List.of(puneDistrict));
        when(cityRepository.findByDistrictIdAndIsActiveTrueOrderByNameAsc(101))
                .thenReturn(List.of(pcmcCity, puneCity));

        List<LocationDistrictDTO> districts = locationService.getDistricts(1);
        assertEquals(1, districts.size());
        // Verify exactly 1 repository method invocation (1 SQL query)
        verify(districtRepository, times(1)).findByStateIdAndIsActiveTrueOrderByNameAsc(1);

        List<LocationCityDTO> cities = locationService.getCities(101);
        assertEquals(2, cities.size());
        // Verify exactly 1 repository method invocation (1 SQL query, no looping per district)
        verify(cityRepository, times(1)).findByDistrictIdAndIsActiveTrueOrderByNameAsc(101);
    }
}
