package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.dto.ShopResponse;
import com.cakeplatform.api.modules.shop.dto.UpdateShopRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ShopService {

    private final ShopRepository shopRepository;
    private final com.cakeplatform.api.modules.security.ShopAccessValidator shopAccessValidator;
    private final com.cakeplatform.api.modules.storefront.StorefrontCacheService storefrontCacheService;
    private final com.cakeplatform.api.modules.location.service.LocationValidationService locationValidationService;

    @org.springframework.beans.factory.annotation.Autowired
    public ShopService(
            ShopRepository shopRepository,
            com.cakeplatform.api.modules.security.ShopAccessValidator shopAccessValidator,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.cakeplatform.api.modules.storefront.StorefrontCacheService storefrontCacheService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.cakeplatform.api.modules.location.service.LocationValidationService locationValidationService) {
        this.shopRepository = shopRepository;
        this.shopAccessValidator = shopAccessValidator;
        this.storefrontCacheService = storefrontCacheService;
        this.locationValidationService = locationValidationService;
    }

    public ShopService(
            ShopRepository shopRepository,
            com.cakeplatform.api.modules.security.ShopAccessValidator shopAccessValidator) {
        this(shopRepository, shopAccessValidator, null, null);
    }

    @Transactional(readOnly = true)
    public ShopResponse getMyShopProfile(Long ownerId) {
        Shop shop = getShopByOwnerId(ownerId);
        return mapToResponse(shop);
    }

    @Transactional
    public ShopResponse updateMyShopProfile(Long ownerId, UpdateShopRequest request) {
        Shop shop = getShopByOwnerId(ownerId);

        if (shop.getStatus() == com.cakeplatform.api.modules.shop.ShopStatus.SUSPENDED) {
            throw new com.cakeplatform.api.exception.SubscriptionExpiredException("Shop is suspended by administration. Profile updates are disabled.");
        }

        boolean isLocationUpdated = request.getState() != null || request.getDistrict() != null 
                || request.getCity() != null || request.getPincode() != null;

        if (isLocationUpdated && locationValidationService != null) {
            String effectiveState = request.getState() != null ? request.getState() : shop.getState();
            String effectiveDistrict = request.getDistrict() != null ? request.getDistrict() : shop.getDistrict();
            String effectiveCity = request.getCity() != null ? request.getCity() : shop.getCity();
            String effectiveArea = request.getArea() != null ? request.getArea() : shop.getArea();
            String effectivePincode = request.getPincode() != null ? request.getPincode() : shop.getPincode();

            locationValidationService.validateLocation(
                    com.cakeplatform.api.modules.location.dto.LocationValidationDTO.builder()
                            .state(effectiveState)
                            .district(effectiveDistrict)
                            .city(effectiveCity)
                            .area(effectiveArea)
                            .pincode(effectivePincode)
                            .build()
            );
        }

        if (request.getBusinessName() != null) shop.setBusinessName(request.getBusinessName());
        if (request.getDescription() != null) shop.setDescription(request.getDescription());
        if (request.getPhone() != null) shop.setPhone(request.getPhone());
        if (request.getAddress() != null) shop.setAddress(request.getAddress());
        if (request.getCity() != null) shop.setCity(request.getCity());
        if (request.getState() != null) shop.setState(request.getState());
        if (request.getPincode() != null) shop.setPincode(request.getPincode());
        
        if (request.getAddressLine1() != null) shop.setAddressLine1(request.getAddressLine1());
        if (request.getAddressLine2() != null) shop.setAddressLine2(request.getAddressLine2());
        if (request.getArea() != null) shop.setArea(request.getArea());
        if (request.getDistrict() != null) shop.setDistrict(request.getDistrict());
        if (request.getLatitude() != null) shop.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) shop.setLongitude(request.getLongitude());

        if (request.getBusinessCategory() != null) shop.setBusinessCategory(request.getBusinessCategory());
        if (request.getLogoUrl() != null) shop.setLogoUrl(request.getLogoUrl());
        if (request.getCoverImageUrl() != null) shop.setCoverImageUrl(request.getCoverImageUrl());
        if (request.getAboutStory() != null) shop.setAboutStory(request.getAboutStory());
        if (request.getAboutImageUrl() != null) shop.setAboutImageUrl(request.getAboutImageUrl());
        if (request.getShowAboutImage() != null) shop.setShowAboutImage(request.getShowAboutImage());
        if (request.getWhatsappNumber() != null) shop.setWhatsappNumber(request.getWhatsappNumber());
        if (request.getMapLocationUrl() != null) shop.setMapLocationUrl(request.getMapLocationUrl());

        Shop updatedShop = shopRepository.save(shop);
        if (storefrontCacheService != null) {
            storefrontCacheService.evictShopDetails(updatedShop.getId());
        }
        return mapToResponse(updatedShop);
    }

    private Shop getShopByOwnerId(Long ownerId) {
        return shopAccessValidator.getShopByOwnerId(ownerId);
    }

    private ShopResponse mapToResponse(Shop shop) {
        return ShopResponse.builder()
                .id(shop.getId())
                .businessName(shop.getBusinessName())
                .description(shop.getDescription())
                .phone(shop.getPhone())
                .email(shop.getEmail())
                .address(shop.getAddress())
                .addressLine1(shop.getAddressLine1())
                .addressLine2(shop.getAddressLine2())
                .area(shop.getArea())
                .city(shop.getCity())
                .district(shop.getDistrict())
                .state(shop.getState())
                .pincode(shop.getPincode())
                .latitude(shop.getLatitude())
                .longitude(shop.getLongitude())
                .businessCategory(shop.getBusinessCategory())
                .businessType(shop.getBusinessType() != null ? shop.getBusinessType().name() : null)
                .yearsInBusiness(shop.getYearsInBusiness())
                .fssaiRegistration(shop.getFssaiRegistration())
                .logoUrl(shop.getLogoUrl())
                .coverImageUrl(shop.getCoverImageUrl())
                .aboutStory(shop.getAboutStory())
                .aboutImageUrl(shop.getAboutImageUrl())
                .showAboutImage(shop.getShowAboutImage())
                .whatsappNumber(shop.getWhatsappNumber())
                .mapLocationUrl(shop.getMapLocationUrl())
                .status(shop.getStatus())
                .verificationStatus(shop.getVerificationStatus() != null ? shop.getVerificationStatus().name() : null)
                .createdAt(shop.getCreatedAt())
                .updatedAt(shop.getUpdatedAt())
                .build();
    }
}
