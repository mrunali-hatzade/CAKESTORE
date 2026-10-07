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

    @org.springframework.data.jpa.repository.Query(
        "SELECT g FROM ShopGalleryItem g WHERE g.shop.id = :shopId " +
        "AND (:search IS NULL OR :search = '' OR LOWER(CONCAT(COALESCE(g.title,''), ' ', COALESCE(g.caption,''), ' ', COALESCE(g.categoryName,''))) LIKE LOWER(CONCAT('%', :search, '%'))) " +
        "ORDER BY g.displayOrder ASC, g.createdAt DESC")
    org.springframework.data.domain.Page<ShopGalleryItem> searchByShopId(
            @org.springframework.data.repository.query.Param("shopId") Long shopId,
            @org.springframework.data.repository.query.Param("search") String search,
            org.springframework.data.domain.Pageable pageable);
}
