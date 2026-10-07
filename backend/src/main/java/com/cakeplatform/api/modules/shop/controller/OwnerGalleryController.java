package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.dto.GalleryItemRequest;
import com.cakeplatform.api.modules.shop.dto.GalleryItemResponse;
import com.cakeplatform.api.modules.shop.service.GalleryService;
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
@RequestMapping("/api/owner/gallery")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerGalleryController {

    private final GalleryService galleryService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<GalleryItemResponse>> getGalleryItems(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(galleryService.getOwnerGalleryItems(userDetails.getId(), search, pageable));
    }

    @PostMapping
    public ResponseEntity<GalleryItemResponse> createGalleryItem(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody GalleryItemRequest request) {
        GalleryItemResponse response = galleryService.createGalleryItem(userDetails.getId(), request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GalleryItemResponse> updateGalleryItem(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody GalleryItemRequest request) {
        GalleryItemResponse response = galleryService.updateGalleryItem(id, userDetails.getId(), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGalleryItem(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        galleryService.deleteGalleryItem(id, userDetails.getId());
        return ResponseEntity.ok(Map.of("message", "Gallery item deleted successfully"));
    }
}
