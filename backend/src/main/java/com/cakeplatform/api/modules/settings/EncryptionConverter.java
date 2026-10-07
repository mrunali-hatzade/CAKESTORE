package com.cakeplatform.api.modules.settings;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Converter
@Component
public class EncryptionConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES";
    
    // We inject a static key from config. Fallback to a hardcoded 16-byte key if missing.
    private static byte[] KEY;

    @Value("${app.encryption.secret:${APP_ENCRYPTION_SECRET:}}")
    public void setSecretKey(String secret) {
        // Ensure key is exactly 16 bytes for AES-128
        String paddedKey = String.format("%-16s", secret).substring(0, 16);
        KEY = paddedKey.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null || attribute.isBlank()) {
            return attribute;
        }
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(KEY, ALGORITHM));
            byte[] encrypted = cipher.doFinal(attribute.getBytes(StandardCharsets.UTF_8));
            return "ENC:" + Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt database column", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null || !dbData.startsWith("ENC:")) {
            // Return plain text if it was stored before encryption was implemented
            return dbData;
        }
        try {
            String actualData = dbData.substring(4);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(KEY, ALGORITHM));
            byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(actualData));
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt database column", e);
        }
    }
}
