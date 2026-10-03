package com.cakeplatform.api.modules.settings;

import com.cakeplatform.api.modules.settings.dto.GlobalSettingsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GlobalSettingsService {

    private final GlobalSettingsRepository repository;
    private volatile GlobalSettings cachedSettings = null;

    public GlobalSettings getSettings() {
        if (cachedSettings != null) {
            return cachedSettings;
        }
        synchronized(this) {
            if (cachedSettings == null) {
                cachedSettings = repository.findById(1L).orElseGet(() -> {
                    GlobalSettings defaultSettings = new GlobalSettings();
                    defaultSettings.setId(1L);
                    return repository.save(defaultSettings);
                });
            }
        }
        return cachedSettings;
    }

    @Transactional
    public GlobalSettings updateSettings(GlobalSettingsDTO dto) {
        GlobalSettings settings = getSettings();
        
        if (dto.getPlatformName() != null) settings.setPlatformName(dto.getPlatformName());
        if (dto.getSupportEmail() != null) settings.setSupportEmail(dto.getSupportEmail());
        
        // Validation & Update logic
        if (dto.getRazorpayKeyId() != null && !dto.getRazorpayKeyId().isBlank()) {
            String keyId = dto.getRazorpayKeyId().trim();
            if (!keyId.startsWith("rzp_live_") && !keyId.startsWith("rzp_test_")) {
                throw new IllegalArgumentException("Invalid Razorpay Key ID format. Must start with rzp_live_ or rzp_test_");
            }
            settings.setRazorpayKeyId(keyId);
        }
        if (dto.getRazorpayKeySecret() != null && !dto.getRazorpayKeySecret().isBlank()) {
            settings.setRazorpayKeySecret(dto.getRazorpayKeySecret().trim());
        }
        if (dto.getRazorpayWebhookSecret() != null && !dto.getRazorpayWebhookSecret().isBlank()) {
            settings.setRazorpayWebhookSecret(dto.getRazorpayWebhookSecret().trim());
        }
        if (dto.getPlatformCurrency() != null) settings.setPlatformCurrency(dto.getPlatformCurrency());

        cachedSettings = repository.save(settings);
        return cachedSettings;
    }
}
