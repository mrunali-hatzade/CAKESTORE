package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse;
import com.cakeplatform.api.security.CustomUserDetails;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class OwnerCustomerControllerTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @InjectMocks
    private OwnerCustomerController controller;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testGetMyCustomersPaginated() {
        com.cakeplatform.api.modules.user.User user = new com.cakeplatform.api.modules.user.User();
        user.setId(1L);
        user.setEmail("owner@test.com");
        user.setPasswordHash("password");
        user.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        CustomUserDetails userDetails = new CustomUserDetails(user);

        Shop shop = new Shop();
        shop.setId(10L);

        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shop);

        CustomerProfileResponse profile = new CustomerProfileResponse("Test User", "test@user.com", "12345", "Addr", 1L, BigDecimal.TEN, LocalDateTime.now());
        Page<CustomerProfileResponse> page = new PageImpl<>(List.of(profile), PageRequest.of(0, 10), 1);

        when(orderRepository.findCustomerProfilesByShopId(eq(10L), any())).thenReturn(page);

        ResponseEntity<Page<CustomerProfileResponse>> response = controller.getMyCustomers(userDetails, 0, 10);
        
        assertEquals(200, response.getStatusCode().value());
        assertEquals(1, Objects.requireNonNull(response.getBody()).getTotalElements());
        assertEquals("Test User", response.getBody().getContent().get(0).getName());
    }
}
