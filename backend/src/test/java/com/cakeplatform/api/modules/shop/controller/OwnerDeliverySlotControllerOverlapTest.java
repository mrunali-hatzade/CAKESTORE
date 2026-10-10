package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.shop.dto.DeliverySlotRequest;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Regression tests that verify the overlap‑validation behaviour of {@link OwnerDeliverySlotController}.
 * These tests exercise the real controller logic (no SpringBootTest – pure unit style) and cover
 * creation as well as update scenarios.
 */
class OwnerDeliverySlotControllerOverlapTest {

    @Mock
    private ShopDeliverySlotRepository deliverySlotRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @Mock
    private OrderRepository orderRepository; // not used for overlap tests but required by ctor

    @InjectMocks
    private OwnerDeliverySlotController controller;

    private Shop testShop;
    private CustomUserDetails userDetails;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // basic shop and owner setup
        testShop = new Shop();
        testShop.setId(10L);
        testShop.setBusinessName("Test Bakery");
        // owner id 1L
        userDetails = new CustomUserDetails(new com.cakeplatform.api.modules.user.User());
        userDetails.getUser().setId(1L);
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(testShop);
    }

    private ShopDeliverySlot slot(Long id, String day, LocalTime start, LocalTime end) {
        ShopDeliverySlot s = new ShopDeliverySlot();
        s.setId(id);
        s.setShop(testShop);
        s.setDayOfWeek(day);
        s.setStartTime(start);
        s.setEndTime(end);
        s.setMaxOrders(10);
        s.setIsActive(true);
        return s;
    }

    @Test
    @DisplayName("Create overlapping slot on same day → 400 Bad Request")
    void createOverlappingSlotReturnsBadRequest() {
        // existing slot Monday 09:00‑11:00
        ShopDeliverySlot existing = slot(100L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(existing));
        // request overlapping Monday 10:00‑12:00
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("MONDAY");
        req.setStartTime(LocalTime.of(10, 0));
        req.setEndTime(LocalTime.of(12, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.createSlot(userDetails, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("overlaps"));
    }

    @Test
    @DisplayName("Update slot day to overlapping day → 400 Bad Request")
    void updateSlotDayOverlapReturnsBadRequest() {
        // slot to be updated (id 101) originally Monday 09:00‑11:00
        ShopDeliverySlot toUpdate = slot(101L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        // another slot on TUESDAY that would conflict after day change
        ShopDeliverySlot other = slot(102L, "TUESDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(toUpdate));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(toUpdate, other));
        // request changes day to TUESDAY, same time range
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("TUESDAY");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(11, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.updateSlot(userDetails, 101L, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("overlaps"));
    }

    @Test
    @DisplayName("Update slot time to overlap existing slot → 400 Bad Request")
    void updateSlotTimeOverlapReturnsBadRequest() {
        // original slot Monday 09:00‑11:00 (id 101)
        ShopDeliverySlot toUpdate = slot(101L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        // another slot on same day overlapping new range
        ShopDeliverySlot other = slot(102L, "MONDAY", LocalTime.of(10, 30), LocalTime.of(12, 30));
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(toUpdate));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(toUpdate, other));
        // request changes times to 10:00‑12:00 (still Monday) – overlaps with other
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("MONDAY");
        req.setStartTime(LocalTime.of(10, 0));
        req.setEndTime(LocalTime.of(12, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.updateSlot(userDetails, 101L, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("overlaps"));
    }

    @Test
    @DisplayName("Adjacent slots are accepted (no overlap)")
    void adjacentSlotsAccepted() {
        // existing slot Monday 09:00‑11:00
        ShopDeliverySlot existing = slot(100L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(existing));
        // request exactly adjacent Monday 11:00‑13:00
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("MONDAY");
        req.setStartTime(LocalTime.of(11, 0));
        req.setEndTime(LocalTime.of(13, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        // mock save to return the persisted slot
        when(deliverySlotRepository.save(any(ShopDeliverySlot.class))).thenAnswer(i -> i.getArgument(0));
        ResponseEntity<ShopDeliverySlot> resp = controller.createSlot(userDetails, req);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(LocalTime.of(11, 0), resp.getBody().getStartTime());
    }

    @Test
    @DisplayName("Update without changing day/time is accepted")
    void updateSlotNoChangeAccepted() {
        ShopDeliverySlot existing = slot(101L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(existing));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(existing));
        when(deliverySlotRepository.save(any(ShopDeliverySlot.class))).thenAnswer(i -> i.getArgument(0));
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("MONDAY");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(11, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        ResponseEntity<ShopDeliverySlot> resp = controller.updateSlot(userDetails, 101L, req);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
        assertEquals(existing.getId(), resp.getBody().getId());
    }

    @Test
    @DisplayName("Identical time range on same day is rejected")
    void identicalRangeRejected() {
        ShopDeliverySlot existing = slot(100L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(existing));
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("MONDAY");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(11, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                controller.createSlot(userDetails, req));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("overlaps"));
    }

    @Test
    @DisplayName("Overlapping times on different days are accepted")
    void overlapDifferentDaysAccepted() {
        // existing slot Monday 09:00‑11:00
        ShopDeliverySlot existing = slot(100L, "MONDAY", LocalTime.of(9, 0), LocalTime.of(11, 0));
        when(deliverySlotRepository.findByShopId(testShop.getId())).thenReturn(List.of(existing));
        // request Tuesday 09:00‑11:00 – same times but different day
        DeliverySlotRequest req = new DeliverySlotRequest();
        req.setDayOfWeek("TUESDAY");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(11, 0));
        req.setMaxOrders(10);
        req.setIsActive(true);
        when(deliverySlotRepository.save(any(ShopDeliverySlot.class))).thenAnswer(i -> i.getArgument(0));
        ResponseEntity<ShopDeliverySlot> resp = controller.createSlot(userDetails, req);
        assertEquals(HttpStatus.OK, resp.getStatusCode());
    }
}
