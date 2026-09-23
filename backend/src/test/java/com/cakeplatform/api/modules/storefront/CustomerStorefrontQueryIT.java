package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.shop.ShopRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class CustomerStorefrontQueryIT {

    @Autowired 
    private ShopRepository shopRepository;

    @Test 
    void testFindPopularCities() { 
        shopRepository.findPopularCities(); 
    }
    
    @Test 
    void testFindActiveShopsWithSummaryOrderByRating() {
        shopRepository.findActiveShopsWithSummaryOrderByRating(null, null, null, null, null, null, null, null, 10, 0);
    }
    
    @Test 
    void testFindActiveShopsWithSummaryOrderByNewest() {
        shopRepository.findActiveShopsWithSummaryOrderByNewest(null, null, null, null, null, null, null, null, 10, 0);
    }
    
    @Test 
    void testFindNearbyActiveShopsOrderByDistance() {
        shopRepository.findNearbyActiveShopsOrderByDistance(0.0, 0.0, -10.0, 10.0, -10.0, 10.0, 100.0, null, null, null, null, null, null, null, 10, 0);
    }
    
    @Test 
    void testFindNearbyActiveShopsOrderByRating() {
        shopRepository.findNearbyActiveShopsOrderByRating(0.0, 0.0, -10.0, 10.0, -10.0, 10.0, 100.0, null, null, null, null, null, null, null, 10, 0);
    }
    
    @Test 
    void testFindNearbyActiveShopsOrderByNewest() {
        shopRepository.findNearbyActiveShopsOrderByNewest(0.0, 0.0, -10.0, 10.0, -10.0, 10.0, 100.0, null, null, null, null, null, null, null, 10, 0);
    }
}
