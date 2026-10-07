package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.BusinessType;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.storefront.dto.ProductEnquiryRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CustomerStorefrontDetailsTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private com.cakeplatform.api.modules.order.OrderRepository orderRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.CouponRepository couponRepository;

    @Mock
    private com.cakeplatform.api.modules.notification.NotificationService notificationService;

    @Mock
    private CustomCakeRequestRepository customCakeRequestRepository;

    @Mock
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private CustomerStorefrontService storefrontService;

    private Shop activeShop1;
    private Shop activeShop2;
    private Shop pendingShop;
    private Shop inactiveShop;
    private Shop suspendedShop;

    private Product product1;
    private Product product2;
    private Product productShop2;
    private Product unavailableProduct;

    @BeforeEach
    void setUp() {
        activeShop1 = new Shop();
        activeShop1.setId(6L);
        activeShop1.setBusinessName("Akurdi Artisan Bakes");
        activeShop1.setDescription("Handcrafted celebration cakes");
        activeShop1.setBusinessType(BusinessType.HOME_BAKERY);
        activeShop1.setStatus(ShopStatus.ACTIVE);
        activeShop1.setState("Maharashtra");
        activeShop1.setDistrict("Pune");
        activeShop1.setCity("Pimpri-Chinchwad");
        activeShop1.setArea("Akurdi");
        activeShop1.setPhone("+91 9876543210");
        activeShop1.setVerificationStatus(VerificationStatus.VERIFIED);
        activeShop1.setFssaiRegistration("FSSAI-12345678");
        activeShop1.setYearsInBusiness(5);

        activeShop2 = new Shop();
        activeShop2.setId(7L);
        activeShop2.setBusinessName("Ravet Cake Studio");
        activeShop2.setStatus(ShopStatus.ACTIVE);
        activeShop2.setBusinessType(BusinessType.CAKE_STUDIO);

        pendingShop = new Shop();
        pendingShop.setId(12L);
        pendingShop.setBusinessName("Pending Baker Akurdi");
        pendingShop.setStatus(ShopStatus.PENDING);

        inactiveShop = new Shop();
        inactiveShop.setId(13L);
        inactiveShop.setBusinessName("Inactive Studio Baner");
        inactiveShop.setStatus(ShopStatus.INACTIVE);

        suspendedShop = new Shop();
        suspendedShop.setId(14L);
        suspendedShop.setBusinessName("Suspended Cakes Wakad");
        suspendedShop.setStatus(ShopStatus.SUSPENDED);

        product1 = new Product();
        product1.setId(101L);
        product1.setShop(activeShop1);
        product1.setName("Belgian Dark Chocolate Truffle");
        product1.setPrice(new BigDecimal("650.00"));
        product1.setAvailability(true);
        product1.setStatus("ACTIVE");

        product2 = new Product();
        product2.setId(102L);
        product2.setShop(activeShop1);
        product2.setName("Fresh Mango Velvet Cake");
        product2.setPrice(new BigDecimal("720.00"));
        product2.setAvailability(true);
        product2.setStatus("ACTIVE");

        productShop2 = new Product();
        productShop2.setId(201L);
        productShop2.setShop(activeShop2);
        productShop2.setName("Rose Pistachio Tres Leches");
        productShop2.setPrice(new BigDecimal("850.00"));
        productShop2.setAvailability(true);
        productShop2.setStatus("ACTIVE");

        unavailableProduct = new Product();
        unavailableProduct.setId(103L);
        unavailableProduct.setShop(activeShop1);
        unavailableProduct.setName("Sold Out Pastry");
        unavailableProduct.setPrice(new BigDecimal("150.00"));
        unavailableProduct.setAvailability(false);
        unavailableProduct.setStatus("ACTIVE");
    }

    // ==========================================
    // Phase C & Storefront Shop / Products Tests
    // ==========================================

    @Test
    @DisplayName("1. Existing ACTIVE shop can be retrieved with real details")
    void testGetShopDetails_ActiveShop_Success() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));

        StorefrontShopResponse response = storefrontService.getShopDetails(6L);

        assertNotNull(response);
        assertEquals(6L, response.getId());
        assertEquals("Akurdi Artisan Bakes", response.getBusinessName());
        assertEquals(BusinessType.HOME_BAKERY, response.getBusinessType());
        assertEquals("ACTIVE", response.getStatus());
        assertEquals("Akurdi", response.getArea());
        assertEquals("+91 9876543210", response.getPhone());
        assertEquals("VERIFIED", response.getVerificationStatus());
        assertEquals(5, response.getYearsInBusiness());
    }

    @Test
    @DisplayName("2. Existing PENDING shop cannot be exposed publicly")
    void testGetShopDetails_PendingShop_ThrowsUnavailable() {
        when(shopRepository.findById(12L)).thenReturn(Optional.of(pendingShop));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopDetails(12L);
        });

        org.junit.jupiter.api.Assertions.assertTrue(exception.getMessage().contains("unavailable"));
    }

    @Test
    @DisplayName("3. Existing INACTIVE shop cannot be exposed publicly")
    void testGetShopDetails_InactiveShop_ThrowsUnavailable() {
        when(shopRepository.findById(13L)).thenReturn(Optional.of(inactiveShop));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopDetails(13L);
        });

        org.junit.jupiter.api.Assertions.assertTrue(exception.getMessage().contains("unavailable"));
    }

    @Test
    @DisplayName("4. Existing SUSPENDED shop cannot be exposed publicly")
    void testGetShopDetails_SuspendedShop_ThrowsUnavailable() {
        when(shopRepository.findById(14L)).thenReturn(Optional.of(suspendedShop));

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopDetails(14L);
        });

        org.junit.jupiter.api.Assertions.assertTrue(exception.getMessage().contains("unavailable"));
    }

    @Test
    @DisplayName("5. Existing shop active products are returned")
    void testGetShopProducts_ActiveShop_ReturnsProducts() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findByShopId(6L)).thenReturn(List.of(product1, product2, unavailableProduct));

        List<Product> products = storefrontService.getShopProducts(6L);

        assertNotNull(products);
        assertEquals(2, products.size());
        assertEquals("Belgian Dark Chocolate Truffle", products.get(0).getName());
        assertEquals("Fresh Mango Velvet Cake", products.get(1).getName());
    }

    @Test
    @DisplayName("6. Products from another bakery are not returned")
    void testGetShopProducts_IsolatedPerBakery() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findByShopId(6L)).thenReturn(List.of(product1, product2));

        when(shopRepository.findById(7L)).thenReturn(Optional.of(activeShop2));
        when(productRepository.findByShopId(7L)).thenReturn(List.of(productShop2));

        List<Product> shop1Products = storefrontService.getShopProducts(6L);
        List<Product> shop2Products = storefrontService.getShopProducts(7L);

        assertEquals(2, shop1Products.size());
        assertEquals(1, shop2Products.size());
        assertFalse(shop1Products.stream().anyMatch(p -> p.getName().equals("Rose Pistachio Tres Leches")));
        assertTrue(shop2Products.stream().anyMatch(p -> p.getName().equals("Rose Pistachio Tres Leches")));
    }

    @Test
    @DisplayName("7. Non-existent shop returns not-found response")
    void testGetShopDetails_NotFound() {
        when(shopRepository.findById(9999L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopDetails(9999L);
        });

        assertEquals("Shop not found", exception.getMessage());
    }

    @Test
    @DisplayName("8. Product empty state works correctly (returns empty list without error)")
    void testGetShopProducts_EmptyProducts_ReturnsEmptyList() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findByShopId(6L)).thenReturn(Collections.emptyList());

        List<Product> products = storefrontService.getShopProducts(6L);

        assertNotNull(products);
        assertTrue(products.isEmpty());
    }

    // ==========================================
    // Phase D: Product Detail & Security Tests
    // ==========================================

    @Test
    @DisplayName("Phase D - 1. Valid product retrieval returns product details")
    void testGetShopProductDetails_ValidProduct() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(101L)).thenReturn(Optional.of(product1));

        Product product = storefrontService.getShopProductDetails(6L, 101L);

        assertNotNull(product);
        assertEquals(101L, product.getId());
        assertEquals("Belgian Dark Chocolate Truffle", product.getName());
        assertEquals(new BigDecimal("650.00"), product.getPrice());
        assertTrue(product.getAvailability());
    }

    @Test
    @DisplayName("Phase D - 2. Non-existent product throws not found")
    void testGetShopProductDetails_NonExistentProduct() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(9999L)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopProductDetails(6L, 9999L);
        });

        assertEquals("Product not found", ex.getMessage());
    }

    @Test
    @DisplayName("Phase D - 3. Product belonging to another shop is rejected")
    void testGetShopProductDetails_ProductBelongsToAnotherShop() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(201L)).thenReturn(Optional.of(productShop2)); // productShop2 belongs to activeShop2 (7L)

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopProductDetails(6L, 201L);
        });

        assertEquals("Product does not belong to this bakery", ex.getMessage());
    }

    @Test
    @DisplayName("Phase D - 4. Inactive shop product detail is protected")
    void testGetShopProductDetails_InactiveShop_ThrowsUnavailable() {
        when(shopRepository.findById(13L)).thenReturn(Optional.of(inactiveShop));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopProductDetails(13L, 101L);
        });

        assertEquals("Shop is currently unavailable", ex.getMessage());
    }

    @Test
    @DisplayName("Phase D - 5. Suspended shop product detail is protected")
    void testGetShopProductDetails_SuspendedShop_ThrowsUnavailable() {
        when(shopRepository.findById(14L)).thenReturn(Optional.of(suspendedShop));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopProductDetails(14L, 101L);
        });

        assertEquals("Shop is currently unavailable", ex.getMessage());
    }

    @Test
    @DisplayName("Phase D - 6. Pending shop product detail is protected")
    void testGetShopProductDetails_PendingShop_ThrowsUnavailable() {
        when(shopRepository.findById(12L)).thenReturn(Optional.of(pendingShop));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopProductDetails(12L, 101L);
        });

        org.junit.jupiter.api.Assertions.assertTrue(ex.getMessage().contains("unavailable"));
    }

    @Test
    @DisplayName("Phase D - Product availability protection (unavailable product is rejected)")
    void testGetShopProductDetails_UnavailableProduct_ThrowsUnavailable() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(103L)).thenReturn(Optional.of(unavailableProduct));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.getShopProductDetails(6L, 103L);
        });

        assertEquals("Product is currently unavailable", ex.getMessage());
    }

    // ==========================================
    // Phase D: Customer Enquiry Tests
    // ==========================================

    @Test
    @DisplayName("Phase D - 7. Valid enquiry creation saves to custom_cake_requests")
    void testSubmitProductEnquiry_Success() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(101L)).thenReturn(Optional.of(product1));

        ProductEnquiryRequest request = new ProductEnquiryRequest();
        request.setShopId(6L);
        request.setProductId(101L);
        request.setCustomerName("Aditi Sharma");
        request.setCustomerPhone("+91 9823456789");
        request.setCustomerEmail("aditi@example.com");
        request.setQuantity(2);
        request.setPreferredDate(LocalDate.now().plusDays(3));
        request.setMessage("Please write 'Happy 30th Birthday' on the cake.");

        CustomCakeRequest mockSaved = new CustomCakeRequest();
        mockSaved.setId(1L);
        mockSaved.setCustomerName("Aditi Sharma");
        mockSaved.setCustomerEmail("aditi@example.com");
        mockSaved.setCustomerMobile("+91 9823456789");
        mockSaved.setCakeType("Belgian Dark Chocolate Truffle");
        mockSaved.setServings(2);
        mockSaved.setBudget(new BigDecimal("1300.00"));
        mockSaved.setStatus("PENDING");

        when(customCakeRequestRepository.save(any(CustomCakeRequest.class))).thenReturn(mockSaved);

        CustomCakeRequest result = storefrontService.submitProductEnquiry(request);

        assertNotNull(result);
        assertEquals("Aditi Sharma", result.getCustomerName());
        assertEquals("Belgian Dark Chocolate Truffle", result.getCakeType());
        assertEquals(2, result.getServings());
        assertEquals(new BigDecimal("1300.00"), result.getBudget());
        assertEquals("PENDING", result.getStatus());
        verify(customCakeRequestRepository, times(1)).save(any(CustomCakeRequest.class));
    }

    @Test
    @DisplayName("Phase D - 8. Invalid product in enquiry throws not found")
    void testSubmitProductEnquiry_InvalidProduct_ThrowsNotFound() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(9999L)).thenReturn(Optional.empty());

        ProductEnquiryRequest request = new ProductEnquiryRequest();
        request.setShopId(6L);
        request.setProductId(9999L);
        request.setCustomerName("Aditi Sharma");
        request.setCustomerPhone("+91 9823456789");
        request.setCustomerEmail("aditi@example.com");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.submitProductEnquiry(request);
        });

        assertEquals("Product not found", ex.getMessage());
        verify(customCakeRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Phase D - 9. Product/shop mismatch in enquiry is rejected")
    void testSubmitProductEnquiry_ProductShopMismatch_ThrowsException() {
        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(201L)).thenReturn(Optional.of(productShop2)); // productShop2 belongs to Shop 7

        ProductEnquiryRequest request = new ProductEnquiryRequest();
        request.setShopId(6L);
        request.setProductId(201L);
        request.setCustomerName("Aditi Sharma");
        request.setCustomerPhone("+91 9823456789");
        request.setCustomerEmail("aditi@example.com");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.submitProductEnquiry(request);
        });

        assertEquals("Product does not belong to this bakery", ex.getMessage());
        verify(customCakeRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Phase D - 10. Inactive shop enquiry is rejected")
    void testSubmitProductEnquiry_InactiveShop_ThrowsUnavailable() {
        when(shopRepository.findById(13L)).thenReturn(Optional.of(inactiveShop));

        ProductEnquiryRequest request = new ProductEnquiryRequest();
        request.setShopId(13L);
        request.setProductId(101L);
        request.setCustomerName("Aditi Sharma");
        request.setCustomerPhone("+91 9823456789");
        request.setCustomerEmail("aditi@example.com");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> {
            storefrontService.submitProductEnquiry(request);
        });

        assertEquals("Shop is currently unavailable", ex.getMessage());
        verify(customCakeRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Phase D - 11. Controller endpoint getShopProductDetails and submitEnquiry integration")
    void testControllers_PhaseDEndpoints() {
        CustomerStorefrontController storefrontController = new CustomerStorefrontController(storefrontService);
        CustomerStorefrontEnquiryController enquiryController = new CustomerStorefrontEnquiryController(storefrontService);

        when(shopRepository.findById(6L)).thenReturn(Optional.of(activeShop1));
        when(productRepository.findById(101L)).thenReturn(Optional.of(product1));

        // Test GET /{shopId}/products/{productId}
        ResponseEntity<Product> productResp = storefrontController.getShopProductDetails(6L, 101L);
        assertNotNull(productResp.getBody());
        assertEquals("Belgian Dark Chocolate Truffle", productResp.getBody().getName());

        // Test POST /api/storefront/enquiries
        ProductEnquiryRequest req = new ProductEnquiryRequest();
        req.setShopId(6L);
        req.setProductId(101L);
        req.setCustomerName("Rahul Verma");
        req.setCustomerPhone("+91 9999888877");
        req.setCustomerEmail("rahul@example.com");

        CustomCakeRequest mockSaved = new CustomCakeRequest();
        mockSaved.setId(2L);
        mockSaved.setCustomerName("Rahul Verma");
        when(customCakeRequestRepository.save(any(CustomCakeRequest.class))).thenReturn(mockSaved);

        ResponseEntity<CustomCakeRequest> enquiryResp = enquiryController.submitEnquiry(req);
        assertNotNull(enquiryResp.getBody());
        assertEquals("Rahul Verma", enquiryResp.getBody().getCustomerName());
    }
}
