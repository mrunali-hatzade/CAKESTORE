package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.shop.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;

@Service
public class OwnerStorefrontService {

    private final ShopAccessValidator shopAccessValidator;
    private final ShopBannerRepository shopBannerRepository;
    private final ShopBusinessHoursRepository shopBusinessHoursRepository;
    private final ShopDeliveryConfigRepository shopDeliveryConfigRepository;
    private final ShopStorefrontSettingsRepository shopStorefrontSettingsRepository;
    private final ShopCustomFormFieldRepository shopCustomFormFieldRepository;
    private final com.cakeplatform.api.modules.storefront.StorefrontCacheService storefrontCacheService;

    @org.springframework.beans.factory.annotation.Autowired
    public OwnerStorefrontService(
            ShopAccessValidator shopAccessValidator,
            ShopBannerRepository shopBannerRepository,
            ShopBusinessHoursRepository shopBusinessHoursRepository,
            ShopDeliveryConfigRepository shopDeliveryConfigRepository,
            ShopStorefrontSettingsRepository shopStorefrontSettingsRepository,
            ShopCustomFormFieldRepository shopCustomFormFieldRepository,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.cakeplatform.api.modules.storefront.StorefrontCacheService storefrontCacheService) {
        this.shopAccessValidator = shopAccessValidator;
        this.shopBannerRepository = shopBannerRepository;
        this.shopBusinessHoursRepository = shopBusinessHoursRepository;
        this.shopDeliveryConfigRepository = shopDeliveryConfigRepository;
        this.shopStorefrontSettingsRepository = shopStorefrontSettingsRepository;
        this.shopCustomFormFieldRepository = shopCustomFormFieldRepository;
        this.storefrontCacheService = storefrontCacheService;
    }

    public OwnerStorefrontService(
            ShopAccessValidator shopAccessValidator,
            ShopBannerRepository shopBannerRepository,
            ShopBusinessHoursRepository shopBusinessHoursRepository,
            ShopDeliveryConfigRepository shopDeliveryConfigRepository,
            ShopStorefrontSettingsRepository shopStorefrontSettingsRepository,
            ShopCustomFormFieldRepository shopCustomFormFieldRepository) {
        this(shopAccessValidator, shopBannerRepository, shopBusinessHoursRepository,
             shopDeliveryConfigRepository, shopStorefrontSettingsRepository,
             shopCustomFormFieldRepository, null);
    }

    // --- Banners ---
    public List<ShopBanner> getBanners(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return shopBannerRepository.findByShopIdOrderByDisplayOrderAsc(shop.getId());
    }

