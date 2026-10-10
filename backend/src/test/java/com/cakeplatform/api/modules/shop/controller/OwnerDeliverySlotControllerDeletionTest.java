package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.order.Order;
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
import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;

/**
 * Integration‑style test that verifies the DELETE endpoint does not cascade‑delete orders
 * and returns HTTP 409 when a slot is referenced by existing orders.
 */
@SpringBootTest
class OwnerDeliverySlotControllerDeletionTest {

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

    private User testOwner;
    private Shop testShop;
    private ShopDeliverySlot slot;
    private Order order;
    private CustomUserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        // Create owner & shop
        // Persist owner to generate ID
        testOwner = new User();
        testOwner.setEmail("owner" + UUID.randomUUID().toString() + "@cake.com");
        testOwner.setRole(UserRole.SHOP_OWNER);
        testOwner = userRepository.save(testOwner);

        // Persist shop with owner
        testShop = new Shop();
        testShop.setBusinessName("Sweet Spot");
        testShop.setOwner(testOwner);
        testShop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE);
        testShop = shopRepository.save(testShop);

        // Create active delivery slot
        slot = new ShopDeliverySlot();
        slot.setShop(testShop);
        slot.setDayOfWeek("SATURDAY");
        slot.setStartTime(java.time.LocalTime.of(10, 0));
        slot.setEndTime(java.time.LocalTime.of(14, 0));
        slot.setMaxOrders(5);
        slot.setIsActive(true);
        slot = slotRepository.save(slot);

        // Create an order that references this slot
        order = new Order();
        order.setShop(testShop);
        order.setDeliverySlot(slot);
        order.setDeliveryDate(java.time.LocalDate.now().plusDays(7)); // future Saturday
        order.setOrderStatus("NEW");
        order.setPaymentStatus("PENDING");
        order.setOrderNumber(UUID.randomUUID().toString());
        order.setSubtotal(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.ZERO);
        order.setPaymentMethod("COD");
        order.setDeliveryAddress("123 Test St");
        order = orderRepository.save(order);

        // Mock authentication principal
        mockUserDetails = mock(CustomUserDetails.class);
        when(mockUserDetails.getId()).thenReturn(testOwner.getId());
        when(shopAccessValidator.getValidShopForOwner(testOwner.getId()))
                .thenReturn(testShop);
        // Set authentication in SecurityContext for PreAuthorize checks
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(mockUserDetails, null,
                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_SHOP_OWNER"))));

    }

    
    @DisplayName("Delete slot referenced by existing orders returns 409 Conflict and does not delete orders")
    void deleteSlotWithExistingOrders_conflict() {
        // Attempt deletion – should raise Conflict
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.deleteSlot(mockUserDetails, slot.getId()));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Cannot delete slot"));

        // Verify the order still exists
        assertTrue(orderRepository.findById(order.getId()).isPresent(), "Order must remain after failed delete");

        // Verify the slot itself was NOT removed
        Optional<ShopDeliverySlot> stillExists = slotRepository.findById(slot.getId());
        assertTrue(stillExists.isPresent(), "Slot should still exist after conflict");
    }
}
