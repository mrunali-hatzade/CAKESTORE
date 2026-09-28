package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.dto.OwnerDashboardStatsResponse;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OwnerDashboardService {

    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final com.cakeplatform.api.modules.security.ShopAccessValidator shopAccessValidator;

    public OwnerDashboardStatsResponse getDashboardStats(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);

        OwnerDashboardStatsResponse stats = new OwnerDashboardStatsResponse();
        
        // Products
        stats.setTotalProducts(productRepository.countByShopId(shop.getId()));
        stats.setActiveProducts(productRepository.countByShopIdAndStatusAndAvailability(shop.getId(), "ACTIVE", true));
        
        // Orders
        stats.setTotalOrders(orderRepository.countVisibleOrdersByShopId(shop.getId()));
        stats.setPendingOrders(orderRepository.countPendingOrdersByShopId(shop.getId()));
        
        // Revenue
        BigDecimal revenue = orderRepository.sumRevenueByShopId(shop.getId());
        stats.setTotalRevenue(revenue != null ? revenue : BigDecimal.ZERO);
        
        // Status
        stats.setShopStatus(shop.getStatus().name());
        
        // Subscription Status
        List<Subscription> subscriptions = subscriptionRepository.findByShopId(shop.getId());
        if (!subscriptions.isEmpty()) {
            stats.setSubscriptionStatus(subscriptions.get(0).getStatus().name());
        } else {
            stats.setSubscriptionStatus("NONE");
        }

        return stats;
    }
}
