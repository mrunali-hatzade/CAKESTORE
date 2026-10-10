package com.cakeplatform.api.modules.product.controller;

import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.dto.ProductRequest;
import com.cakeplatform.api.modules.product.service.ProductService;
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
@RequestMapping("/api/owner/products")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<Product>> getProducts(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(productService.getProductsByUserId(userDetails.getId(), search, categoryId, pageable));
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProductRequest request) {
        
        Product product = productService.createProduct(userDetails.getId(), request);
        return ResponseEntity.ok(product);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Product> updateProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ProductRequest request) {
        
        Product product = productService.updateProduct(id, userDetails.getId(), request);
        return ResponseEntity.ok(product);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        productService.deleteProduct(id, userDetails.getId());
        return ResponseEntity.ok(Map.of("message", "Product deleted successfully"));
    }
}
