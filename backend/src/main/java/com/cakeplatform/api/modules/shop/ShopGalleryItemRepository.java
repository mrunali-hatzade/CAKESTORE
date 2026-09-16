package com.cakeplatform.api.modules.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopGalleryItemRepository extends JpaRepository<ShopGalleryItem, Long> {

    List<ShopGalleryItem> findByShopIdAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(Long shopId);

    List<ShopGalleryItem> findByShopIdOrderByDisplayOrderAscCreatedAtDesc(Long shopId);

    Optional<ShopGalleryItem> findByIdAndShopId(Long id, Long shopId);

    boolean existsByIdAndShopId(Long id, Long shopId);
}
