package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.dto.GalleryItemRequest;
import com.cakeplatform.api.modules.shop.dto.GalleryItemResponse;
import com.cakeplatform.api.modules.shop.service.GalleryService;
import com.cakeplatform.api.security.CustomUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class OwnerGalleryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GalleryService galleryService;

    private CustomUserDetails ownerDetails;
    private GalleryItemRequest validRequest;
    private GalleryItemResponse sampleResponse;

    @BeforeEach
    void setUp() {
        // Build a SHOP_OWNER user
        com.cakeplatform.api.modules.user.User u = new com.cakeplatform.api.modules.user.User();
        u.setId(1L);
        u.setEmail("owner@test.com");
        u.setPasswordHash("password");
        u.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        ownerDetails = new CustomUserDetails(u);

        // Valid request payload
        validRequest = new GalleryItemRequest();
        validRequest.setTitle("Delicious Cake");
        validRequest.setCaption("Yummy");
        validRequest.setImageUrl("http://example.com/image.png");
        validRequest.setCategoryName("Dessert");
        validRequest.setDisplayOrder(1);
        validRequest.setIsActive(true);

        // Sample response object matching the entity conversion
        sampleResponse = GalleryItemResponse.builder()
                .id(10L)
                .shopId(5L)
                .title("Delicious Cake")
                .caption("Yummy")
                .imageUrl("http://example.com/image.png")
                .categoryName("Dessert")
                .displayOrder(1)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("GET gallery unauthenticated should return 401")
    void getGallery_Unauthenticated() throws Exception {
        mockMvc.perform(get("/api/owner/gallery"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET gallery forbidden for non-owner role")
    void getGallery_Forbidden() throws Exception {
        com.cakeplatform.api.modules.user.User customer = new com.cakeplatform.api.modules.user.User();
        customer.setId(2L);
        customer.setRole(com.cakeplatform.api.modules.user.UserRole.CUSTOMER);
        CustomUserDetails custDetails = new CustomUserDetails(customer);

        mockMvc.perform(get("/api/owner/gallery").with(user(custDetails)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET gallery paginated success")
    void getGallery_Success() throws Exception {
        Page<GalleryItemResponse> page = new PageImpl<>(List.of(sampleResponse), PageRequest.of(0, 10), 1);
        // The search parameter can be null; use nullable matcher to allow that
        when(galleryService.getOwnerGalleryItems(eq(1L), org.mockito.ArgumentMatchers.isNull(), any(PageRequest.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/owner/gallery")
                        .with(user(ownerDetails))
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10))
                .andExpect(jsonPath("$.content[0].title").value("Delicious Cake"));
    }

    @Test
    @DisplayName("POST create gallery unauthenticated 401")
    void createGallery_Unauthenticated() throws Exception {
        mockMvc.perform(post("/api/owner/gallery")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST create gallery forbidden for non-owner")
    void createGallery_Forbidden() throws Exception {
        com.cakeplatform.api.modules.user.User cust = new com.cakeplatform.api.modules.user.User();
        cust.setId(2L);
        cust.setRole(com.cakeplatform.api.modules.user.UserRole.CUSTOMER);
        CustomUserDetails custDetails = new CustomUserDetails(cust);

        mockMvc.perform(post("/api/owner/gallery")
                        .with(user(custDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST create gallery validation failure (blank title)")
    void createGallery_ValidationFail_BlankTitle() throws Exception {
        GalleryItemRequest bad = new GalleryItemRequest();
        bad.setTitle(""); // blank violates @NotBlank
        bad.setImageUrl("http://example.com/img.png");

        mockMvc.perform(post("/api/owner/gallery")
                        .with(user(ownerDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bad)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST create gallery validation failure (missing imageUrl)")
    void createGallery_ValidationFail_MissingImage() throws Exception {
        GalleryItemRequest bad = new GalleryItemRequest();
        bad.setTitle("Valid Title");
        // imageUrl left null -> @NotBlank violation

        mockMvc.perform(post("/api/owner/gallery")
                        .with(user(ownerDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bad)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST create gallery success returns 201 and body")
    void createGallery_Success() throws Exception {
        when(galleryService.createGalleryItem(eq(1L), any(GalleryItemRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/owner/gallery")
                        .with(user(ownerDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.title").value("Delicious Cake"));
    }

    @Test
    @DisplayName("PUT update gallery success")
    void updateGallery_Success() throws Exception {
        when(galleryService.updateGalleryItem(eq(10L), eq(1L), any(GalleryItemRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(put("/api/owner/gallery/10")
                        .with(user(ownerDetails))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    @DisplayName("DELETE gallery success returns message")
    void deleteGallery_Success() throws Exception {
        mockMvc.perform(delete("/api/owner/gallery/10")
                        .with(user(ownerDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Gallery item deleted successfully"));
    }
}
