package com.cakeplatform.api.modules.settings;

import jakarta.persistence.*;
import jakarta.persistence.Convert;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "global_settings")
@Data
public class GlobalSettings {
    @Id
    private Long id = 1L; // Singleton entity

    @Column(name = "platform_name")
    private String platformName = "CakeStore";

    @Column(name = "support_email")
    private String supportEmail = "support@cakestore.com";

    // Payment Gateway Settings
    @Column(name = "razorpay_key_id")
    private String razorpayKeyId;

    @Convert(converter = EncryptionConverter.class)
    @Column(name = "razorpay_key_secret")
    private String razorpayKeySecret;

    @Convert(converter = EncryptionConverter.class)
    @Column(name = "razorpay_webhook_secret")
    private String razorpayWebhookSecret;

    @Column(name = "platform_currency")
    private String platformCurrency = "INR";

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
