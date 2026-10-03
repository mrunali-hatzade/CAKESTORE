package com.cakeplatform.api.modules.settings.dto;

import lombok.Data;

@Data
public class GlobalSettingsDTO {
    private String platformName;
    private String supportEmail;
    private String razorpayKeyId;
    private String razorpayKeySecret;
    private String razorpayWebhookSecret;
    private String platformCurrency;
}
