package com.cakeplatform.api.modules.security;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopAccessValidator {

    private final ShopRepository shopRepository;
    private final SubscriptionRepository subscriptionRepository;

    /**
     * Basic shop lookup by owner ID. Ensures tenant isolation (shop belongs to owner).
     * Does NOT enforce operational lifecycle gating, allowing account recovery, settings, and subscription viewing.
     */
    @Transactional(readOnly = true)
    public Shop getShopByOwnerId(Long ownerId) {
        List<Shop> shops = shopRepository.findByOwnerId(ownerId);
        if (shops.isEmpty()) {
            throw new IllegalArgumentException("Shop not found for this user");
        }
        if (shops.size() > 1) {
            log.error("Data integrity violation: Owner ID {} owns {} shops. Strictly one shop allowed per owner.", ownerId, shops.size());
            throw new IllegalStateException("Multiple shops found for single owner account");
        }
        return shops.get(0);
    }

    /**
     * Strict operational access gating for owner actions.
     * Enforces:
     * 1. Shop exists for owner (Tenant Isolation)
     * 2. Shop is not SUSPENDED
     * 3. Shop has an ACTIVE (unexpired) Subscription
     * 4. Shop status is ACTIVE
     */
    @Transactional(readOnly = true)
    public Shop getValidShopForOwner(Long ownerId) {
        Shop shop = getShopByOwnerId(ownerId);

        // Check 0: Suspended shops must be blocked from operational functions
        if (shop.getStatus() == com.cakeplatform.api.modules.shop.ShopStatus.SUSPENDED) {
            throw new com.cakeplatform.api.exception.SubscriptionExpiredException("Shop is suspended by administration. Please contact support.");
        }

        // Check 2: Active Subscription
        Subscription latestSub = subscriptionRepository.findFirstByShopIdOrderByCreatedAtDesc(shop.getId())
                .orElseThrow(() -> new com.cakeplatform.api.exception.SubscriptionExpiredException("No subscription found. Please subscribe to a plan."));

        if (latestSub.getStatus() == SubscriptionStatus.EXPIRED || 
            latestSub.getStatus() == SubscriptionStatus.SUSPENDED || 
            latestSub.getStatus() == SubscriptionStatus.CANCELLED ||
            (latestSub.getExpiryDate() != null && latestSub.getExpiryDate().isBefore(java.time.LocalDateTime.now()))) {
            throw new com.cakeplatform.api.exception.SubscriptionExpiredException("Subscription is " + latestSub.getStatus().name() + ". Please renew to access this feature.");
        }

        // Check 3: Shop must be ACTIVE
        if (shop.getStatus() != com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE) {
            throw new com.cakeplatform.api.exception.SubscriptionExpiredException("Shop is currently " + shop.getStatus().name() + ". Please activate your subscription.");
        }

        return shop;
    }
}
