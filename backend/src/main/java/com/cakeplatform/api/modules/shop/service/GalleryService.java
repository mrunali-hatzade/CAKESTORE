package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.exception.ResourceNotFoundException;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopGalleryItem;
import com.cakeplatform.api.modules.shop.ShopGalleryItemRepository;
import com.cakeplatform.api.modules.shop.dto.GalleryItemRequest;
import com.cakeplatform.api.modules.shop.dto.GalleryItemResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GalleryService {

    private final ShopGalleryItemRepository galleryItemRepository;
    private final ShopAccessValidator shopAccessValidator;

    private Shop getShopByOwnerId(Long ownerId) {
        return shopAccessValidator.getValidShopForOwner(ownerId);
    }

    @Transactional(readOnly = true)
    public List<GalleryItemResponse> getOwnerGalleryItems(Long ownerId) {
        Shop shop = getShopByOwnerId(ownerId);
        return galleryItemRepository.findByShopIdOrderByDisplayOrderAscCreatedAtDesc(shop.getId())
                .stream()
                .map(GalleryItemResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public GalleryItemResponse createGalleryItem(Long ownerId, GalleryItemRequest request) {
        Shop shop = getShopByOwnerId(ownerId);

        ShopGalleryItem item = new ShopGalleryItem();
        item.setShop(shop);
        item.setTitle(request.getTitle().trim());
        item.setCaption(request.getCaption() != null ? request.getCaption().trim() : null);
        item.setImageUrl(request.getImageUrl().trim());
        item.setCategoryName(request.getCategoryName() != null && !request.getCategoryName().trim().isEmpty() 
                ? request.getCategoryName().trim() 
                : "Bespoke");
        item.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        item.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        ShopGalleryItem saved = galleryItemRepository.save(item);
        return GalleryItemResponse.fromEntity(saved);
    }

    @Transactional
    public GalleryItemResponse updateGalleryItem(Long id, Long ownerId, GalleryItemRequest request) {
        Shop shop = getShopByOwnerId(ownerId);

        ShopGalleryItem item = galleryItemRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Gallery item not found or not owned by your shop: " + id));

        if (request.getTitle() != null) item.setTitle(request.getTitle().trim());
        if (request.getCaption() != null) item.setCaption(request.getCaption().trim());
        if (request.getImageUrl() != null) item.setImageUrl(request.getImageUrl().trim());
        if (request.getCategoryName() != null) item.setCategoryName(request.getCategoryName().trim());
        if (request.getDisplayOrder() != null) item.setDisplayOrder(request.getDisplayOrder());
        if (request.getIsActive() != null) item.setIsActive(request.getIsActive());

        ShopGalleryItem updated = galleryItemRepository.save(item);
        return GalleryItemResponse.fromEntity(updated);
    }

    @Transactional
    public void deleteGalleryItem(Long id, Long ownerId) {
        Shop shop = getShopByOwnerId(ownerId);

        ShopGalleryItem item = galleryItemRepository.findByIdAndShopId(id, shop.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Gallery item not found or not owned by your shop: " + id));

        galleryItemRepository.delete(item);
    }

    @Transactional(readOnly = true)
    public List<GalleryItemResponse> getPublicShopGallery(Long shopId) {
        return galleryItemRepository.findByShopIdAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(shopId)
                .stream()
                .map(GalleryItemResponse::fromEntity)
                .collect(Collectors.toList());
    }
}
