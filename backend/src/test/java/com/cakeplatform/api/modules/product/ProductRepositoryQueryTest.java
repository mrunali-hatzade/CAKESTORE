package com.cakeplatform.api.modules.product;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class ProductRepositoryQueryTest {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository categoryRepository;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private com.cakeplatform.api.modules.user.UserRepository userRepository;

    private Shop shopA;
    private Shop shopB;
    private ProductCategory category1;
    private ProductCategory category2;
    private Product productCat1;
    private Product productCat2;
    private Product productUncat;
    private Product productShopB;
    private Product productDeleted;

    @BeforeEach
    void setUp() {
        com.cakeplatform.api.modules.user.User ownerA = new com.cakeplatform.api.modules.user.User();
        ownerA.setFullName("Test Owner A");
        ownerA.setEmail("owner_a_" + java.util.UUID.randomUUID().toString() + "@test.com");
        ownerA.setPasswordHash("hash");
        ownerA.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        ownerA = userRepository.save(ownerA);

        com.cakeplatform.api.modules.user.User ownerB = new com.cakeplatform.api.modules.user.User();
        ownerB.setFullName("Test Owner B");
        ownerB.setEmail("owner_b_" + java.util.UUID.randomUUID().toString() + "@test.com");
        ownerB.setPasswordHash("hash");
        ownerB.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        ownerB = userRepository.save(ownerB);

        shopA = new Shop();
        shopA.setBusinessName("Test Shop A");
        shopA.setPhone("1234567890");
        shopA.setOwner(ownerA);
        shopA = shopRepository.save(shopA);

        shopB = new Shop();
        shopB.setBusinessName("Test Shop B");
        shopB.setPhone("0987654321");
        shopB.setOwner(ownerB);
        shopB = shopRepository.save(shopB);

        category1 = new ProductCategory();
        category1.setName("Cakes");
        category1.setShop(shopA);
        category1 = categoryRepository.save(category1);

        category2 = new ProductCategory();
        category2.setName("Pastries");
        category2.setShop(shopA);
        category2 = categoryRepository.save(category2);

        productCat1 = new Product();
        productCat1.setName("Chocolate Cake");
        productCat1.setShop(shopA);
        productCat1.setCategory(category1);
        productCat1.setPrice(java.math.BigDecimal.valueOf(100));
        productCat1 = productRepository.save(productCat1);

        productCat2 = new Product();
        productCat2.setName("Vanilla Pastry");
        productCat2.setShop(shopA);
        productCat2.setCategory(category2);
        productCat2.setPrice(java.math.BigDecimal.valueOf(100));
        productCat2 = productRepository.save(productCat2);

        productUncat = new Product();
        productUncat.setName("Uncategorized Muffin");
        productUncat.setShop(shopA);
        productUncat.setPrice(java.math.BigDecimal.valueOf(100));
        productUncat = productRepository.save(productUncat);

        productShopB = new Product();
        productShopB.setName("Shop B Cake");
        productShopB.setShop(shopB);
        productShopB.setPrice(java.math.BigDecimal.valueOf(100));
        productShopB = productRepository.save(productShopB);

        productDeleted = new Product();
        productDeleted.setName("Deleted Cake");
        productDeleted.setShop(shopA);
        productDeleted.setDeleted(true);
        productDeleted.setPrice(java.math.BigDecimal.valueOf(100));
        productDeleted = productRepository.save(productDeleted);
    }

    @Test
    @DisplayName("Test 1: categoryId = NULL returns ALL undeleted products for the shop")
    void testFindAll() {
        Page<Product> page = productRepository.findByShopIdWithFilters(shopA.getId(), null, null, PageRequest.of(0, 10));
        assertEquals(3, page.getTotalElements());
        assertTrue(page.getContent().contains(productCat1));
        assertTrue(page.getContent().contains(productCat2));
        assertTrue(page.getContent().contains(productUncat));
    }

    @Test
    @DisplayName("Test 2: categoryId = -1 returns ONLY UNCATEGORIZED products")
    void testFindUncategorized() {
        Page<Product> page = productRepository.findByShopIdWithFilters(shopA.getId(), null, -1L, PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().contains(productUncat));
    }

    @Test
    @DisplayName("Test 3: categoryId = specific ID returns ONLY products in that category")
    void testFindSpecificCategory() {
        Page<Product> page = productRepository.findByShopIdWithFilters(shopA.getId(), null, category1.getId(), PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().contains(productCat1));
    }

    @Test
    @DisplayName("Test 4: search + UNCATEGORIZED")
    void testSearchUncategorized() {
        // Matches
        Page<Product> page = productRepository.findByShopIdWithFilters(shopA.getId(), "muffin", -1L, PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().contains(productUncat));

        // Doesn't match
        page = productRepository.findByShopIdWithFilters(shopA.getId(), "chocolate", -1L, PageRequest.of(0, 10));
        assertEquals(0, page.getTotalElements());
    }

    @Test
    @DisplayName("Test 5: pagination + UNCATEGORIZED")
    void testPaginationUncategorized() {
        // Add more uncategorized products to test pagination
        for (int i = 0; i < 5; i++) {
            Product p = new Product();
            p.setName("Uncat " + i);
            p.setShop(shopA);
            p.setPrice(java.math.BigDecimal.valueOf(100));
            productRepository.save(p);
        }

        Page<Product> page0 = productRepository.findByShopIdWithFilters(shopA.getId(), null, -1L, PageRequest.of(0, 3));
        assertEquals(6, page0.getTotalElements());
        assertEquals(3, page0.getContent().size());

        Page<Product> page1 = productRepository.findByShopIdWithFilters(shopA.getId(), null, -1L, PageRequest.of(1, 3));
        assertEquals(6, page1.getTotalElements());
        assertEquals(3, page1.getContent().size());
    }

    @Test
    @DisplayName("Test 6: tenant isolation")
    void testTenantIsolation() {
        Page<Product> page = productRepository.findByShopIdWithFilters(shopB.getId(), null, null, PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().contains(productShopB));
    }

    @Test
    @DisplayName("Test 7: existing categorized behavior with search")
    void testCategorizedSearch() {
        // Search matches category name "Cakes"
        Page<Product> page = productRepository.findByShopIdWithFilters(shopA.getId(), "cakes", category1.getId(), PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().contains(productCat1));
    }

    @Test
    @DisplayName("Test 8: Phase 5.0B behavior (search matches category name of a product)")
    void testPhase50BSearchMatchesCategoryName() {
        // Search for "pastries" should find productCat2 because its category name is "Pastries"
        Page<Product> page = productRepository.findByShopIdWithFilters(shopA.getId(), "pastries", null, PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertTrue(page.getContent().contains(productCat2));
    }
}
