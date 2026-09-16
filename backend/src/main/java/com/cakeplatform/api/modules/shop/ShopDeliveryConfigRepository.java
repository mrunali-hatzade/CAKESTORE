package com.cakeplatform.api.modules.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShopDeliveryConfigRepository extends JpaRepository<ShopDeliveryConfig, Long> {
    Optional<ShopDeliveryConfig> findByShopId(Long shopId);
    void deleteByShopId(Long shopId);
}
