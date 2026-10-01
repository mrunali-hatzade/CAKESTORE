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
        if (identifier != null && !identifier.isBlank()) {
            String trimmed = identifier.trim();
            // 1. If identifier contains '@', lookup by email
            if (trimmed.contains("@")) {
                orders = orderRepository.findByShopIdAndCustomerEmailOrderByCreatedAtDesc(shopId, trimmed.toLowerCase());
                if (orders.isEmpty()) {
                    orders = orderRepository.findByShopIdAndCustomerEmailOrderByCreatedAtDesc(shopId, trimmed);
                }
            }
            // 2. If phone number (digits)
            if (orders.isEmpty() && trimmed.replaceAll("[^0-9]", "").length() >= 7) {
                orders = orderRepository.findByShopIdAndCustomerPhoneOrderByCreatedAtDesc(shopId, trimmed);
                if (orders.isEmpty()) {
                    orders = orderRepository.findByShopIdAndCustomerPhoneOrderByCreatedAtDesc(shopId, trimmed.replaceAll("[^0-9]", ""));
                }
            }
            // 3. Fallback to name search
            if (orders.isEmpty()) {
                orders = orderRepository.findByShopIdAndCustomerNameOrderByCreatedAtDesc(shopId, trimmed);
            }
        }
        
        if (orders.isEmpty()) {
            throw new RuntimeException("Customer not found for this shop");
        }

        Order mostRecent = orders.get(0);
        
        BigDecimal totalSpent = orders.stream()
                .filter(o -> {
                    String ps = o.getPaymentStatus() != null ? o.getPaymentStatus().toUpperCase() : "";
                    String os = o.getOrderStatus() != null ? o.getOrderStatus().toUpperCase() : "";
                    return ("PAID".equals(ps) || "COMPLETED".equals(ps) || "COMPLETED".equals(os) || "DELIVERED".equals(os))
                            && !"REFUNDED".equals(ps) && !"FAILED".equals(ps) && !"CANCELLED".equals(os);
                })
                .map(Order::getTotalAmount)
                .filter(java.util.Objects::nonNull)
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
