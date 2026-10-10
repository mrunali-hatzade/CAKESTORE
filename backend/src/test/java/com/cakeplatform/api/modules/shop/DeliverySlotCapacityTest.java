package com.cakeplatform.api.modules.shop;

import com.cakeplatform.api.exception.DeliverySlotFullException;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductCategoryRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.controller.OwnerDeliverySlotController;
import com.cakeplatform.api.modules.shop.dto.DeliverySlotRequest;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontService;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontDeliverySlotResponse;
import com.cakeplatform.api.modules.storefront.dto.StorefrontOrderItem;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DeliverySlotCapacityTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ShopDeliverySlotRepository deliverySlotRepository;

    @Mock
    private ProductCategoryRepository categoryRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @Mock
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;

    private CustomerStorefrontService storefrontService;
    private OwnerDeliverySlotController ownerDeliverySlotController;

    private Shop testShop;
    private User testOwner;
    private ShopDeliverySlot slot;
    private Product testProduct;
    private LocalDate upcomingDate;

    @BeforeEach
    void setUp() {
        storefrontService = new CustomerStorefrontService(
                shopRepository,
                productRepository,
                orderRepository,
                null,
                null,
                null,
                null,
                categoryRepository,
                deliverySlotRepository,
                null, null, null, null, null, null, null,
                subscriptionRepository,
                null
        );

        ownerDeliverySlotController = new OwnerDeliverySlotController(
                deliverySlotRepository,
                shopAccessValidator,
                orderRepository
        );

        testOwner = new User();
        testOwner.setId(1L);
        testOwner.setEmail("baker@cakestore.com");
        testOwner.setRole(UserRole.SHOP_OWNER);

        testShop = new Shop();
        testShop.setId(10L);
        testShop.setBusinessName("Sweet Delights");
        testShop.setStatus(ShopStatus.ACTIVE);
        testShop.setOwner(testOwner);
        
        com.cakeplatform.api.modules.subscription.Subscription sub = new com.cakeplatform.api.modules.subscription.Subscription();
        sub.setId(1L);
        sub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        sub.setExpiryDate(java.time.LocalDateTime.now().plusDays(30));
        lenient().when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(10L)).thenReturn(java.util.Optional.of(sub));

        // Find a future Saturday to test dayOfWeek logic
        LocalDate d = LocalDate.now().plusDays(1);
        while (d.getDayOfWeek() != DayOfWeek.SATURDAY) {
            d = d.plusDays(1);
        }
        upcomingDate = d;

        slot = new ShopDeliverySlot();
        slot.setId(101L);
        slot.setShop(testShop);
        slot.setDayOfWeek("SATURDAY");
        slot.setStartTime(LocalTime.of(10, 0));
        slot.setEndTime(LocalTime.of(14, 0));
        slot.setMaxOrders(5);
        slot.setIsActive(true);

        testShop.setDeliverySlots(new ArrayList<>(List.of(slot)));

        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setShop(testShop);
        testProduct.setName("Chocolate Truffle Cake");
        testProduct.setPrice(BigDecimal.valueOf(600));
        testProduct.setAvailability(true);
        testProduct.setStatus("ACTIVE");
    }

    private GuestOrderRequest createSampleOrderRequest(Long slotId, LocalDate date) {
        GuestOrderRequest req = new GuestOrderRequest();
        req.setCustomerName("Aarav Patel");
        req.setCustomerEmail("aarav@example.com");
        req.setCustomerPhone("9876543210");
        req.setDeliveryAddress("104 Sunshine Apts, Baner");
        req.setPaymentMethod("COD");
        req.setDeliveryDate(date);
        req.setDeliverySlotId(slotId);

        StorefrontOrderItem item = new StorefrontOrderItem();
        item.setProductId(1L);
        item.setQuantity(1);
        req.setItems(List.of(item));

        return req;
    }

    @Test
    @DisplayName("H2.1: Capacity 5, zero booked orders -> Available with remainingCapacity = 5")
    void testCapacity5_ZeroBooked_ReturnsAvailable5() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate)).thenReturn(0L);

        List<StorefrontDeliverySlotResponse> slots = storefrontService.getShopDeliverySlots(10L, upcomingDate);

        assertEquals(1, slots.size());
        StorefrontDeliverySlotResponse res = slots.get(0);
        assertEquals(5, res.getMaxOrders());
        assertEquals(0, res.getBookedOrders());
        assertEquals(5, res.getRemainingCapacity());
        assertTrue(res.getAvailable());
    }

    @Test
    @DisplayName("H2.2: Capacity 5, 4 booked orders -> Available with remainingCapacity = 1")
    void testCapacity5_FourBooked_ReturnsAvailable1() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate)).thenReturn(4L);

        List<StorefrontDeliverySlotResponse> slots = storefrontService.getShopDeliverySlots(10L, upcomingDate);

        assertEquals(1, slots.size());
        StorefrontDeliverySlotResponse res = slots.get(0);
        assertEquals(4, res.getBookedOrders());
        assertEquals(1, res.getRemainingCapacity());
        assertTrue(res.getAvailable());
    }

    @Test
    @DisplayName("H2.3: Capacity 5, 5 booked orders -> Fully booked with remainingCapacity = 0, available = false")
    void testCapacity5_FiveBooked_ReturnsFullyBooked() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate)).thenReturn(5L);

        List<StorefrontDeliverySlotResponse> slots = storefrontService.getShopDeliverySlots(10L, upcomingDate);

        assertEquals(1, slots.size());
        StorefrontDeliverySlotResponse res = slots.get(0);
        assertEquals(5, res.getBookedOrders());
        assertEquals(0, res.getRemainingCapacity());
        assertFalse(res.getAvailable());
    }

    @Test
    @DisplayName("H2.4: Last available slot (booked 4 of 5) successfully places order")
    void testLastAvailableSlot_Succeeds() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(productRepository.findByIdAndShopId(1L, 10L)).thenReturn(Optional.of(testProduct));
        when(deliverySlotRepository.findByIdAndShopIdWithLock(101L, 10L)).thenReturn(Optional.of(slot));
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate)).thenReturn(4L);
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(101L);
            return o;
        });

        GuestOrderRequest request = createSampleOrderRequest(101L, upcomingDate);
        Order placed = storefrontService.placeGuestOrder(10L, request);

        assertNotNull(placed);
        assertEquals("NEW", placed.getOrderStatus());
        assertEquals(slot, placed.getDeliverySlot());
        assertEquals(upcomingDate, placed.getDeliveryDate());
    }

    @Test
    @DisplayName("H2.5: Overbooking attempt when slot is full throws DeliverySlotFullException with SLOT_FULL")
    void testSlotFull_ThrowsDeliverySlotFullException() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(deliverySlotRepository.findByIdAndShopIdWithLock(101L, 10L)).thenReturn(Optional.of(slot));
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate)).thenReturn(5L); // Max is 5

        GuestOrderRequest request = createSampleOrderRequest(101L, upcomingDate);

        DeliverySlotFullException ex = assertThrows(DeliverySlotFullException.class, () ->
                storefrontService.placeGuestOrder(10L, request)
        );

        assertEquals("SLOT_FULL", ex.getErrorCode());
        assertTrue(ex.getMessage().contains("fully booked"));
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    @DisplayName("H2.6: Order cancellation releases slot capacity: order can now be placed")
    void testCancelledOrder_ReleasesCapacity() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(productRepository.findByIdAndShopId(1L, 10L)).thenReturn(Optional.of(testProduct));
        when(deliverySlotRepository.findByIdAndShopIdWithLock(101L, 10L)).thenReturn(Optional.of(slot));
        // Initially 5 booked, but 1 was cancelled so active count is now 4
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate)).thenReturn(4L);
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(101L);
            return o;
        });

        GuestOrderRequest request = createSampleOrderRequest(101L, upcomingDate);
        Order placed = storefrontService.placeGuestOrder(10L, request);

        assertNotNull(placed);
        assertEquals("NEW", placed.getOrderStatus());
    }

    @Test
    @DisplayName("H2.7: Inactive delivery slot is rejected with 400 Bad Request")
    void testInactiveSlot_Rejected() {
        slot.setIsActive(false);
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(deliverySlotRepository.findByIdAndShopIdWithLock(101L, 10L)).thenReturn(Optional.of(slot));

        GuestOrderRequest request = createSampleOrderRequest(101L, upcomingDate);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                storefrontService.placeGuestOrder(10L, request)
        );

        assertTrue(ex.getMessage().contains("inactive"));
    }

    @Test
    @DisplayName("H2.8: Delivery date in the past is rejected with 400 Bad Request")
    void testPastDate_Rejected() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        LocalDate pastDate = LocalDate.now().minusDays(1);
        GuestOrderRequest request = createSampleOrderRequest(101L, pastDate);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                storefrontService.placeGuestOrder(10L, request)
        );

        assertTrue(ex.getMessage().contains("past"));
    }

    @Test
    @DisplayName("H2.9: Cross-shop delivery slot manipulation is rejected with 400 Bad Request")
    void testCrossShopSlot_Rejected() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        // Slot 999 does not belong to Shop 10L
        when(deliverySlotRepository.findByIdAndShopIdWithLock(999L, 10L)).thenReturn(Optional.empty());

        GuestOrderRequest request = createSampleOrderRequest(999L, upcomingDate);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                storefrontService.placeGuestOrder(10L, request)
        );

        assertTrue(ex.getMessage().contains("does not belong"));
    }

    @Test
    @DisplayName("H2.10: Day of week mismatch (e.g. Saturday slot used for Sunday) is rejected")
    void testDayOfWeekMismatch_Rejected() {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(deliverySlotRepository.findByIdAndShopIdWithLock(101L, 10L)).thenReturn(Optional.of(slot));

        // upcomingDate is Saturday, let's pick Sunday
        LocalDate sunday = upcomingDate.plusDays(1);
        GuestOrderRequest request = createSampleOrderRequest(101L, sunday);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                storefrontService.placeGuestOrder(10L, request)
        );

        assertTrue(ex.getMessage().contains("SATURDAY"));
    }

    @Test
    @DisplayName("H2.11: Owner cannot reduce slot capacity below active bookings on upcoming dates")
    void testOwnerCannotReduceCapacityBelowActiveBookings() {
        CustomUserDetails userDetails = new CustomUserDetails(testOwner);
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(testShop);
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(slot));
        // Slot currently has 4 active bookings scheduled on an upcoming date
        when(orderRepository.findMaxActiveOrdersOnAnyUpcomingDate(101L)).thenReturn(4);

        DeliverySlotRequest updateReq = new DeliverySlotRequest();
        updateReq.setDayOfWeek("SATURDAY");
        updateReq.setStartTime(LocalTime.of(10, 0));
        updateReq.setEndTime(LocalTime.of(14, 0));
        updateReq.setMaxOrders(2); // Attempt to lower to 2 (which is < 4)

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                ownerDeliverySlotController.updateSlot(userDetails, 101L, updateReq)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Capacity cannot be lower than the number of active orders"));
    }

    @Test
    @DisplayName("H2.12: Owner can safely increase slot capacity")
    void testOwnerCanIncreaseCapacity() {
        CustomUserDetails userDetails = new CustomUserDetails(testOwner);
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(testShop);
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(slot));
        when(orderRepository.findMaxActiveOrdersOnAnyUpcomingDate(101L)).thenReturn(4);
        when(deliverySlotRepository.save(any(ShopDeliverySlot.class))).thenAnswer(i -> i.getArgument(0));

        DeliverySlotRequest updateReq = new DeliverySlotRequest();
        updateReq.setDayOfWeek("SATURDAY");
        updateReq.setStartTime(LocalTime.of(10, 0));
        updateReq.setEndTime(LocalTime.of(14, 0));
        updateReq.setMaxOrders(8); // Increase 5 -> 8

        ResponseEntity<ShopDeliverySlot> res = ownerDeliverySlotController.updateSlot(userDetails, 101L, updateReq);

        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(8, res.getBody().getMaxOrders());
    }

    @Test
    @DisplayName("H2.13: Owner cannot set zero or negative capacity")
    void testOwnerCannotSetZeroOrNegativeCapacity() {
        CustomUserDetails userDetails = new CustomUserDetails(testOwner);
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(testShop);
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(slot));

        DeliverySlotRequest updateReq = new DeliverySlotRequest();
        updateReq.setDayOfWeek("SATURDAY");
        updateReq.setStartTime(LocalTime.of(10, 0));
        updateReq.setEndTime(LocalTime.of(14, 0));
        updateReq.setMaxOrders(0);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                ownerDeliverySlotController.updateSlot(userDetails, 101L, updateReq)
        );

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    @DisplayName("H2.14: Owner B cannot modify Owner A's delivery slot (403 Forbidden)")
    void testOwnerBCannotModifyOwnerASlot() {
        User otherOwner = new User();
        otherOwner.setId(99L);
        Shop otherShop = new Shop();
        otherShop.setId(999L);

        CustomUserDetails userDetails = new CustomUserDetails(otherOwner);
        when(shopAccessValidator.getValidShopForOwner(99L)).thenReturn(otherShop);
        when(deliverySlotRepository.findById(101L)).thenReturn(Optional.of(slot)); // Slot belongs to Shop 10L

        DeliverySlotRequest updateReq = new DeliverySlotRequest();
        updateReq.setDayOfWeek("SATURDAY");
        updateReq.setStartTime(LocalTime.of(10, 0));
        updateReq.setEndTime(LocalTime.of(14, 0));
        updateReq.setMaxOrders(10);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                ownerDeliverySlotController.updateSlot(userDetails, 101L, updateReq)
        );

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    @DisplayName("H2.15: Concurrency simulation: When 1 capacity remains, only 1 order succeeds and the other receives SLOT_FULL")
    void testConcurrentBookingForLastCapacitySlot() throws Exception {
        when(shopRepository.findById(10L)).thenReturn(Optional.of(testShop));
        when(productRepository.findByIdAndShopId(1L, 10L)).thenReturn(Optional.of(testProduct));
        when(deliverySlotRepository.findByIdAndShopIdWithLock(101L, 10L)).thenReturn(Optional.of(slot));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> {
            Order o = i.getArgument(0);
            o.setId(101L);
            return o;
        });

        // Simulate database state under row lock:
        // First caller sees booked = 4 (succeeds, increments booked count)
        // Second caller sees booked = 5 (fails with SLOT_FULL)
        AtomicInteger currentBooked = new AtomicInteger(4);
        when(orderRepository.countActiveOrdersForSlotAndDate(101L, upcomingDate))
                .thenAnswer(invocation -> (long) currentBooked.getAndIncrement());

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch latch = new CountDownLatch(1);

        Callable<String> task1 = () -> {
            latch.await();
            try {
                storefrontService.placeGuestOrder(10L, createSampleOrderRequest(101L, upcomingDate));
                return "SUCCESS";
            } catch (DeliverySlotFullException e) {
                return "SLOT_FULL";
            }
        };

        Callable<String> task2 = () -> {
            latch.await();
            try {
                storefrontService.placeGuestOrder(10L, createSampleOrderRequest(101L, upcomingDate));
                return "SUCCESS";
            } catch (DeliverySlotFullException e) {
                return "SLOT_FULL";
            }
        };

        Future<String> f1 = executor.submit(task1);
        Future<String> f2 = executor.submit(task2);

        latch.countDown(); // release both threads simultaneously

        String r1 = f1.get(5, TimeUnit.SECONDS);
        String r2 = f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        List<String> results = List.of(r1, r2);
        assertTrue(results.contains("SUCCESS"), "One order must succeed");
        assertTrue(results.contains("SLOT_FULL"), "The competing order must receive SLOT_FULL");
    }
}
