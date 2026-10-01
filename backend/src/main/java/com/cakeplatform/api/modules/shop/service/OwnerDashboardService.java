package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.interaction.Enquiry;
import com.cakeplatform.api.modules.interaction.EnquiryRepository;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse;
import com.cakeplatform.api.modules.shop.dto.OwnerDashboardStatsResponse;
import com.cakeplatform.api.modules.shop.dto.OwnerGlobalSearchResponse;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OwnerDashboardService {

    private final ShopRepository shopRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final EnquiryRepository enquiryRepository;
    private final CustomCakeRequestRepository customCakeRequestRepository;
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

    public OwnerGlobalSearchResponse globalSearch(Long ownerId, String rawQuery) {
        if (rawQuery == null || rawQuery.trim().length() < 2) {
            return new OwnerGlobalSearchResponse();
        }

        String query = rawQuery.trim();
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        Long shopId = shop.getId();
        Pageable limit = PageRequest.of(0, 5);

        // 1. Orders
        List<Order> orders = orderRepository.searchOrdersByShopId(shopId, query, limit);
        List<OwnerGlobalSearchResponse.OrderSearchResult> orderResults = orders.stream()
                .map(o -> OwnerGlobalSearchResponse.OrderSearchResult.builder()
                        .id(o.getId())
                        .orderNumber(o.getOrderNumber())
                        .customerName(o.getCustomerName())
                        .customerPhone(o.getCustomerPhone())
                        .totalAmount(o.getTotalAmount())
                        .orderStatus(o.getOrderStatus())
                        .paymentStatus(o.getPaymentStatus())
                        .createdAt(o.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // 2. Products
        List<Product> products = productRepository.searchProductsByShopId(shopId, query, limit);
        List<OwnerGlobalSearchResponse.ProductSearchResult> productResults = products.stream()
                .map(p -> OwnerGlobalSearchResponse.ProductSearchResult.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .price(p.getPrice())
                        .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                        .imageUrl(p.getImageUrl())
                        .status(p.getStatus())
                        .availability(p.getAvailability())
                        .build())
                .collect(Collectors.toList());

        // 3. Customers
        List<CustomerProfileResponse> customers = orderRepository.searchCustomerProfilesByShopId(shopId, query, limit);
        List<OwnerGlobalSearchResponse.CustomerSearchResult> customerResults = customers.stream()
                .map(c -> OwnerGlobalSearchResponse.CustomerSearchResult.builder()
                        .name(c.getName())
                        .email(c.getEmail())
                        .mobile(c.getMobile())
                        .totalOrders(c.getTotalOrders())
                        .totalSpent(c.getTotalSpent())
                        .lastOrderDate(c.getLastOrderDate())
                        .build())
                .collect(Collectors.toList());

        // 4. Custom Cakes
        List<CustomCakeRequest> customCakes = customCakeRequestRepository.searchCustomCakesByShopId(shopId, query, limit);
        List<OwnerGlobalSearchResponse.CustomCakeSearchResult> customCakeResults = customCakes.stream()
                .map(c -> OwnerGlobalSearchResponse.CustomCakeSearchResult.builder()
                        .id(c.getId())
                        .customerName(c.getCustomerName())
                        .occasion(c.getOccasion())
                        .flavour(c.getFlavour())
                        .budget(c.getBudget())
                        .status(c.getStatus())
                        .createdAt(c.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        // 5. Inquiries
        List<Enquiry> enquiries = enquiryRepository.searchEnquiriesByShopId(shopId, query, limit);
        List<OwnerGlobalSearchResponse.EnquirySearchResult> enquiryResults = enquiries.stream()
                .map(e -> OwnerGlobalSearchResponse.EnquirySearchResult.builder()
                        .id(e.getId())
                        .customerName(e.getCustomerName())
                        .enquiryType(e.getEnquiryType())
                        .messageSnippet(e.getMessage() != null && e.getMessage().length() > 80 
                                ? e.getMessage().substring(0, 80) + "..." 
                                : e.getMessage())
                        .status(e.getStatus())
                        .createdAt(e.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return OwnerGlobalSearchResponse.builder()
                .orders(orderResults)
                .products(productResults)
                .customers(customerResults)
                .customCakes(customCakeResults)
                .enquiries(enquiryResults)
                .build();
    }
}
