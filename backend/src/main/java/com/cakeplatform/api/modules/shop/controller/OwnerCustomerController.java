package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.dto.CustomerProfileResponse;
import com.cakeplatform.api.security.CustomUserDetails;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/owner/customers")
@PreAuthorize("hasRole('SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerCustomerController {

    private final OrderRepository orderRepository;
    private final ShopAccessValidator shopAccessValidator;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<CustomerProfileResponse>> getMyCustomers(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
            
        // Enforce maximum page size
        if (size > 50) {
            size = 50;
        }

        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());

        // Use the optimized JPQL grouped query, ordering by MAX(createdAt) directly in the query
        org.springframework.data.domain.Pageable pageable = 
            org.springframework.data.domain.PageRequest.of(page, size);

        org.springframework.data.domain.Page<CustomerProfileResponse> profiles = 
            orderRepository.findCustomerProfilesByShopId(shop.getId(), pageable);

        return ResponseEntity.ok(profiles);
    }

    @GetMapping("/{identifier}")
    public ResponseEntity<CustomerProfileResponse> getCustomerProfile(@PathVariable String identifier, @AuthenticationPrincipal CustomUserDetails userDetails) {
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        return ResponseEntity.ok(buildProfile(shop.getId(), identifier));
    }

    private CustomerProfileResponse buildProfile(Long shopId, String identifier) {
        List<Order> orders = new ArrayList<>();
        // 1. If identifier doesn't look like an email, prioritize lookup by customer name
        if (identifier != null && !identifier.contains("@")) {
            orders = orderRepository.findByShopIdAndCustomerNameOrderByCreatedAtDesc(shopId, identifier);
        }
        // 2. If not found or looks like an email, lookup by email
        if (orders.isEmpty() && identifier != null) {
            orders = orderRepository.findByShopIdAndCustomerEmailOrderByCreatedAtDesc(shopId, identifier);
        }
        // 3. Fallback to name search in case email had no matches
        if (orders.isEmpty() && identifier != null) {
            orders = orderRepository.findByShopIdAndCustomerNameOrderByCreatedAtDesc(shopId, identifier);
        }
        
        if (orders.isEmpty()) {
            throw new RuntimeException("Customer not found for this shop");
        }

        Order mostRecent = orders.get(0);
        
        BigDecimal totalSpent = orders.stream()
                .filter(o -> "PAID".equalsIgnoreCase(o.getPaymentStatus()) || "COMPLETED".equalsIgnoreCase(o.getPaymentStatus()))
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CustomerProfileResponse.builder()
                .name(mostRecent.getCustomerName())
                .email(mostRecent.getCustomerEmail())
                .mobile(mostRecent.getCustomerPhone())
                .address(mostRecent.getDeliveryAddress())
                .totalOrders(orders.size())
                .totalSpent(totalSpent)
                .lastOrderDate(mostRecent.getCreatedAt())
                .orderHistory(orders)
                .build();
    }
}
