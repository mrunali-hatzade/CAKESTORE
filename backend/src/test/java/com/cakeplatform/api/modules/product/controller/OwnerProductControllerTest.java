package com.cakeplatform.api.modules.product.controller;

import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.dto.ProductRequest;
import com.cakeplatform.api.modules.product.service.ProductService;
import com.cakeplatform.api.security.CustomUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class OwnerProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    private CustomUserDetails testUser;
    private ProductRequest validRequest;

    @BeforeEach
    void setUp() {
        com.cakeplatform.api.modules.user.User u = new com.cakeplatform.api.modules.user.User();
        u.setId(1L);
        u.setEmail("owner@test.com");
        u.setPasswordHash("password");
        u.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        testUser = new CustomUserDetails(u);

        validRequest = new ProductRequest();
        validRequest.setName("Test Cake");
        validRequest.setPrice(new BigDecimal("500"));
    }

    @Test
    @DisplayName("Create product rejects unauthorized users")
    void testCreateProduct_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/owner/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Create product rejects unauthenticated users without SHOP_OWNER role")
    void testCreateProduct_Forbidden() throws Exception {
        com.cakeplatform.api.modules.user.User customerUser = new com.cakeplatform.api.modules.user.User();
        customerUser.setId(2L);
        customerUser.setRole(com.cakeplatform.api.modules.user.UserRole.CUSTOMER);
        CustomUserDetails customerDetails = new CustomUserDetails(customerUser);

        mockMvc.perform(post("/api/owner/products")
                .with(user(customerDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Create product validates missing required fields")
    void testCreateProduct_ValidationFail() throws Exception {
        ProductRequest invalidRequest = new ProductRequest();
        // Missing name and price

        mockMvc.perform(post("/api/owner/products")
                .with(user(testUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Create product successfully passes to service for SHOP_OWNER")
    void testCreateProduct_Success() throws Exception {
        Product mockProduct = new Product();
        mockProduct.setId(10L);
        mockProduct.setName("Test Cake");
        mockProduct.setPrice(new BigDecimal("500"));

        when(productService.createProduct(eq(1L), any(ProductRequest.class))).thenReturn(mockProduct);

        mockMvc.perform(post("/api/owner/products")
                .with(user(testUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.name").value("Test Cake"));
    }
}
