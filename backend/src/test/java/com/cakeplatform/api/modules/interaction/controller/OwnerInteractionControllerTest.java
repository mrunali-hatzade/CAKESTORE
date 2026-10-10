package com.cakeplatform.api.modules.interaction.controller;

import com.cakeplatform.api.modules.interaction.dto.ConvertToOrderRequest;
import com.cakeplatform.api.modules.interaction.dto.ReplyRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.service.OwnerInteractionService;
import com.cakeplatform.api.security.CustomUserDetails;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class OwnerInteractionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OwnerInteractionService ownerInteractionService;

    private CustomUserDetails shopOwnerDetails;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setEmail("owner@test.com");
        user.setPasswordHash("pwd");
        user.setRole(UserRole.SHOP_OWNER);
        shopOwnerDetails = new CustomUserDetails(user);
    }

    @Test
    void unauthenticatedAccess_isRejected() throws Exception {
        mockMvc.perform(get("/api/owner/custom-cakes")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/owner/custom-cakes/1/respond")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/owner/custom-cakes/1/convert-to-order")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "customer@test.com", authorities = {"ROLE_CUSTOMER"})
    void customerRole_cannotAccess() throws Exception {
        mockMvc.perform(get("/api/owner/custom-cakes")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/owner/custom-cakes/1/respond")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/owner/custom-cakes/1/convert-to-order")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = {"ROLE_ADMIN"})
    void adminRole_cannotAccess() throws Exception {
        mockMvc.perform(get("/api/owner/custom-cakes")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/owner/custom-cakes/1/respond")).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/owner/custom-cakes/1/convert-to-order")).andExpect(status().isForbidden());
    }

    @Test
    void shopOwner_canAccessEndpoints() throws Exception {
        when(ownerInteractionService.getMyCustomCakeRequests(eq(1L))).thenReturn(List.of());
        mockMvc.perform(get("/api/owner/custom-cakes").with(user(shopOwnerDetails)))
                .andExpect(status().isOk());

        ReplyRequest reply = new ReplyRequest();
        reply.setReply("We can make it!");
        CustomCakeRequest updated = new CustomCakeRequest();
        updated.setId(5L);
        when(ownerInteractionService.updateCustomCakeRequestStatus(eq(1L), eq(5L), eq("ACCEPTED"), any(ReplyRequest.class)))
                .thenReturn(updated);
        mockMvc.perform(post("/api/owner/custom-cakes/5/respond?status=ACCEPTED")
                .with(user(shopOwnerDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reply)))
                .andExpect(status().isOk());

        ConvertToOrderRequest convReq = new ConvertToOrderRequest();
        when(ownerInteractionService.convertToOrder(eq(1L), eq(5L), any(ConvertToOrderRequest.class)))
                .thenReturn(null);
        mockMvc.perform(post("/api/owner/custom-cakes/5/convert-to-order")
                .with(user(shopOwnerDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(convReq)))
                .andExpect(status().isOk());
    }

    @Test
    void respond_invalidStatus_returns400() throws Exception {
        ReplyRequest reply = new ReplyRequest();
        reply.setReply("Message");
        mockMvc.perform(post("/api/owner/custom-cakes/1/respond?status=")
                .with(user(shopOwnerDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reply)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/owner/custom-cakes/1/respond?status=UNKNOWN")
                .with(user(shopOwnerDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(reply)))
                .andExpect(status().isBadRequest());
        verify(ownerInteractionService, never()).updateCustomCakeRequestStatus(anyLong(), anyLong(), anyString(), any());
    }

    @Test
    void respond_missingPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/owner/custom-cakes/1/respond?status=ACCEPTED")
                .with(user(shopOwnerDetails))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void convert_missingPayload_allowsNullBody() throws Exception {
        when(ownerInteractionService.convertToOrder(eq(1L), eq(1L), eq(null)))
                .thenReturn(null);
        mockMvc.perform(post("/api/owner/custom-cakes/1/convert-to-order")
                .with(user(shopOwnerDetails)))
                .andExpect(status().isOk());
    }

    @Test
    void getCustomCakes_returnsList() throws Exception {
        CustomCakeRequest req = new CustomCakeRequest();
        req.setId(10L);
        when(ownerInteractionService.getMyCustomCakeRequests(eq(1L))).thenReturn(List.of(req));
        mockMvc.perform(get("/api/owner/custom-cakes").with(user(shopOwnerDetails)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10));
    }
}
