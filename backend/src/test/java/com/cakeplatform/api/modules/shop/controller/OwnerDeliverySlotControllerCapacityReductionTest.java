package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.exception.DeliverySlotFullException;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.Collections;

/**
 * Test that updating a delivery slot's maxOrders below the number of already booked active orders
 * returns HTTP 400 and leaves the existing capacity unchanged.
 */
@SpringBootTest
@WithMockUser(username = "owner", roles = {"SHOP_OWNER"})
class OwnerDeliverySlotControllerCapacityReductionTest {

    @Autowired
    private OwnerDeliverySlotController controller;

    @Autowired
    private ShopDeliverySlotRepository slotRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private com.cakeplatform.api.modules.shop.ShopRepository shopRepository;

    @Autowired
    private com.cakeplatform.api.modules.user.UserRepository userRepository;

    @MockBean
    private ShopAccessValidator shopAccessValidator;

    private User owner;
    private Shop shop;
    private ShopDeliverySlot slot;
    private CustomUserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        // Clean up any lingering data from previous tests
        orderRepository.deleteAll();
        slotRepository.deleteAll();
        shopRepository.deleteAll();
        userRepository.deleteAll();
        
        owner = new User();
        owner.setEmail("owner" + java.util.UUID.randomUUID().toString() + "@cake.com");
        owner.setRole(UserRole.SHOP_OWNER);
        // Persist owner to satisfy foreign key
        owner = userRepository.save(owner);

        shop = new Shop();
        shop.setBusinessName("Cap Test Shop");
        shop.setOwner(owner);
        shop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE);
        // Persist the shop and obtain the generated ID
        shop = shopRepository.save(shop);

        slot = new ShopDeliverySlot();
        slot.setShop(shop);
        slot.setDayOfWeek("SATURDAY");
        slot.setStartTime(java.time.LocalTime.of(9, 0));
        slot.setEndTime(java.time.LocalTime.of(12, 0));
        slot.setMaxOrders(3);
        slot.setIsActive(true);
        // Persist the slot (shop ID is now valid)
        slot = slotRepository.save(slot);

        // Simulate two existing active orders for this slot
        for (int i = 0; i < 2; i++) {
            com.cakeplatform.api.modules.order.Order o = new com.cakeplatform.api.modules.order.Order();
            o.setShop(shop);
            o.setDeliverySlot(slot);
            o.setDeliveryDate(java.time.LocalDate.now().plusDays(7));
            o.setOrderStatus("NEW");
            o.setPaymentStatus("PENDING");
            // Assign a unique, non‑null order number to satisfy DB constraint
            o.setOrderNumber(java.util.UUID.randomUUID().toString());
            // Required monetary fields (non‑null in DB)
            o.setSubtotal(java.math.BigDecimal.ZERO);
            o.setTotalAmount(java.math.BigDecimal.ZERO);
            orderRepository.save(o);
        }

        mockUserDetails = mock(CustomUserDetails.class);
        when(mockUserDetails.getId()).thenReturn(owner.getId());
        // Mock the validator to return the persisted shop
        when(shopAccessValidator.getValidShopForOwner(owner.getId())).thenReturn(shop);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        mockUserDetails,
                        null,
                        java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_SHOP_OWNER"))));


    }

    @Test
    @DisplayName("Reducing maxOrders below already booked active orders returns 400 Bad Request")
    void reduceCapacityBelowBooked_conflict() {
        // Prepare DTO request with lower maxOrders (1) while 2 orders already exist
        com.cakeplatform.api.modules.shop.dto.DeliverySlotRequest request = new com.cakeplatform.api.modules.shop.dto.DeliverySlotRequest();
        request.setMaxOrders(1); // lower than existing active count (2)
        request.setStartTime(slot.getStartTime());
        request.setEndTime(slot.getEndTime());
        request.setDayOfWeek(slot.getDayOfWeek());
        request.setIsActive(true);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.updateSlot(mockUserDetails, slot.getId(), request));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Capacity cannot be lower than the number of active orders"));

        // Verify the slot's maxOrders remains unchanged (3)
        ShopDeliverySlot refreshed = slotRepository.findById(slot.getId()).orElseThrow();
        assertEquals(3, refreshed.getMaxOrders(), "Slot capacity should stay unchanged after failed reduction");
    }
}
