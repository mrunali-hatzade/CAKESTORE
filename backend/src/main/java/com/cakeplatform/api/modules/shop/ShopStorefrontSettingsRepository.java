package com.cakeplatform.api.modules.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShopStorefrontSettingsRepository extends JpaRepository<ShopStorefrontSettings, Long> {
    Optional<ShopStorefrontSettings> findByShopId(Long shopId);
    void deleteByShopId(Long shopId);
}
