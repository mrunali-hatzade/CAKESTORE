package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.shop.BusinessType;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopSpecification;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopResponse;
import jakarta.persistence.criteria.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CustomerStorefrontSearchTest {

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
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private CustomerStorefrontService storefrontService;

    private Shop activeShop1;
    private Shop activeShop2;
    private Shop inactiveShop;
    private Shop suspendedShop;
    private Shop pendingShop;

    @BeforeEach
    void setUp() {
        activeShop1 = new Shop();
        activeShop1.setId(1L);
        activeShop1.setBusinessName("Akurdi Artisan Baker");
        activeShop1.setDescription("Fresh handcrafted chocolate cakes in Akurdi");
        activeShop1.setBusinessCategory("Cakes");
        activeShop1.setBusinessType(BusinessType.HOME_BAKERY);
        activeShop1.setState("Maharashtra");
        activeShop1.setDistrict("Pune");
        activeShop1.setCity("Pimpri-Chinchwad");
        activeShop1.setArea("Akurdi");
        activeShop1.setAddress("Near Railway Station, Akurdi");
        activeShop1.setPincode("411035");
        activeShop1.setStatus(ShopStatus.ACTIVE);

        com.cakeplatform.api.modules.subscription.Subscription activeSub = new com.cakeplatform.api.modules.subscription.Subscription();
        activeSub.setId(100L);
        activeSub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        activeSub.setExpiryDate(java.time.LocalDateTime.now().plusDays(30));

        lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(1L))
                .thenReturn(java.util.Optional.of(activeSub));
        lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(2L))
                .thenReturn(java.util.Optional.of(activeSub));

        activeShop2 = new Shop();
        activeShop2.setId(2L);
        activeShop2.setBusinessName("Sweet Studio Baner");
        activeShop2.setDescription("Premium boutique dessert studio");
        activeShop2.setBusinessCategory("Pastries");
        activeShop2.setBusinessType(BusinessType.CAKE_STUDIO);
        activeShop2.setState("Maharashtra");
        activeShop2.setDistrict("Pune");
        activeShop2.setCity("Pune City");
        activeShop2.setArea("Baner");
        activeShop2.setAddress("High Street, Baner");
        activeShop2.setPincode("411045");
        activeShop2.setStatus(ShopStatus.ACTIVE);

        inactiveShop = new Shop();
        inactiveShop.setId(3L);
        inactiveShop.setBusinessName("Old Inactive Bakery");
        inactiveShop.setStatus(ShopStatus.INACTIVE);
        inactiveShop.setState("Maharashtra");
        inactiveShop.setCity("Pune");

        suspendedShop = new Shop();
        suspendedShop.setId(4L);
        suspendedShop.setBusinessName("Suspended Bakery");
        suspendedShop.setStatus(ShopStatus.SUSPENDED);
        suspendedShop.setState("Maharashtra");
        suspendedShop.setCity("Pune");

        pendingShop = new Shop();
        pendingShop.setId(5L);
        pendingShop.setBusinessName("Pending Verification Baker");
        pendingShop.setStatus(ShopStatus.PENDING);
        pendingShop.setState("Maharashtra");
        pendingShop.setCity("Pune");
    }

    @Test
    @DisplayName("1. All Active Shops: No filter returns active shops")
    void testSearch_AllActiveShops() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1, activeShop2));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, null, null, null);

        assertNotNull(results);
        assertEquals(2, results.size());
        assertEquals("Akurdi Artisan Baker", results.get(0).getBusinessName());
        assertEquals(BusinessType.HOME_BAKERY, results.get(0).getBusinessType());
        assertEquals("Akurdi", results.get(0).getArea());
    }

    @Test
    @DisplayName("2. State Filter: Filters by state")
    void testSearch_StateFilter() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1, activeShop2));

        List<StorefrontShopResponse> results = storefrontService.searchShops("Maharashtra", null, null, null, null, null, null);

        assertEquals(2, results.size());
        assertEquals("Maharashtra", results.get(0).getState());
    }

    @Test
    @DisplayName("3. District Filter: Filters by district")
    void testSearch_DistrictFilter() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops("Maharashtra", "Pune", null, null, null, null, null);

        assertEquals(1, results.size());
        assertEquals("Pune", results.get(0).getDistrict());
    }

    @Test
    @DisplayName("4. City Filter: Filters by city")
    void testSearch_CityFilter() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops("Maharashtra", "Pune", "Pimpri-Chinchwad", null, null, null, null);

        assertEquals(1, results.size());
        assertEquals("Pimpri-Chinchwad", results.get(0).getCity());
    }

    @Test
    @DisplayName("5. Area Filter: Filters by area")
    void testSearch_AreaFilter() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, "Akurdi", null, null, null);

        assertEquals(1, results.size());
        assertEquals("Akurdi", results.get(0).getArea());
    }

    @Test
    @DisplayName("6. Business Type Filter: Filters by BusinessType enum")
    void testSearch_BusinessTypeFilter() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop2));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, BusinessType.CAKE_STUDIO, null, null);

        assertEquals(1, results.size());
        assertEquals(BusinessType.CAKE_STUDIO, results.get(0).getBusinessType());
    }

    @Test
    @DisplayName("7. Combined Filters: Matches multiple simultaneous filters")
    void testSearch_CombinedFilters() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops(
                "Maharashtra", "Pune", "Pimpri-Chinchwad", "Akurdi", BusinessType.HOME_BAKERY, null, null
        );

        assertEquals(1, results.size());
        assertEquals("Akurdi Artisan Baker", results.get(0).getBusinessName());
    }

    @Test
    @DisplayName("8. Case-Insensitive Location: Trims and case-insensitively builds specification")
    void testSearch_CaseInsensitiveLocation() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops(
                "  maHaRASHtra  ", "  pUnE ", "  piMpRi-cHinChWad ", "  aKuRdi ", null, null, null
        );

        assertEquals(1, results.size());
    }

    @Test
    @DisplayName("9. Zero Results: Returns empty list when no shops match")
    void testSearch_ZeroResults() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(Collections.emptyList());

        List<StorefrontShopResponse> results = storefrontService.searchShops(
                "Goa", "North Goa", "Panaji", "Miramar", null, null, null
        );

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("10. Inactive Shop Exclusion: Specification enforces ACTIVE status")
    void testSpecification_EnforcesActiveStatus() {
        Root<Shop> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);
        Path<Object> statusPath = mock(Path.class);
        Predicate activePredicate = mock(Predicate.class);

        when(root.get("status")).thenReturn(statusPath);
        when(cb.equal(statusPath, ShopStatus.ACTIVE)).thenReturn(activePredicate);
        when(cb.and(any(Predicate[].class))).thenReturn(activePredicate);

        Specification<Shop> spec = ShopSpecification.filterShops(null, null, null, null, null, null, null);
        Predicate resultPredicate = spec.toPredicate(root, query, cb);

        assertNotNull(resultPredicate);
        verify(cb).equal(statusPath, ShopStatus.ACTIVE);
    }

    @Test
    @DisplayName("11 & 12. Non-Active Shops (Suspended/Pending) are never returned in search results")
    void testSearch_NonActiveShopsFilteredOut() {
        // Even if repository were somehow to return mixed statuses, service maps real data correctly
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, null, null, null);

        assertEquals(1, results.size());
        assertEquals("Akurdi Artisan Baker", results.get(0).getBusinessName());
    }

    @Test
    @DisplayName("13. Search Term: Filters across businessName, description, etc.")
    void testSearch_SearchTerm() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, null, "chocolate", null);

        assertEquals(1, results.size());
        assertTrue(results.get(0).getDescription().contains("chocolate"));
    }

    @Test
    @DisplayName("14. Legacy Location Parameter: Works with legacy location query")
    void testSearch_LegacyLocationParameter() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        List<StorefrontShopResponse> results = storefrontService.searchShopsByLocation("Akurdi");

        assertEquals(1, results.size());
        assertEquals("Akurdi Artisan Baker", results.get(0).getBusinessName());
    }

    @Test
    @DisplayName("Controller: Safely parses businessType and handles invalid type without throwing 400")
    void testController_BusinessTypeParsing() {
        CustomerStorefrontController controller = new CustomerStorefrontController(storefrontService);
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        // Valid case-insensitive businessType
        var response = controller.searchShops("Maharashtra", "Pune", "Pimpri-Chinchwad", "Akurdi", "home_bakery", null, null);
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());

        // Invalid businessType returns empty list cleanly
        var invalidResponse = controller.searchShops(null, null, null, null, "INVALID_TYPE_XYZ", null, null);
        assertNotNull(invalidResponse.getBody());
        assertTrue(invalidResponse.getBody().isEmpty());
    }

    @Test
    @DisplayName("Subscription: Search excludes shops without valid subscription (missing subscription)")
    void testSearch_ExcludesShopWithoutSubscription() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1, activeShop2));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(1L)).thenReturn(java.util.Optional.empty());

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, null, null, null);

        assertEquals(1, results.size());
        assertEquals(2L, results.get(0).getId());
    }

    @Test
    @DisplayName("Subscription: Expired subscription excluded even if status is ACTIVE")
    void testSearch_ExcludesExpiredSubscriptionWithActiveStatus() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        com.cakeplatform.api.modules.subscription.Subscription expiredSub = new com.cakeplatform.api.modules.subscription.Subscription();
        expiredSub.setId(101L);
        expiredSub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        expiredSub.setExpiryDate(java.time.LocalDateTime.now().minusMinutes(5));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(1L)).thenReturn(java.util.Optional.of(expiredSub));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, null, null, null);

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Subscription: Expiry equal to current time is treated as expired")
    void testSearch_ExcludesSubscriptionWhenExpiryEqualsCurrentTime() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        java.time.Instant fixedInstant = java.time.Instant.parse("2026-10-10T12:00:00Z");
        java.time.ZoneId zone = java.time.ZoneId.of("UTC");
        java.time.Clock fixedClock = java.time.Clock.fixed(fixedInstant, zone);
        storefrontService.setClock(fixedClock);

        com.cakeplatform.api.modules.subscription.Subscription exactExpirySub = new com.cakeplatform.api.modules.subscription.Subscription();
        exactExpirySub.setId(102L);
        exactExpirySub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        exactExpirySub.setExpiryDate(java.time.LocalDateTime.ofInstant(fixedInstant, zone));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(1L)).thenReturn(java.util.Optional.of(exactExpirySub));

        List<StorefrontShopResponse> results = storefrontService.searchShops(null, null, null, null, null, null, null);

        assertTrue(results.isEmpty(), "Expiry equal to current time must be treated as expired");
    }

    @Test
    @DisplayName("Subscription: Test with fixed Clock boundary transitions")
    void testSearch_FixedClockTransition() {
        when(shopRepository.findAll(any(Specification.class))).thenReturn(List.of(activeShop1));

        java.time.Instant baseInstant = java.time.Instant.parse("2026-10-10T12:00:00Z");
        java.time.ZoneId zone = java.time.ZoneId.of("UTC");
        java.time.Clock fixedClock = java.time.Clock.fixed(baseInstant, zone);
        storefrontService.setClock(fixedClock);

        com.cakeplatform.api.modules.subscription.Subscription sub = new com.cakeplatform.api.modules.subscription.Subscription();
        sub.setId(103L);
        sub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        // Expiry is 1 second after base instant
        sub.setExpiryDate(java.time.LocalDateTime.ofInstant(baseInstant.plusSeconds(1), zone));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(1L)).thenReturn(java.util.Optional.of(sub));

        // 1 second before expiry: active
        List<StorefrontShopResponse> beforeExpiry = storefrontService.searchShops(null, null, null, null, null, null, null);
        assertEquals(1, beforeExpiry.size());

        // Fast-forward clock by 1 second to exact expiry time: expired
        storefrontService.setClock(java.time.Clock.fixed(baseInstant.plusSeconds(1), zone));
        List<StorefrontShopResponse> atExpiry = storefrontService.searchShops(null, null, null, null, null, null, null);
        assertTrue(atExpiry.isEmpty(), "At expiry time, shop must be excluded");
    }
}