    @Transactional
    public ShopBanner createBanner(Long ownerId, ShopBannerRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopBanner banner = ShopBanner.builder()
                .shop(shop)
                .imageUrl(request.getImageUrl())
                .title(request.getTitle())
                .subtitle(request.getSubtitle())
                .buttonText(request.getButtonText())
                .buttonUrl(request.getButtonUrl())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();
        ShopBanner saved = shopBannerRepository.save(banner);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    @Transactional
    public ShopBanner updateBanner(Long ownerId, Long bannerId, ShopBannerRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopBanner banner = shopBannerRepository.findByIdAndShopId(bannerId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Banner not found or unauthorized"));

        banner.setImageUrl(request.getImageUrl());
        banner.setTitle(request.getTitle());
        banner.setSubtitle(request.getSubtitle());
        banner.setButtonText(request.getButtonText());
        banner.setButtonUrl(request.getButtonUrl());
        if (request.getDisplayOrder() != null) banner.setDisplayOrder(request.getDisplayOrder());
        if (request.getIsActive() != null) banner.setIsActive(request.getIsActive());

        ShopBanner saved = shopBannerRepository.save(banner);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    @Transactional
    public void deleteBanner(Long ownerId, Long bannerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopBanner banner = shopBannerRepository.findByIdAndShopId(bannerId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Banner not found or unauthorized"));
        shopBannerRepository.delete(banner);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
    }

    // --- Business Hours ---
    public List<ShopBusinessHours> getBusinessHours(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return shopBusinessHoursRepository.findByShopId(shop.getId());
    }

    @Transactional
    public ShopBusinessHours saveBusinessHour(Long ownerId, ShopBusinessHoursRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        String dayOfWeek = request.getDayOfWeek().trim().toUpperCase();

        ShopBusinessHours hours = shopBusinessHoursRepository.findByShopIdAndDayOfWeek(shop.getId(), dayOfWeek)
                .orElseGet(() -> ShopBusinessHours.builder().shop(shop).dayOfWeek(dayOfWeek).build());

        hours.setIsOpen(request.getIsOpen());
        hours.setOpenTime(request.getOpenTime() != null ? request.getOpenTime() : LocalTime.of(9, 0));
        hours.setCloseTime(request.getCloseTime() != null ? request.getCloseTime() : LocalTime.of(21, 0));

        ShopBusinessHours saved = shopBusinessHoursRepository.save(hours);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    // --- Delivery Config ---
    public ShopDeliveryConfig getDeliveryConfig(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return shopDeliveryConfigRepository.findByShopId(shop.getId())
                .orElseGet(() -> {
                    ShopDeliveryConfig defaultCfg = ShopDeliveryConfig.builder()
                            .shop(shop)
                            .deliveryChargeType("FIXED")
                            .fixedChargeAmount(java.math.BigDecimal.valueOf(50.00))
                            .minOrderForFreeDelivery(java.math.BigDecimal.valueOf(1000.00))
                            .build();
                    return shopDeliveryConfigRepository.save(defaultCfg);
                });
    }

    @Transactional
    public ShopDeliveryConfig updateDeliveryConfig(Long ownerId, ShopDeliveryConfigRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopDeliveryConfig config = shopDeliveryConfigRepository.findByShopId(shop.getId())
                .orElseGet(() -> ShopDeliveryConfig.builder().shop(shop).build());

        config.setDeliveryChargeType(request.getDeliveryChargeType().trim().toUpperCase());
        config.setFixedChargeAmount(request.getFixedChargeAmount());
        config.setMinOrderForFreeDelivery(request.getMinOrderForFreeDelivery());
        config.setDeliveryNotes(request.getDeliveryNotes());

        ShopDeliveryConfig saved = shopDeliveryConfigRepository.save(config);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    // --- Storefront Settings ---
    public ShopStorefrontSettings getStorefrontSettings(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return shopStorefrontSettingsRepository.findByShopId(shop.getId())
                .orElseGet(() -> {
                    ShopStorefrontSettings defaultSettings = ShopStorefrontSettings.builder()
                            .shop(shop)
                            .build();
                    return shopStorefrontSettingsRepository.save(defaultSettings);
                });
    }

    @Transactional
    public ShopStorefrontSettings updateStorefrontSettings(Long ownerId, ShopStorefrontSettingsRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopStorefrontSettings settings = shopStorefrontSettingsRepository.findByShopId(shop.getId())
                .orElseGet(() -> ShopStorefrontSettings.builder().shop(shop).build());

        settings.setHeroBannerEnabled(request.getHeroBannerEnabled());
        settings.setTopRatedEnabled(request.getTopRatedEnabled());
        settings.setReviewsEnabled(request.getReviewsEnabled());
        settings.setBakeryInfoEnabled(request.getBakeryInfoEnabled());
        settings.setCategoriesEnabled(request.getCategoriesEnabled());
        settings.setFiltersEnabled(request.getFiltersEnabled());
        settings.setRatingsEnabled(request.getRatingsEnabled());
        settings.setAboutStoryEnabled(request.getAboutStoryEnabled());
        settings.setAboutImageEnabled(request.getAboutImageEnabled());
        settings.setFulfillmentEnabled(request.getFulfillmentEnabled());
        settings.setLeadTimeDays(request.getLeadTimeDays());
        settings.setLeadTimeMessage(request.getLeadTimeMessage());
        settings.setCustomCakesEnabled(request.getCustomCakesEnabled());
        settings.setWhatsappEnabled(request.getWhatsappEnabled());
        settings.setPhoneEnabled(request.getPhoneEnabled());
        settings.setEmailEnabled(request.getEmailEnabled());
        settings.setAddressEnabled(request.getAddressEnabled());
        settings.setMapEnabled(request.getMapEnabled());
        settings.setBusinessHoursEnabled(request.getBusinessHoursEnabled());

        ShopStorefrontSettings saved = shopStorefrontSettingsRepository.save(settings);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    // --- Custom Form Fields ---
    public List<ShopCustomFormField> getCustomFormFields(Long ownerId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        return shopCustomFormFieldRepository.findByShopIdOrderByDisplayOrderAsc(shop.getId());
    }

    @Transactional
    public ShopCustomFormField createCustomFormField(Long ownerId, ShopCustomFormFieldRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopCustomFormField field = ShopCustomFormField.builder()
                .shop(shop)
                .fieldKey(request.getFieldKey().trim())
                .fieldLabel(request.getFieldLabel().trim())
                .fieldType(request.getFieldType().trim().toUpperCase())
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : false)
                .isEnabled(request.getIsEnabled() != null ? request.getIsEnabled() : true)
                .optionsJson(request.getOptionsJson())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();
        ShopCustomFormField saved = shopCustomFormFieldRepository.save(field);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    @Transactional
    public ShopCustomFormField updateCustomFormField(Long ownerId, Long fieldId, ShopCustomFormFieldRequest request) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopCustomFormField field = shopCustomFormFieldRepository.findByIdAndShopId(fieldId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Custom form field not found or unauthorized"));

        field.setFieldKey(request.getFieldKey().trim());
        field.setFieldLabel(request.getFieldLabel().trim());
        field.setFieldType(request.getFieldType().trim().toUpperCase());
        if (request.getIsRequired() != null) field.setIsRequired(request.getIsRequired());
        if (request.getIsEnabled() != null) field.setIsEnabled(request.getIsEnabled());
        field.setOptionsJson(request.getOptionsJson());
        if (request.getDisplayOrder() != null) field.setDisplayOrder(request.getDisplayOrder());

        ShopCustomFormField saved = shopCustomFormFieldRepository.save(field);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
        return saved;
    }

    @Transactional
    public void deleteCustomFormField(Long ownerId, Long fieldId) {
        Shop shop = shopAccessValidator.getValidShopForOwner(ownerId);
        ShopCustomFormField field = shopCustomFormFieldRepository.findByIdAndShopId(fieldId, shop.getId())
                .orElseThrow(() -> new RuntimeException("Custom form field not found or unauthorized"));
        shopCustomFormFieldRepository.delete(field);
        if (storefrontCacheService != null) storefrontCacheService.evictShopDetails(shop.getId());
    }
}
