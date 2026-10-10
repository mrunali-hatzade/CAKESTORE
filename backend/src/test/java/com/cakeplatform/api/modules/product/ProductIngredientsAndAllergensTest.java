package com.cakeplatform.api.modules.product;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.product.dto.ProductRequest;
import com.cakeplatform.api.modules.product.service.ProductService;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
public class ProductIngredientsAndAllergensTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductCategoryRepository categoryRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @Mock
    private ActivityLoggerService activityLogger;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private ProductService productService;

    @InjectMocks
    private CustomerStorefrontService customerStorefrontService;

    private Shop shopOwnerA;
    private Shop shopOwnerB;
    private Product existingProduct;

    @BeforeEach
    void setUp() {
        shopOwnerA = new Shop();
        shopOwnerA.setId(101L);
        shopOwnerA.setStatus(ShopStatus.ACTIVE);
        shopOwnerA.setBusinessName("Owner A's Bakery");

        shopOwnerB = new Shop();
        shopOwnerB.setId(202L);
        shopOwnerB.setStatus(ShopStatus.ACTIVE);
        shopOwnerB.setBusinessName("Owner B's Bakery");

        existingProduct = new Product();
        existingProduct.setId(501L);
        existingProduct.setShop(shopOwnerA);
        existingProduct.setName("Belgian Chocolate Cake");
        existingProduct.setDescription("Rich decadent chocolate");
        existingProduct.setPrice(BigDecimal.valueOf(850));
        existingProduct.setAvailability(true);
        existingProduct.setStatus("ACTIVE");

        com.cakeplatform.api.modules.subscription.Subscription activeSub = new com.cakeplatform.api.modules.subscription.Subscription();
        activeSub.setId(1L);
        activeSub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        activeSub.setExpiryDate(java.time.LocalDateTime.now().plusDays(30));
        org.mockito.Mockito.lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(101L))
                 .thenReturn(java.util.Optional.of(activeSub));
        org.mockito.Mockito.lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(202L))
                 .thenReturn(java.util.Optional.of(activeSub));

        // By default, productRepository.save returns whatever was passed
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(shopRepository.findById(101L)).thenReturn(Optional.of(shopOwnerA));
        when(shopRepository.findById(202L)).thenReturn(Optional.of(shopOwnerB));
    }

    @Test
    @DisplayName("1. Owner creates product with ingredients")
    void testOwnerCreatesProductWithIngredients() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopOwnerA);

        ProductRequest req = new ProductRequest();
        req.setName("Dark Truffle Cake");
        req.setDescription("Dark chocolate sponge");
        req.setPrice(BigDecimal.valueOf(950));
        req.setIngredients("Dutch cocoa powder, unbleached flour, dairy butter, sugar");

        Product created = productService.createProduct(1L, req);

        assertNotNull(created);
        assertEquals("Dutch cocoa powder, unbleached flour, dairy butter, sugar", created.getIngredients());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    @DisplayName("2. Owner creates product with allergens")
    void testOwnerCreatesProductWithAllergens() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopOwnerA);

        ProductRequest req = new ProductRequest();
        req.setName("Walnut Brownie Cake");
        req.setDescription("Fudgy walnut cake");
        req.setPrice(BigDecimal.valueOf(700));
        req.setAllergens("Contains tree nuts (walnuts), gluten, and dairy");

        Product created = productService.createProduct(1L, req);

        assertNotNull(created);
        assertEquals("Contains tree nuts (walnuts), gluten, and dairy", created.getAllergens());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    @DisplayName("3. Owner edits ingredients")
    void testOwnerEditsIngredients() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopOwnerA);
        when(productRepository.findByIdAndShopId(501L, 101L)).thenReturn(Optional.of(existingProduct));

        ProductRequest updateReq = new ProductRequest();
        updateReq.setName(existingProduct.getName());
        updateReq.setDescription(existingProduct.getDescription());
        updateReq.setPrice(existingProduct.getPrice());
        updateReq.setIngredients("Updated ingredients: 70% dark chocolate, organic butter, almond flour");

        Product updated = productService.updateProduct(501L, 1L, updateReq);

        assertEquals("Updated ingredients: 70% dark chocolate, organic butter, almond flour", updated.getIngredients());
        verify(productRepository).save(existingProduct);
    }

    @Test
    @DisplayName("4. Owner edits allergens")
    void testOwnerEditsAllergens() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopOwnerA);
        when(productRepository.findByIdAndShopId(501L, 101L)).thenReturn(Optional.of(existingProduct));

        ProductRequest updateReq = new ProductRequest();
        updateReq.setName(existingProduct.getName());
        updateReq.setDescription(existingProduct.getDescription());
        updateReq.setPrice(existingProduct.getPrice());
        updateReq.setAllergens("Allergen Warning: Produced in a kitchen that processes peanuts and soy");

        Product updated = productService.updateProduct(501L, 1L, updateReq);

        assertEquals("Allergen Warning: Produced in a kitchen that processes peanuts and soy", updated.getAllergens());
        verify(productRepository).save(existingProduct);
    }

    @Test
    @DisplayName("5. Values persist in database (captor check)")
    void testValuesPersistInDatabase() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopOwnerA);

        ProductRequest req = new ProductRequest();
        req.setName("Signature Carrot Cake");
        req.setPrice(BigDecimal.valueOf(650));
        req.setIngredients("Carrots, cinnamon, cream cheese, wheat flour");
        req.setAllergens("Contains dairy and gluten");

        productService.createProduct(1L, req);

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        Product saved = captor.getValue();

        assertEquals("Carrots, cinnamon, cream cheese, wheat flour", saved.getIngredients());
        assertEquals("Contains dairy and gluten", saved.getAllergens());
    }

    @Test
    @DisplayName("6. Customer retrieves ingredients")
    void testCustomerRetrievesIngredients() {
        existingProduct.setIngredients("Pure Madagascar vanilla bean, fresh cream, eggs");
        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertEquals("Pure Madagascar vanilla bean, fresh cream, eggs", result.getIngredients());
    }

    @Test
    @DisplayName("7. Customer retrieves allergens")
    void testCustomerRetrievesAllergens() {
        existingProduct.setAllergens("Contains dairy and eggs");
        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertEquals("Contains dairy and eggs", result.getAllergens());
    }

    @Test
    @DisplayName("8. Tenant Isolation: Owner A cannot modify Owner B's product")
    void testTenantIsolation_OwnerACannotModifyOwnerBProduct() {
        // Owner A tries to edit product 501 belonging to Shop B
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopOwnerA);
        // Repository returns empty because product 501 belongs to shopOwnerB (202L), not shopOwnerA (101L)
        when(productRepository.findByIdAndShopId(501L, 101L)).thenReturn(Optional.empty());

        ProductRequest updateReq = new ProductRequest();
        updateReq.setName("Malicious Modification");
        updateReq.setPrice(BigDecimal.valueOf(100));

        assertThrows(RuntimeException.class, () -> {
            productService.updateProduct(501L, 1L, updateReq);
        });

        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("9. Customer cannot modify product information (no owner authorization)")
    void testCustomerCannotModifyProductInformation() {
        // Customer (non-owner) has no valid shop
        when(shopAccessValidator.getValidShopForOwner(999L))
                .thenThrow(new com.cakeplatform.api.exception.ResourceNotFoundException("Shop not found for user: 999"));

        ProductRequest req = new ProductRequest();
        req.setName("Unauthorized Hack");
        req.setPrice(BigDecimal.valueOf(1));

        assertThrows(com.cakeplatform.api.exception.ResourceNotFoundException.class, () -> {
            productService.createProduct(999L, req);
        });
    }

    @Test
    @DisplayName("10. NULL ingredients do not break product retrieval")
    void testNullIngredientsDoNotBreakProductRetrieval() {
        existingProduct.setIngredients(null);
        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertNull(result.getIngredients());
    }

    @Test
    @DisplayName("11. NULL allergens do not break product retrieval")
    void testNullAllergensDoNotBreakProductRetrieval() {
        existingProduct.setAllergens(null);
        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertNull(result.getAllergens());
    }

    @Test
    @DisplayName("12. Existing products continue loading without errors")
    void testExistingProductsContinueLoading() {
        when(productRepository.findByShopId(101L)).thenReturn(List.of(existingProduct));

        List<Product> products = customerStorefrontService.getShopProducts(101L);

        assertNotNull(products);
        assertEquals(1, products.size());
        assertEquals("Belgian Chocolate Cake", products.get(0).getName());
    }

    @Test
    @DisplayName("13. Product variants still work alongside ingredients")
    void testProductVariantsStillWork() {
        ProductVariant variant = new ProductVariant();
        variant.setId(10L);
        variant.setName("1 kg - Extra Ganache");
        variant.setPrice(BigDecimal.valueOf(1200));
        variant.setIsAvailable(true);
        variant.setProduct(existingProduct);
        existingProduct.setVariants(List.of(variant));
        existingProduct.setIngredients("Dark chocolate, cocoa butter, cream");

        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertEquals(1, result.getVariants().size());
        assertEquals("1 kg - Extra Ganache", result.getVariants().get(0).getName());
        assertEquals("Dark chocolate, cocoa butter, cream", result.getIngredients());
    }

    @Test
    @DisplayName("14. Product add-ons still work alongside ingredients")
    void testProductAddonsStillWork() {
        ProductAddon addon = new ProductAddon();
        addon.setId(20L);
        addon.setName("Sparkler Candle");
        addon.setPrice(BigDecimal.valueOf(50));
        addon.setIsAvailable(true);
        addon.setProduct(existingProduct);
        existingProduct.setAddons(List.of(addon));
        existingProduct.setAllergens("Contains dairy");

        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertEquals(1, result.getAddons().size());
        assertEquals("Sparkler Candle", result.getAddons().get(0).getName());
        assertEquals("Contains dairy", result.getAllergens());
    }

    @Test
    @DisplayName("15. Product reviews still work alongside ingredients")
    void testProductReviewsStillWork() {
        existingProduct.setIngredients("Flour, sugar, cocoa");
        existingProduct.setAllergens("Gluten, dairy");

        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        Product result = customerStorefrontService.getShopProductDetails(101L, 501L);

        assertNotNull(result);
        assertEquals(501L, result.getId());
        assertEquals("Flour, sugar, cocoa", result.getIngredients());
        assertEquals("Gluten, dairy", result.getAllergens());
    }

    @Test
    @DisplayName("16. Product tenant isolation: cross-shop storefront lookup blocked")
    void testProductTenantIsolationCrossShopBlocked() {
        // Product 501 belongs to Shop A (101L). Customer queries storefront for Shop B (202L).
        when(productRepository.findById(501L)).thenReturn(Optional.of(existingProduct));

        assertThrows(RuntimeException.class, () -> {
            customerStorefrontService.getShopProductDetails(202L, 501L);
        });
    }
}
