package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.dto.GalleryItemResponse;
import com.cakeplatform.api.modules.shop.service.GalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/storefront/shops/{shopId}/gallery")
@RequiredArgsConstructor
public class CustomerGalleryController {

    private final GalleryService galleryService;

    @GetMapping
    public ResponseEntity<List<GalleryItemResponse>> getShopGallery(@PathVariable Long shopId) {
        return ResponseEntity.ok(galleryService.getPublicShopGallery(shopId));
    }
}