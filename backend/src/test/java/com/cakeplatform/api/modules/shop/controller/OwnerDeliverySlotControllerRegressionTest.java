package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.user.User;
import java.util.Optional;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.dto.DeliverySlotRequest;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OwnerDeliverySlotControllerRegressionTest {

    @Mock
    private ShopDeliverySlotRepository deliverySlotRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @Mock
    private OrderRepository orderRepository;

    private OwnerDeliverySlotController controller;

    private Shop testShop;
    private ShopDeliverySlot slot;
    private CustomUserDetails authUser;

    @BeforeEach
    void setUp() {
        controller = new OwnerDeliverySlotController(deliverySlotRepository, shopAccessValidator, orderRepository);
        testShop = new Shop();
        testShop.setId(10L);
        testShop.setBusinessName("Test Bakery");
        // Use a mock CustomUserDetails that returns the owner id
        authUser = mock(CustomUserDetails.class);
        when(authUser.getId()).thenReturn(1L);
        when(shopAccessValidator.getValidShopForOwner(anyLong())).thenReturn(testShop);
        slot = new ShopDeliverySlot();
        slot.setId(101L);
        slot.setShop(testShop);
        slot.setDayOfWeek(DayOfWeek.SATURDAY.name());
        slot.setStartTime(LocalTime.of(10, 0));
        slot.setEndTime(LocalTime.of(14, 0));
        slot.setMaxOrders(5);
        slot.setIsActive(true);
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(slot));
    }

    @Test
    @DisplayName("Delete slot with existing orders returns 409 Conflict and does not delete orders")
    void deleteSlot_WithExistingOrders_ReturnsConflict() {
        doThrow(new DataIntegrityViolationException("FK violation")).when(deliverySlotRepository).delete(slot);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.deleteSlot(authUser, 101L));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Cannot delete slot"));
        verify(deliverySlotRepository).delete(slot);
        verifyNoInteractions(orderRepository);
    }

    @Test
    @DisplayName("Reduce capacity below active bookings returns 400 Bad Request and leaves capacity unchanged")
    void updateSlot_ReduceCapacityBelowActive_ReturnsBadRequest() {
        when(orderRepository.findMaxActiveOrdersOnAnyUpcomingDate(101L)).thenReturn(4);
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setStartTime(slot.getStartTime());
        req.setEndTime(slot.getEndTime());
        req.setDayOfWeek(slot.getDayOfWeek());
        req.setMaxOrders(3);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.updateSlot(authUser, 101L, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Capacity cannot be lower"));
        assertEquals(5, slot.getMaxOrders());
    }

    @Test
    @DisplayName("Deactivate slot with existing orders prevents new bookings while preserving existing ones")
    void deactivateSlot_WithExistingOrders_PreventsNewBookings() {
        Map<String, Boolean> statusUpdate = Map.of("isActive", false);
        when(deliverySlotRepository.save(any())).thenReturn(slot);
        ResponseEntity<ShopDeliverySlot> resp = controller.updateStatus(authUser, 101L, statusUpdate);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertFalse(resp.getBody().getIsActive());
        assertFalse(slot.getIsActive());
    }
}
