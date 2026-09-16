package com.cakeplatform.api.modules.storefront;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StorefrontCacheServiceTest {

    @Mock
    private CacheManager cacheManager;

    @Mock
    private Cache cache;

    private StorefrontCacheService storefrontCacheService;

    @BeforeEach
    void setUp() {
        storefrontCacheService = new StorefrontCacheService(cacheManager);
    }

    @Test
    void testEvictShopDetails_Success() {
        when(cacheManager.getCache("shopDetails")).thenReturn(cache);

        storefrontCacheService.evictShopDetails(42L);

        verify(cacheManager).getCache("shopDetails");
        verify(cache).evict(42L);
    }

    @Test
    void testEvictShopDetails_NullShopId_NoOp() {
        storefrontCacheService.evictShopDetails(null);

        verifyNoInteractions(cacheManager);
    }

    @Test
    void testEvictShopDetails_NullCache_NoException() {
        when(cacheManager.getCache("shopDetails")).thenReturn(null);

        assertDoesNotThrow(() -> storefrontCacheService.evictShopDetails(42L));
        verify(cacheManager).getCache("shopDetails");
    }

    @Test
    void testEvictShopDetails_ExceptionSwallowedSafely() {
        when(cacheManager.getCache("shopDetails")).thenThrow(new RuntimeException("Redis unavailable"));

        assertDoesNotThrow(() -> storefrontCacheService.evictShopDetails(42L));
    }
}
