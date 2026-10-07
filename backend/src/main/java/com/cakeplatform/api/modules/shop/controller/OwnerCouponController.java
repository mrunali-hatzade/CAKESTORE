package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.Coupon;
import com.cakeplatform.api.modules.shop.CouponRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.dto.CouponRequest;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/coupons")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
@Slf4j
public class OwnerCouponController {

    private final CouponRepository couponRepository;
    private final ShopAccessValidator shopAccessValidator;

    /**
     * D2: Retrieve all coupons belonging to the authenticated owner's bakery.
     */
    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<Coupon>> getCoupons(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        
        if (size > 100) size = 100;
        if (size < 1) size = 10;
        if (page < 0) page = 0;
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending());
        
        return ResponseEntity.ok(couponRepository.findByShopIdWithFilters(
            shop.getId(), 
            search != null ? search.trim() : null, 
            status != null && !status.trim().isEmpty() ? status.trim().toUpperCase() : "ALL", 
            pageable
        ));
    }

    /**
     * D2: Create a new promotional coupon for owner's bakery with normalization.
     */
    @PostMapping
    public ResponseEntity<Coupon> createCoupon(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CouponRequest request) {
            
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        
        // 1. Normalization: uppercase and trim
        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : "";
        if (code.isEmpty()) {
            throw new IllegalArgumentException("Coupon code is required");
        }

        // 2. Uniqueness check for this specific bakery (case-insensitive)
        if (couponRepository.findByShopIdAndCodeIgnoreCase(shop.getId(), code).isPresent()) {
            throw new IllegalArgumentException("Coupon code '" + code + "' already exists for your bakery");
        }

        // 3. Discount validations
        validateCouponRequest(request);
        
        Coupon coupon = new Coupon();
        coupon.setShop(shop);
        coupon.setCode(code);
        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderValue(request.getMinOrderValue());
        coupon.setMaxDiscountCap(request.getMaxDiscountCap());
        coupon.setStartDate(request.getStartDate());
        coupon.setExpiryDate(request.getExpiryDate());
        coupon.setUsageLimit(request.getUsageLimit());
        coupon.setUsedCount(0);
        coupon.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        
        Coupon saved = couponRepository.save(coupon);
        log.info("Owner {} created coupon {} for shop {}", userDetails.getId(), code, shop.getId());
        return ResponseEntity.ok(saved);
    }

    /**
     * D2: Edit an existing coupon with strict database-level tenant isolation.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Coupon> updateCoupon(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody CouponRequest request) {

        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        Coupon coupon = couponRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found or does not belong to your bakery"));

        String newCode = request.getCode() != null ? request.getCode().trim().toUpperCase() : coupon.getCode();
        if (!newCode.equalsIgnoreCase(coupon.getCode())) {
            if (couponRepository.findByShopIdAndCodeIgnoreCase(shop.getId(), newCode).isPresent()) {
                throw new IllegalArgumentException("Coupon code '" + newCode + "' already exists for your bakery");
            }
            coupon.setCode(newCode);
        }

        validateCouponRequest(request);

        coupon.setDiscountType(request.getDiscountType());
        coupon.setDiscountValue(request.getDiscountValue());
        coupon.setMinOrderValue(request.getMinOrderValue());
        coupon.setMaxDiscountCap(request.getMaxDiscountCap());
        coupon.setStartDate(request.getStartDate());
        coupon.setExpiryDate(request.getExpiryDate());
        coupon.setUsageLimit(request.getUsageLimit());
        if (request.getIsActive() != null) {
            coupon.setIsActive(request.getIsActive());
        }

        Coupon updated = couponRepository.save(coupon);
        log.info("Owner {} updated coupon {} (ID: {}) for shop {}", userDetails.getId(), coupon.getCode(), id, shop.getId());
        return ResponseEntity.ok(updated);
    }

    /**
     * D2: Toggle coupon active/inactive status with tenant isolation.
     */
    @PatchMapping(value = {"/{id}/toggle", "/{id}/status"})
    public ResponseEntity<Coupon> toggleCouponStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {

        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        Coupon coupon = couponRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found or does not belong to your bakery"));

        coupon.setIsActive(!Boolean.TRUE.equals(coupon.getIsActive()));
        Coupon updated = couponRepository.save(coupon);
        log.info("Owner {} toggled coupon {} (ID: {}) to isActive={}", userDetails.getId(), coupon.getCode(), id, coupon.getIsActive());
        return ResponseEntity.ok(updated);
    }

    /**
     * D2: Delete coupon safely with tenant isolation.
     * If coupon was already used in orders, deactivates it to preserve historical audit records.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteCoupon(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {

        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        Coupon coupon = couponRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new IllegalArgumentException("Coupon not found or does not belong to your bakery"));

        if (coupon.getUsedCount() != null && coupon.getUsedCount() > 0) {
            coupon.setIsActive(false);
            couponRepository.save(coupon);
            log.info("Coupon {} (ID: {}) has {} uses, safely deactivated instead of deleted", coupon.getCode(), id, coupon.getUsedCount());
            return ResponseEntity.ok(Map.of("message", "Coupon has existing order history; deactivated to preserve audit records."));
        } else {
            couponRepository.delete(coupon);
            log.info("Coupon {} (ID: {}) deleted by owner {}", coupon.getCode(), id, userDetails.getId());
            return ResponseEntity.ok(Map.of("message", "Coupon deleted successfully."));
        }
    }

    private void validateCouponRequest(CouponRequest request) {
        if (request.getDiscountValue() == null || request.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Discount value must be greater than zero");
        }
        if (request.getDiscountType() == Coupon.DiscountType.PERCENTAGE
                && request.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Percentage discount cannot exceed 100%");
        }
        if (request.getStartDate() != null && request.getExpiryDate() != null
                && request.getExpiryDate().isBefore(request.getStartDate())) {
            throw new IllegalArgumentException("Expiry date cannot be before start date");
        }
    }
}


