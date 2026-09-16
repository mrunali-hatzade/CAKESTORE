package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.shop.dto.*;
import com.cakeplatform.api.modules.shop.service.OwnerStorefrontService;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/storefront")
@PreAuthorize("hasRole('SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerStorefrontController {

    private final OwnerStorefrontService ownerStorefrontService;

    // --- Hero Banners ---
    @GetMapping("/banners")
    public ResponseEntity<List<ShopBanner>> getBanners(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.getBanners(userDetails.getId()));
    }

    @PostMapping("/banners")
    public ResponseEntity<ShopBanner> createBanner(
            @Valid @RequestBody ShopBannerRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.createBanner(userDetails.getId(), request));
    }

    @PutMapping("/banners/{id}")
    public ResponseEntity<ShopBanner> updateBanner(
            @PathVariable Long id,
            @Valid @RequestBody ShopBannerRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.updateBanner(userDetails.getId(), id, request));
    }

    @DeleteMapping("/banners/{id}")
    public ResponseEntity<?> deleteBanner(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ownerStorefrontService.deleteBanner(userDetails.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Banner deleted successfully"));
    }

    // --- Business Hours ---
    @GetMapping("/business-hours")
    public ResponseEntity<List<ShopBusinessHours>> getBusinessHours(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.getBusinessHours(userDetails.getId()));
    }

    @PostMapping("/business-hours")
    public ResponseEntity<ShopBusinessHours> saveBusinessHour(
            @Valid @RequestBody ShopBusinessHoursRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.saveBusinessHour(userDetails.getId(), request));
    }

    // --- Delivery Config ---
    @GetMapping("/delivery-config")
    public ResponseEntity<ShopDeliveryConfig> getDeliveryConfig(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.getDeliveryConfig(userDetails.getId()));
    }

    @PutMapping("/delivery-config")
    public ResponseEntity<ShopDeliveryConfig> updateDeliveryConfig(
            @Valid @RequestBody ShopDeliveryConfigRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.updateDeliveryConfig(userDetails.getId(), request));
    }

    // --- Storefront Settings ---
    @GetMapping("/settings")
    public ResponseEntity<ShopStorefrontSettings> getStorefrontSettings(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.getStorefrontSettings(userDetails.getId()));
    }

    @PutMapping("/settings")
    public ResponseEntity<ShopStorefrontSettings> updateStorefrontSettings(
            @Valid @RequestBody ShopStorefrontSettingsRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.updateStorefrontSettings(userDetails.getId(), request));
    }

    // --- Custom Cake Form Fields ---
    @GetMapping("/custom-fields")
    public ResponseEntity<List<ShopCustomFormField>> getCustomFormFields(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.getCustomFormFields(userDetails.getId()));
    }

    @PostMapping("/custom-fields")
    public ResponseEntity<ShopCustomFormField> createCustomFormField(
            @Valid @RequestBody ShopCustomFormFieldRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.createCustomFormField(userDetails.getId(), request));
    }

    @PutMapping("/custom-fields/{id}")
    public ResponseEntity<ShopCustomFormField> updateCustomFormField(
            @PathVariable Long id,
            @Valid @RequestBody ShopCustomFormFieldRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ownerStorefrontService.updateCustomFormField(userDetails.getId(), id, request));
    }

    @DeleteMapping("/custom-fields/{id}")
    public ResponseEntity<?> deleteCustomFormField(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ownerStorefrontService.deleteCustomFormField(userDetails.getId(), id);
        return ResponseEntity.ok(Map.of("message", "Custom form field deleted successfully"));
    }
}
