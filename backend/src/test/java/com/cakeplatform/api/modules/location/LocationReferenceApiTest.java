package com.cakeplatform.api.modules.location;

import com.cakeplatform.api.modules.location.controller.LocationReferenceController;
import com.cakeplatform.api.modules.location.dto.*;
import com.cakeplatform.api.modules.location.service.LocationService;
import com.cakeplatform.api.modules.location.service.LocationValidationService;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.dto.UpdateShopRequest;
import com.cakeplatform.api.modules.shop.service.ShopService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class LocationReferenceApiTest {

    @Mock
    private LocationService locationService;

    @Mock
    private LocationValidationService validationService;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    private LocationReferenceController controller;
    private ShopService shopService;

    @BeforeEach
    void setUp() {
        controller = new LocationReferenceController(locationService, validationService);
        shopService = new ShopService(shopRepository, shopAccessValidator, null, validationService);
    }

    @Test
    @DisplayName("22. Public Reference Endpoints & Cache: Returns 200 OK with Cache-Control headers")
    void testPublicReferenceEndpoints() {
        when(locationService.getCountries()).thenReturn(List.of(
                LocationCountryDTO.builder().id(1).code("IND").name("India").phoneCode("+91").build()
        ));

        ResponseEntity<List<LocationCountryDTO>> response = controller.getCountries();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertNotNull(response.getHeaders().getCacheControl());
        assertTrue(response.getHeaders().getCacheControl().contains("max-age=86400"));
    }

    @Test
    @DisplayName("Cascading Cascades: States, Districts, Cities, Localities controllers execute correctly")
    void testCascadingLookupControllers() {
        when(locationService.getStates("IND")).thenReturn(List.of(
                LocationStateDTO.builder().id(1).code("MH").name("Maharashtra").build()
        ));
        when(locationService.getDistricts(1)).thenReturn(List.of(
                LocationDistrictDTO.builder().id(101).name("Pune").build()
        ));
        when(locationService.getCities(101)).thenReturn(List.of(
                LocationCityDTO.builder().id(201).name("Pimpri-Chinchwad").build()
        ));
        when(locationService.getLocalities(201)).thenReturn(List.of(
                LocationLocalityDTO.builder().id(301).name("Akurdi").build()
        ));

        ResponseEntity<List<LocationStateDTO>> statesResp = controller.getStates("IND");
        assertEquals(1, statesResp.getBody().size());
        assertEquals("Maharashtra", statesResp.getBody().get(0).getName());

        ResponseEntity<List<LocationDistrictDTO>> distsResp = controller.getDistricts(1);
        assertEquals(1, distsResp.getBody().size());
        assertEquals("Pune", distsResp.getBody().get(0).getName());

        ResponseEntity<List<LocationCityDTO>> citiesResp = controller.getCities(101);
        assertEquals(1, citiesResp.getBody().size());
        assertEquals("Pimpri-Chinchwad", citiesResp.getBody().get(0).getName());

        ResponseEntity<List<LocationLocalityDTO>> locsResp = controller.getLocalities(201);
        assertEquals(1, locsResp.getBody().size());
        assertEquals("Akurdi", locsResp.getBody().get(0).getName());
    }

    @Test
    @DisplayName("Cascading Pincodes Lookup Controller: GET /api/locations/pincodes returns list of pincodes")
    void testCascadingPincodesLookupController() {
        when(locationService.getPincodes(101, 301)).thenReturn(List.of("411035"));

        ResponseEntity<List<String>> pincodesResp = controller.getPincodes(101, 301);
        assertEquals(HttpStatus.OK, pincodesResp.getStatusCode());
        assertNotNull(pincodesResp.getBody());
        assertEquals(1, pincodesResp.getBody().size());
        assertEquals("411035", pincodesResp.getBody().get(0));
    }

    @Test
    @DisplayName("Validation Controller Endpoint: POST /api/locations/validate returns 200 OK for valid DTO")
    void testValidateLocationEndpoint() {
        LocationValidationDTO dto = LocationValidationDTO.builder()
                .state("Maharashtra")
                .district("Pune")
                .city("Pune City")
                .pincode("411038")
                .build();

        doNothing().when(validationService).validateLocation(dto);

        ResponseEntity<Map<String, Object>> response = controller.validateLocation(dto);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(true, response.getBody().get("valid"));
    }

    @Test
    @DisplayName("Readiness Endpoint: GET /api/locations/readiness returns current catalog status")
    void testReadinessEndpoint() {
        when(locationService.getReadiness()).thenReturn(
                LocationReadinessDTO.builder()
                        .ready(true)
                        .status("READY")
                        .version("2024.1")
                        .statesCount(36)
                        .districtsCount(785)
                        .citiesCount(4800)
                        .pincodesCount(19300)
                        .build()
        );

        ResponseEntity<LocationReadinessDTO> response = controller.getReadiness();
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().isReady());
        assertEquals("READY", response.getBody().getStatus());
        assertEquals(36, response.getBody().getStatesCount());
    }

    @Test
    @DisplayName("21. Tenant Isolation Enforcement: Owner A cannot update Shop B location")
    void testTenantIsolationEnforcement() {
        Long ownerId = 42L;
        when(shopAccessValidator.getShopByOwnerId(ownerId)).thenThrow(
                new AccessDeniedException("Access denied: You do not own this shop")
        );

        UpdateShopRequest updateReq = new UpdateShopRequest();
        updateReq.setCity("Mumbai");
        updateReq.setState("Maharashtra");
        updateReq.setPincode("400001");

        assertThrows(AccessDeniedException.class,
                () -> shopService.updateMyShopProfile(ownerId, updateReq));

        verify(validationService, never()).validateLocation(any());
        verify(shopRepository, never()).save(any());
    }

    @Test
    @DisplayName("Owner Profile Location Update: Location is validated when updated")
    void testOwnerProfileLocationUpdateValidates() {
        Long ownerId = 10L;
        Shop existingShop = new Shop();
        existingShop.setId(100L);
        existingShop.setState("Maharashtra");
        existingShop.setDistrict("Pune");
        existingShop.setCity("Pune City");
        existingShop.setPincode("411038");

        when(shopAccessValidator.getShopByOwnerId(ownerId)).thenReturn(existingShop);
        when(shopRepository.save(any(Shop.class))).thenAnswer(i -> i.getArgument(0));

        UpdateShopRequest updateReq = new UpdateShopRequest();
        updateReq.setCity("Pimpri-Chinchwad");
        updateReq.setPincode("411035");

        shopService.updateMyShopProfile(ownerId, updateReq);

        verify(validationService).validateLocation(argThat(dto ->
                "Maharashtra".equals(dto.getState()) &&
                "Pune".equals(dto.getDistrict()) &&
                "Pimpri-Chinchwad".equals(dto.getCity()) &&
                "411035".equals(dto.getPincode())
        ));
    }
}
