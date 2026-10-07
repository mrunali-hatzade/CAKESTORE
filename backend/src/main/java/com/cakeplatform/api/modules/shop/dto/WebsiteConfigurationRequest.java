package com.cakeplatform.api.modules.shop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class WebsiteConfigurationRequest {
    @NotNull
    @Valid
    private UpdateShopRequest shopProfile;

    @NotNull
    @Valid
    private ShopDeliveryConfigRequest deliveryConfig;

    @NotNull
    @Valid
    private ShopStorefrontSettingsRequest storefrontSettings;
}
