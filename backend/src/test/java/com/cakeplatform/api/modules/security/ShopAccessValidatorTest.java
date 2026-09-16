package com.cakeplatform.api.modules.security;

import com.cakeplatform.api.exception.SubscriptionExpiredException;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ShopAccessValidatorTest {

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @InjectMocks
    private ShopAccessValidator shopAccessValidator;

    private Shop mockShop;
    private Subscription mockSubscription;

    @BeforeEach
    void setUp() {
        mockShop = new Shop();
        mockShop.setId(100L);
        mockShop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE);
        mockShop.setVerificationStatus(VerificationStatus.VERIFIED);

        mockSubscription = new Subscription();
        mockSubscription.setStatus(SubscriptionStatus.ACTIVE);
    }

    @Test
    void testGetValidShopForOwner_Success() {
        // Arrange
        Long ownerId = 1L;
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(mockShop.getId()))
                .thenReturn(Optional.of(mockSubscription));

        // Act
        Shop result = shopAccessValidator.getValidShopForOwner(ownerId);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());
    }

    @Test
    void testGetValidShopForOwner_NoShopFound() {
        // Arrange
        Long ownerId = 2L;
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of());

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertEquals("Shop not found for this user", exception.getMessage());
    }

    @Test
    void testGetValidShopForOwner_ShopSuspended() {
        // Arrange
        Long ownerId = 3L;
        mockShop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.SUSPENDED);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));

        // Act & Assert
        SubscriptionExpiredException exception = assertThrows(SubscriptionExpiredException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertTrue(exception.getMessage().contains("suspended by administration"));
    }

    @Test
    void testGetValidShopForOwner_ShopNotVerified_AllowsAccessIfActive() {
        // Arrange
        Long ownerId = 4L;
        mockShop.setStatus(ShopStatus.ACTIVE);
        mockShop.setVerificationStatus(VerificationStatus.PROCESSING);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(mockShop.getId()))
                .thenReturn(Optional.of(mockSubscription));

        // Act
        Shop result = shopAccessValidator.getValidShopForOwner(ownerId);

        // Assert: Under Rule 2, ACTIVE shop with active subscription has operational access even while verification is PROCESSING
        assertNotNull(result);
        assertEquals(mockShop.getId(), result.getId());
    }

    @Test
    void testGetValidShopForOwner_SubscriptionExpired() {
        // Arrange
        Long ownerId = 5L;
        mockSubscription.setStatus(SubscriptionStatus.EXPIRED);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(mockShop.getId()))
                .thenReturn(Optional.of(mockSubscription));

        // Act & Assert
        SubscriptionExpiredException exception = assertThrows(SubscriptionExpiredException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertTrue(exception.getMessage().contains("Subscription is EXPIRED"));
    }

    @Test
    void testGetValidShopForOwner_ShopInactive() {
        // Arrange
        Long ownerId = 6L;
        mockShop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.INACTIVE);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(mockShop.getId()))
                .thenReturn(Optional.of(mockSubscription));

        // Act & Assert
        SubscriptionExpiredException exception = assertThrows(SubscriptionExpiredException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertTrue(exception.getMessage().contains("Shop is currently INACTIVE"));
    }

    @Test
    void testGetValidShopForOwner_NoSubscription() {
        // Arrange
        Long ownerId = 7L;
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));
        when(subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(mockShop.getId()))
                .thenReturn(Optional.empty());

        // Act & Assert
        SubscriptionExpiredException exception = assertThrows(SubscriptionExpiredException.class, () -> {
            shopAccessValidator.getValidShopForOwner(ownerId);
        });

        assertTrue(exception.getMessage().contains("No subscription found"));
    }

    @Test
    void testGetShopByOwnerId_AllowsUnverifiedOrSuspended() {
        // Arrange - Unverified & Suspended shop should still be retrieved for recovery/profile viewing
        Long ownerId = 8L;
        mockShop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.SUSPENDED);
        mockShop.setVerificationStatus(VerificationStatus.PROCESSING);
        when(shopRepository.findByOwnerId(ownerId)).thenReturn(List.of(mockShop));

        // Act
        Shop result = shopAccessValidator.getShopByOwnerId(ownerId);

        // Assert
        assertNotNull(result);
        assertEquals(100L, result.getId());
        assertEquals(com.cakeplatform.api.modules.shop.ShopStatus.SUSPENDED, result.getStatus());
    }
}
