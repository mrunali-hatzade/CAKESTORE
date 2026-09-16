package com.cakeplatform.api.modules.shop;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopCustomFormFieldRepository extends JpaRepository<ShopCustomFormField, Long> {
    List<ShopCustomFormField> findByShopIdOrderByDisplayOrderAsc(Long shopId);
    List<ShopCustomFormField> findByShopIdAndIsEnabledTrueOrderByDisplayOrderAsc(Long shopId);
    Optional<ShopCustomFormField> findByIdAndShopId(Long id, Long shopId);
    Optional<ShopCustomFormField> findByShopIdAndFieldKey(Long shopId, String fieldKey);
    void deleteByShopId(Long shopId);
}
