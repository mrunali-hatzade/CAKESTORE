package com.cakeplatform.api.modules.order.controller;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.service.OrderService;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class OwnerOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    private CustomUserDetails testUser;
    private Order order;

    @BeforeEach
    void setUp() {
        com.cakeplatform.api.modules.user.User u = new com.cakeplatform.api.modules.user.User();
        u.setId(1L);
        u.setEmail("owner@test.com");
        u.setPasswordHash("password");
        u.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        testUser = new CustomUserDetails(u);

        order = new Order();
        order.setId(10L);
        order.setCustomerName("Guest");
        order.setCustomerPhone("9876543210");
        order.setOrderNumber("ORD-123456");
        order.setSubtotal(new BigDecimal("1000"));
        order.setTotalAmount(new BigDecimal("1050"));
        order.setDeliveryCharge(new BigDecimal("50"));
        order.setPaymentStatus("PENDING");
        order.setPaymentMethod("COD");
        order.setOrderStatus("NEW");
    }

    @Test
    void testGetOrdersPagination() throws Exception {
        org.springframework.data.domain.Page<Order> mockPage = new org.springframework.data.domain.PageImpl<>(
                Collections.singletonList(order),
                org.springframework.data.domain.PageRequest.of(0, 20),
                1
        );

        when(orderService.getPaginatedOrdersByUserId(eq(1L), isNull(), isNull(), isNull(), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(mockPage);

        mockMvc.perform(get("/api/owner/orders?page=0&size=20")
                .with(user(testUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].orderNumber").value("ORD-123456"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void testValidStatusTransition() throws Exception {
        Order updated = new Order();
        updated.setId(10L);
        updated.setOrderStatus("CONFIRMED");
        
        when(orderService.updateOrderStatus(eq(1L), eq(10L), eq("CONFIRMED")))
                .thenReturn(updated);

        mockMvc.perform(patch("/api/owner/orders/10/status")
                .with(user(testUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\": \"CONFIRMED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderStatus").value("CONFIRMED"));
    }

    @Test
    void testUpdatePaymentStatus() throws Exception {
        Order updated = new Order();
        updated.setId(10L);
        updated.setPaymentStatus("PAID");
        updated.setPaymentMethod("COD");

        when(orderService.updatePaymentStatus(eq(1L), eq(10L), eq("PAID"), any()))
                .thenReturn(updated);

        mockMvc.perform(patch("/api/owner/orders/10/payment-status")
                .with(user(testUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentStatus\": \"PAID\", \"paymentNote\": \"CASH_COLLECTED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("PAID"))
                .andExpect(jsonPath("$.paymentMethod").value("COD"));
    }
}
