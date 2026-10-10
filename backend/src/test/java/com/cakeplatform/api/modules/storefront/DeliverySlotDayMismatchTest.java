package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.security.CustomUserDetails;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontOrderItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.time.DayOfWeek;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Verifies that an order whose delivery date does not match the slot's configured day
 * is rejected with an IllegalArgumentException.
 */
@SpringBootTest
class DeliverySlotDayMismatchTest {

    @Autowired
    private CustomerStorefrontService storefrontService;

    @Autowired
    private ShopDeliverySlotRepository slotRepository;

    @Autowired
    private com.cakeplatform.api.modules.shop.ShopRepository shopRepository;

    @Autowired
    private com.cakeplatform.api.modules.user.UserRepository userRepository;

    @MockBean
    private ShopAccessValidator shopAccessValidator;

    @Autowired
    private com.cakeplatform.api.modules.subscription.SubscriptionRepository subscriptionRepository;

    private User owner;
    private Shop shop;
    private ShopDeliverySlot slot;
    private CustomUserDetails mockUserDetails;

    @BeforeEach
    void setUp() {
        // Persist owner to generate ID
        owner = new User();
        owner.setEmail("owner" + UUID.randomUUID().toString() + "@cake.com");
        owner.setRole(UserRole.SHOP_OWNER);
        owner = userRepository.save(owner);

        // Persist shop with owner
        shop = new Shop();
        shop.setBusinessName("Day Mismatch Shop");
        shop.setOwner(owner);
        shop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE);
        shop = shopRepository.save(shop);
        
        com.cakeplatform.api.modules.subscription.Subscription sub = new com.cakeplatform.api.modules.subscription.Subscription();
        sub.setShop(shop);
        sub.setStatus(com.cakeplatform.api.modules.subscription.SubscriptionStatus.ACTIVE);
        sub.setExpiryDate(java.time.LocalDateTime.now().plusDays(30));
        sub.setAmount(java.math.BigDecimal.ZERO);
        subscriptionRepository.save(sub);

        // Slot configured for MONDAY
        slot = new ShopDeliverySlot();
        slot.setShop(shop);
        slot.setDayOfWeek("MONDAY");
        slot.setStartTime(java.time.LocalTime.of(9, 0));
        slot.setEndTime(java.time.LocalTime.of(12, 0));
        slot.setMaxOrders(5);
        slot.setIsActive(true);
        slot = slotRepository.save(slot);

        // Mock authentication for owner (not used directly in order placement, but needed for any internal checks)
        mockUserDetails = mock(CustomUserDetails.class);
        when(mockUserDetails.getId()).thenReturn(owner.getId());
        when(shopAccessValidator.getValidShopForOwner(owner.getId())).thenReturn(shop);
    }

    @Test
    @DisplayName("Order using slot on a non‑matching day is rejected")
    void dayMismatchRejected() {
        // Choose a delivery date that is a Tuesday (assuming today is not Monday)
        LocalDate nextTuesday = LocalDate.now().plusDays((DayOfWeek.TUESDAY.getValue() - LocalDate.now().getDayOfWeek().getValue() + 7) % 7);
        if (nextTuesday.getDayOfWeek() != DayOfWeek.TUESDAY) {
            nextTuesday = nextTuesday.plusWeeks(1);
        }

        GuestOrderRequest request = new GuestOrderRequest();
        request.setCustomerName("Test Customer");
        request.setCustomerEmail("test@example.com");
        request.setCustomerPhone("9876543210");
        request.setDeliveryAddress("123 Test St");
        request.setPaymentMethod("COD");
        request.setDeliveryDate(nextTuesday);
        request.setDeliverySlotId(slot.getId());

        StorefrontOrderItem item = new StorefrontOrderItem();
        item.setProductId(1L); // product existence not needed for day mismatch test; will be mocked elsewhere if needed
        item.setQuantity(1);
        request.setItems(java.util.List.of(item));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                storefrontService.placeGuestOrder(shop.getId(), request));
        assertTrue(ex.getMessage().contains("Delivery slot is for"), "Exception should mention day mismatch");
    }
}
