package com.cakeplatform.api.modules.product.controller;

import com.cakeplatform.api.modules.product.dto.CategoryRequest;
import com.cakeplatform.api.modules.product.dto.CategoryResponse;
import com.cakeplatform.api.modules.product.service.CategoryService;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/categories")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerCategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(categoryService.getOwnerCategories(userDetails.getId()));
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.createCategory(userDetails.getId(), request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.updateCategory(id, userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCategory(
            @PathVariable Long id,
            @RequestParam(required = false) Long reassignToCategoryId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        categoryService.deleteCategory(id, userDetails.getId(), reassignToCategoryId);
        return ResponseEntity.ok(Map.of("message", "Category deleted successfully"));
    }
}
