package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.storefront.dto.GuestOrderRequest;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopResponse;
import com.cakeplatform.api.modules.storefront.dto.StorefrontDeliverySlotResponse;
import com.cakeplatform.api.modules.storefront.dto.ValidateCouponRequest;
import com.cakeplatform.api.modules.storefront.dto.ValidateCouponResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/storefront/shops", "/api/customer/storefront"})
@RequiredArgsConstructor
public class CustomerStorefrontController {

    private final CustomerStorefrontService storefrontService;

    @GetMapping("/locations/popular-cities")
    public ResponseEntity<List<com.cakeplatform.api.modules.storefront.dto.PopularCityDTO>> getPopularCities(
            @RequestParam(required = false, defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(storefrontService.getPopularCities(limit));
    }

    @GetMapping("/{shopId}/categories")
    public ResponseEntity<List<com.cakeplatform.api.modules.product.dto.CategoryResponse>> getShopCategories(@PathVariable Long shopId) {
        return ResponseEntity.ok(storefrontService.getShopCategories(shopId));
    }

    @GetMapping("/{shopId}")
    public ResponseEntity<StorefrontShopResponse> getShopDetails(@PathVariable Long shopId) {
        return ResponseEntity.ok(storefrontService.getShopDetails(shopId));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchShops(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String area,
            @RequestParam(required = false) String pincode,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String businessType,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false, defaultValue = "10.0") Double radiusKm,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer size
    ) {
        com.cakeplatform.api.modules.shop.BusinessType parsedType = null;
        if (org.springframework.util.StringUtils.hasText(businessType)) {
            try {
                parsedType = com.cakeplatform.api.modules.shop.BusinessType.valueOf(businessType.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                if (page != null) {
                    return ResponseEntity.ok(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));
                }
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
        }

        if (page != null) {
            return ResponseEntity.ok(storefrontService.discoverShopsPaged(
                    country, state, district, city, area, pincode, parsedType, search, location,
                    latitude, longitude, radiusKm, sortBy, page, size
            ));
        } else {
            return ResponseEntity.ok(storefrontService.discoverShops(
                    country, state, district, city, area, pincode, parsedType, search, location,
                    latitude, longitude, radiusKm, sortBy
            ));
        }
    }

    // Backward-compatible method overload for legacy callers & unit tests
    public ResponseEntity<List<StorefrontShopResponse>> searchShops(
            String state,
            String district,
            String city,
            String area,
            String businessType,
            String search,
            String location
    ) {
        com.cakeplatform.api.modules.shop.BusinessType parsedType = null;
        if (org.springframework.util.StringUtils.hasText(businessType)) {
            try {
                parsedType = com.cakeplatform.api.modules.shop.BusinessType.valueOf(businessType.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
        }
        return ResponseEntity.ok(storefrontService.searchShops(state, district, city, area, parsedType, search, location));
    }


    @GetMapping("/{shopId}/delivery-slots")
    public ResponseEntity<List<StorefrontDeliverySlotResponse>> getShopDeliverySlots(
            @PathVariable Long shopId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date) {
        return ResponseEntity.ok(storefrontService.getShopDeliverySlots(shopId, date));
    }

    @GetMapping("/{shopId}/products")
    public ResponseEntity<List<Product>> getShopProducts(@PathVariable Long shopId) {
        return ResponseEntity.ok(storefrontService.getShopProducts(shopId));
    }

    @GetMapping("/{shopId}/products/top-rated")
    public ResponseEntity<List<Product>> getTopRatedProducts(
            @PathVariable Long shopId,
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(storefrontService.getTopRatedProducts(shopId, limit));
    }

    @GetMapping("/{shopId}/products/{productId}")
    public ResponseEntity<Product> getShopProductDetails(
            @PathVariable Long shopId,
            @PathVariable Long productId) {
        return ResponseEntity.ok(storefrontService.getShopProductDetails(shopId, productId));
    }

    @PostMapping("/{shopId}/orders")
    public ResponseEntity<Order> placeGuestOrder(
            @PathVariable Long shopId,
            @Valid @RequestBody GuestOrderRequest request) {
        return ResponseEntity.ok(storefrontService.placeGuestOrder(shopId, request));
    }

    @PostMapping("/{shopId}/coupons/validate")
    public ResponseEntity<ValidateCouponResponse> validateCoupon(
            @PathVariable Long shopId,
            @Valid @RequestBody ValidateCouponRequest request) {
        return ResponseEntity.ok(storefrontService.validateCouponForStorefront(shopId, request));
    }

    @GetMapping("/{shopId}/coupons")
    public ResponseEntity<List<com.cakeplatform.api.modules.storefront.dto.PublicCouponResponse>> getPublicShopCoupons(@PathVariable Long shopId) {
        return ResponseEntity.ok(storefrontService.getPublicShopCoupons(shopId));
    }

    @GetMapping("/orders/{orderNumber}")
    public ResponseEntity<Order> getGuestOrderDetails(@PathVariable String orderNumber) {
        return ResponseEntity.ok(storefrontService.getGuestOrder(orderNumber));
    }

    @GetMapping("/orders/{orderNumber}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(
            @PathVariable String orderNumber,
            @org.springframework.beans.factory.annotation.Autowired com.cakeplatform.api.modules.order.InvoiceService invoiceService) throws Exception {
            
        Order order = storefrontService.getGuestOrder(orderNumber);
        byte[] pdfBytes = invoiceService.generateInvoice(order);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "invoice-" + order.getOrderNumber() + ".pdf");
        
        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }
}
