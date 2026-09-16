package com.cakeplatform.api.modules.storefront;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorefrontCacheService {

    private final CacheManager cacheManager;

    /**
     * Safely evicts the cached storefront details for a specific bakery.
     * Ensures owner storefront customizations, delivery configuration, and shop profile
     * updates reflect immediately on customer storefront requests.
     *
     * @param shopId the unique ID of the bakery shop
     */
    public void evictShopDetails(Long shopId) {
        if (shopId == null) {
            return;
        }
        try {
            if (cacheManager != null) {
                Cache cache = cacheManager.getCache("shopDetails");
                if (cache != null) {
                    cache.evict(shopId);
                    log.info("Successfully evicted storefront shopDetails cache for shopId: {}", shopId);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to evict storefront shopDetails cache for shopId: {}: {}", shopId, e.getMessage());
        }
    }
}
