package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.shop.BusinessType;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.storefront.dto.PopularCityDTO;
import com.cakeplatform.api.modules.storefront.dto.PopularCityProjection;
import com.cakeplatform.api.modules.storefront.dto.ShopSummaryProjection;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopSummaryDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StorefrontLocationDiscoveryTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private com.cakeplatform.api.modules.product.ProductRepository productRepository;

    @Mock
    private com.cakeplatform.api.modules.order.OrderRepository orderRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.CouponRepository couponRepository;

    @Mock
    private com.cakeplatform.api.modules.notification.NotificationService notificationService;

    @Mock
    private com.cakeplatform.api.modules.notification.AdminNotificationService adminNotificationService;

    @Mock
    private com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository customCakeRequestRepository;

    @Mock
    private com.cakeplatform.api.modules.product.ProductCategoryRepository categoryRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository deliverySlotRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.ShopBannerRepository shopBannerRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.ShopBusinessHoursRepository shopBusinessHoursRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.ShopDeliveryConfigRepository shopDeliveryConfigRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.ShopStorefrontSettingsRepository shopStorefrontSettingsRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.ShopCustomFormFieldRepository shopCustomFormFieldRepository;

    @Mock
    private com.cakeplatform.api.modules.interaction.FeedbackRepository feedbackRepository;

    @Mock
    private com.cakeplatform.api.modules.review.ProductReviewRepository productReviewRepository;

    @InjectMocks
    private CustomerStorefrontService storefrontService;

    private ShopSummaryProjection mockNearbyShop;
    private ShopSummaryProjection mockHierarchyShopNullCoords;

    @BeforeEach
    void setUp() {
        mockNearbyShop = createMockProjection(
                1L, "Pune Crust & Crumb", "Artisan sourdough and celebration cakes",
                "HOME_BAKERY", "Cakes", "logo1.png", "cover1.png",
                "FC Road, Pune", "Lane 1", "Shop 2", "Shivajinagar", "Pune", "Pune",
                "Maharashtra", "411005", 18.5204, 73.8567, "ACTIVE",
                "VERIFIED", 4.8, 42L, 2.34
        );

        mockHierarchyShopNullCoords = createMockProjection(
                2L, "Heritage Bakery", "Traditional tea cakes",
                "BAKERY", "Bakery", "logo2.png", "cover2.png",
                "Main Bazaar", "Shop 5", null, "Old Town", "Nagpur", "Nagpur",
                "Maharashtra", "440001", null, null, "ACTIVE",
                "VERIFIED", 4.5, 12L, null
        );
    }

    private ShopSummaryProjection createMockProjection(
            Long id, String name, String desc, String bType, String bCat,
            String logo, String cover, String addr, String addr1, String addr2,
            String area, String city, String district, String state, String pincode,
            Double lat, Double lng, String status, String vStatus,
            Double avgRating, Long totalReviews, Double distanceKm
    ) {
        ShopSummaryProjection p = mock(ShopSummaryProjection.class);
        lenient().when(p.getId()).thenReturn(id);
        lenient().when(p.getBusinessName()).thenReturn(name);
        lenient().when(p.getDescription()).thenReturn(desc);
        lenient().when(p.getBusinessType()).thenReturn(bType);
        lenient().when(p.getBusinessCategory()).thenReturn(bCat);
        lenient().when(p.getLogoUrl()).thenReturn(logo);
        lenient().when(p.getCoverImageUrl()).thenReturn(cover);
        lenient().when(p.getAddress()).thenReturn(addr);
        lenient().when(p.getAddressLine1()).thenReturn(addr1);
        lenient().when(p.getAddressLine2()).thenReturn(addr2);
        lenient().when(p.getArea()).thenReturn(area);
        lenient().when(p.getCity()).thenReturn(city);
        lenient().when(p.getDistrict()).thenReturn(district);
        lenient().when(p.getState()).thenReturn(state);
        lenient().when(p.getPincode()).thenReturn(pincode);
        lenient().when(p.getLatitude()).thenReturn(lat);
        lenient().when(p.getLongitude()).thenReturn(lng);
        lenient().when(p.getStatus()).thenReturn(status);
        lenient().when(p.getVerificationStatus()).thenReturn(vStatus);
        lenient().when(p.getAvgRating()).thenReturn(avgRating);
        lenient().when(p.getTotalReviews()).thenReturn(totalReviews);
        lenient().when(p.getDistanceKm()).thenReturn(distanceKm);
        return p;
    }

    @Test
    @DisplayName("1. Nearby Search: Computes bounding box and calls findNearbyActiveShops")
    void testNearbySearch_BoundingBoxAndDistance() {
        when(shopRepository.findNearbyActiveShops(
                eq(18.5204), eq(73.8567), anyDouble(), anyDouble(), anyDouble(), anyDouble(),
                eq(10.0), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                eq("distance"), eq(20), eq(0)
        )).thenReturn(List.of(mockNearbyShop));

        when(shopRepository.countNearbyActiveShops(
                eq(18.5204), eq(73.8567), anyDouble(), anyDouble(), anyDouble(), anyDouble(),
                eq(10.0), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()
        )).thenReturn(1L);

        Page<StorefrontShopSummaryDTO> page = storefrontService.discoverShopsPaged(
                "India", null, null, null, null, null, null, null, null,
                18.5204, 73.8567, 10.0, "distance", 0, 20
        );

        assertNotNull(page);
        assertEquals(1, page.getTotalElements());
        StorefrontShopSummaryDTO shop = page.getContent().get(0);
        assertEquals("Pune Crust & Crumb", shop.getBusinessName());
        assertEquals(18.5204, shop.getLatitude());
        assertEquals(73.8567, shop.getLongitude());
        assertEquals(2.34, shop.getDistanceKm());
        assertEquals(4.8, shop.getAverageRating());
        assertEquals(42L, shop.getTotalReviews());
        assertEquals(BusinessType.HOME_BAKERY, shop.getBusinessType());

        // Verify bounding box calculation arguments
        ArgumentCaptor<Double> minLatCaptor = ArgumentCaptor.forClass(Double.class);
        ArgumentCaptor<Double> maxLatCaptor = ArgumentCaptor.forClass(Double.class);
        verify(shopRepository).findNearbyActiveShops(
                eq(18.5204), eq(73.8567), minLatCaptor.capture(), maxLatCaptor.capture(),
                anyDouble(), anyDouble(), eq(10.0), any(), any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt()
        );
        assertTrue(minLatCaptor.getValue() < 18.5204);
        assertTrue(maxLatCaptor.getValue() > 18.5204);
    }

    @Test
    @DisplayName("2. Hierarchy / Text Search: Includes shops with NULL coordinates with distanceKm = null")
    void testHierarchySearch_IncludesNullCoordsShops() {
        when(shopRepository.findActiveShopsWithSummary(
                eq("Nagpur"), eq("Maharashtra"), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull(), eq("rating"), eq(20), eq(0)
        )).thenReturn(List.of(mockHierarchyShopNullCoords));

        when(shopRepository.countActiveShops(
                eq("Nagpur"), eq("Maharashtra"), isNull(), isNull(), isNull(),
                isNull(), isNull(), isNull()
        )).thenReturn(1L);

        Page<StorefrontShopSummaryDTO> page = storefrontService.discoverShopsPaged(
                "India", "Maharashtra", null, "Nagpur", null, null, null, null, null,
                null, null, null, "rating", 0, 20
        );

        assertNotNull(page);
        assertEquals(1, page.getTotalElements());
        StorefrontShopSummaryDTO shop = page.getContent().get(0);
        assertEquals("Heritage Bakery", shop.getBusinessName());
        assertNull(shop.getLatitude());
        assertNull(shop.getLongitude());
        assertNull(shop.getDistanceKm());
        assertEquals("Nagpur", shop.getCity());
        assertEquals(4.5, shop.getAverageRating());
        assertEquals(12L, shop.getTotalReviews());
    }

    @Test
    @DisplayName("3. Zero N+1 Queries: Exactly 1 data query + 1 count query issued, zero per-shop queries")
    void testZeroNPlusOneQueries() {
        when(shopRepository.findActiveShopsWithSummary(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt()
        )).thenReturn(List.of(mockNearbyShop, mockHierarchyShopNullCoords));

        when(shopRepository.countActiveShops(
                any(), any(), any(), any(), any(), any(), any(), any()
        )).thenReturn(2L);

        Page<StorefrontShopSummaryDTO> page = storefrontService.discoverShopsPaged(
                null, null, null, null, null, null, null, null, null,
                null, null, null, null, 0, 20
        );

        assertEquals(2, page.getContent().size());

        // Verify exactly 1 data query + 1 count query were called on shopRepository
        verify(shopRepository, times(1)).findActiveShopsWithSummary(any(), any(), any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt());
        verify(shopRepository, times(1)).countActiveShops(any(), any(), any(), any(), any(), any(), any(), any());

        // Verify ZERO per-shop repository calls were made
        verifyNoInteractions(shopBannerRepository);
        verifyNoInteractions(shopBusinessHoursRepository);
        verifyNoInteractions(shopDeliveryConfigRepository);
        verifyNoInteractions(shopStorefrontSettingsRepository);
        verifyNoInteractions(shopCustomFormFieldRepository);
        verifyNoInteractions(feedbackRepository);
    }

    @Test
    @DisplayName("4. Popular Cities: Returns active counts grouped by city and caches for 15 minutes")
    void testPopularCities_CachingAndAggregation() {
        PopularCityProjection city1 = mock(PopularCityProjection.class);
        when(city1.getCityName()).thenReturn("Pune");
        when(city1.getStateName()).thenReturn("Maharashtra");
        when(city1.getActiveBakeryCount()).thenReturn(25L);

        PopularCityProjection city2 = mock(PopularCityProjection.class);
        when(city2.getCityName()).thenReturn("Mumbai");
        when(city2.getStateName()).thenReturn("Maharashtra");
        when(city2.getActiveBakeryCount()).thenReturn(18L);

        when(shopRepository.findPopularCities()).thenReturn(List.of(city1, city2));

        // First call - should hit repository
        List<PopularCityDTO> results1 = storefrontService.getPopularCities(10);
        assertEquals(2, results1.size());
        assertEquals("Pune", results1.get(0).getCityName());
        assertEquals(25L, results1.get(0).getActiveBakeryCount());

        // Second call - should return from in-memory 15-minute cache
        List<PopularCityDTO> results2 = storefrontService.getPopularCities(10);
        assertEquals(2, results2.size());
        assertEquals("Pune", results2.get(0).getCityName());

        // Verify repository findPopularCities was called EXACTLY ONCE despite two invocations
        verify(shopRepository, times(1)).findPopularCities();
    }

    @Test
    @DisplayName("5. Controller: Dual routing and pagination support")
    void testController_SearchEndpoints() {
        CustomerStorefrontController controller = new CustomerStorefrontController(storefrontService);

        when(shopRepository.findActiveShopsWithSummary(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), anyInt(), anyInt()
        )).thenReturn(List.of(mockNearbyShop));

        when(shopRepository.countActiveShops(
                any(), any(), any(), any(), any(), any(), any(), any()
        )).thenReturn(1L);

        // When page is specified, controller returns Page
        ResponseEntity<?> pagedResponse = controller.searchShops(
                "Maharashtra", "Pune", "Pune", "Shivajinagar", "411005", "India",
                "HOME_BAKERY", "crust", null, null, null, 10.0, "rating", 0, 10
        );
        assertNotNull(pagedResponse.getBody());
        assertTrue(pagedResponse.getBody() instanceof Page<?>);
        Page<?> pagedResult = (Page<?>) pagedResponse.getBody();
        assertEquals(1, pagedResult.getTotalElements());

        // When page is null, controller returns List
        ResponseEntity<?> listResponse = controller.searchShops(
                "Maharashtra", "Pune", "Pune", "Shivajinagar", "411005", "India",
                "HOME_BAKERY", "crust", null, null, null, 10.0, "rating", null, 20
        );
        assertNotNull(listResponse.getBody());
        assertTrue(listResponse.getBody() instanceof List<?>);
        List<?> listResult = (List<?>) listResponse.getBody();
        assertEquals(1, listResult.size());
    }

    @Test
    @DisplayName("6. Controller: Popular cities endpoint")
    void testController_PopularCitiesEndpoint() {
        CustomerStorefrontController controller = new CustomerStorefrontController(storefrontService);

        PopularCityProjection city = mock(PopularCityProjection.class);
        when(city.getCityName()).thenReturn("Pune");
        when(city.getStateName()).thenReturn("Maharashtra");
        when(city.getActiveBakeryCount()).thenReturn(5L);
        when(shopRepository.findPopularCities()).thenReturn(List.of(city));

        ResponseEntity<List<PopularCityDTO>> response = controller.getPopularCities(5);
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals("Pune", response.getBody().get(0).getCityName());
    }
}
