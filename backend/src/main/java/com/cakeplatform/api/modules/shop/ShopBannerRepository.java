package com.cakeplatform.api.modules.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopBannerRepository extends JpaRepository<ShopBanner, Long> {
    List<ShopBanner> findByShopIdOrderByDisplayOrderAsc(Long shopId);
    List<ShopBanner> findByShopIdAndIsActiveTrueOrderByDisplayOrderAsc(Long shopId);
    Optional<ShopBanner> findByIdAndShopId(Long id, Long shopId);
    void deleteByShopId(Long shopId);
}
