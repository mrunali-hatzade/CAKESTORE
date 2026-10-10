package com.cakeplatform.api.modules.product.service;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.product.dto.ProductRequest;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.storefront.StorefrontCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;
    
    @Mock
    private com.cakeplatform.api.modules.product.ProductCategoryRepository categoryRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @Mock
    private ActivityLoggerService activityLogger;

    @Mock
    private StorefrontCacheService storefrontCacheService;

    @InjectMocks
    private ProductService productService;

    private Shop shop;
    private final Long OWNER_ID = 1L;
    private final Long SHOP_ID = 10L;

    @BeforeEach
    void setUp() {
        shop = new Shop();
        shop.setId(SHOP_ID);
        shop.setBusinessName("Test Bakery");
    }

    @Test
    @DisplayName("Create product validates basic fields, variants, highlights, and evicts cache")
    void testCreateProduct() {
        when(shopAccessValidator.getValidShopForOwner(OWNER_ID)).thenReturn(shop);
        when(productRepository.save(any(Product.class))).thenAnswer(i -> {
            Product p = i.getArgument(0);
            p.setId(100L);
            return p;
        });

        ProductRequest req = new ProductRequest();
        req.setName("Cake");
        req.setPrice(new BigDecimal("500"));
        
        ProductRequest.VariantDto v1 = new ProductRequest.VariantDto();
        v1.setName("1 Kg");
        v1.setPrice(new BigDecimal("500"));
        req.setVariants(List.of(v1));

        ProductRequest.HighlightDto h1 = new ProductRequest.HighlightDto();
        h1.setHighlightText("Veg");
        req.setHighlights(List.of(h1));

        Product result = productService.createProduct(OWNER_ID, req);

        assertNotNull(result);
        assertEquals("Cake", result.getName());
        assertEquals(1, result.getVariants().size());
        assertEquals("1 Kg", result.getVariants().iterator().next().getName());
        assertEquals(1, result.getHighlights().size());
        
        verify(productRepository).save(any(Product.class));
        verify(storefrontCacheService).evictShopProducts(SHOP_ID);
        verify(activityLogger).logActivity(eq(OWNER_ID), eq(SHOP_ID), eq("PRODUCT_CREATED"), anyString(), eq(100L), anyString());
    }

    @Test
    @DisplayName("Update product rejects cross-shop unauthorized access")
    void testUpdateProduct_TenantIsolation() {
        when(shopAccessValidator.getValidShopForOwner(OWNER_ID)).thenReturn(shop);
        when(productRepository.findByIdAndShopId(100L, SHOP_ID)).thenReturn(Optional.empty());

        ProductRequest req = new ProductRequest();
        req.setName("Cake");
        req.setPrice(new BigDecimal("500"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            productService.updateProduct(100L, OWNER_ID, req)
        );

        assertEquals("Product not found or unauthorized", ex.getMessage());
        verify(productRepository, never()).save(any());
        verify(storefrontCacheService, never()).evictShopProducts(any());
    }

    @Test
    @DisplayName("Create product rejects more than 3 alternative images")
    void testCreateProduct_ImageLimit() {
        when(shopAccessValidator.getValidShopForOwner(OWNER_ID)).thenReturn(shop);

        ProductRequest req = new ProductRequest();
        req.setName("Cake");
        req.setPrice(new BigDecimal("500"));
        
        List<ProductRequest.ImageDto> images = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            ProductRequest.ImageDto img = new ProductRequest.ImageDto();
            img.setImageUrl("url" + i);
            images.add(img);
        }
        req.setImages(images);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> 
            productService.createProduct(OWNER_ID, req)
        );

        assertEquals("A product can have a maximum of 3 alternative images", ex.getMessage());
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("Delete product validates shop and evicts cache")
    void testDeleteProduct() {
        when(shopAccessValidator.getValidShopForOwner(OWNER_ID)).thenReturn(shop);
        Product product = new Product();
        product.setId(100L);
        product.setName("Cake");
        when(productRepository.findByIdAndShopId(100L, SHOP_ID)).thenReturn(Optional.of(product));

        productService.deleteProduct(100L, OWNER_ID);

        verify(productRepository).delete(product);
        verify(storefrontCacheService).evictShopProducts(SHOP_ID);
        verify(activityLogger).logActivity(eq(OWNER_ID), eq(SHOP_ID), eq("PRODUCT_DELETED"), anyString(), eq(100L), anyString());
    }
}
