package com.cakeplatform.api.modules.shop.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateShopRequest {

    @Size(max = 255, message = "Business name must be less than 255 characters")
    private String businessName;

    private String description;

    @Size(max = 15, message = "Phone must be less than 15 characters")
    private String phone;

    private String address;

    @Size(max = 100, message = "City must be less than 100 characters")
    private String city;

    @Size(max = 100, message = "State must be less than 100 characters")
    private String state;

    @Size(max = 20, message = "Pincode must be less than 20 characters")
    private String pincode;

    private String addressLine1;
    private String addressLine2;
    private String area;
    private String district;
    private Double latitude;
    private Double longitude;

    @Size(max = 100, message = "Business category must be less than 100 characters")
    private String businessCategory;

    private String logoUrl;

    private String coverImageUrl;

    private String aboutStory;
    private String aboutImageUrl;
    private Boolean showAboutImage;
    private String whatsappNumber;
    private String mapLocationUrl;
}
