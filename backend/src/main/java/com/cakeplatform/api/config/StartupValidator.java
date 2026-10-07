package com.cakeplatform.api.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@Profile("prod")
@Slf4j
public class StartupValidator implements ApplicationRunner {

    @Value("${app.encryption.secret:${APP_ENCRYPTION_SECRET:}}")
    private String encryptionSecret;

    @Value("${jwt.secret:${JWT_SECRET:}}")
    private String jwtSecret;

    @Value("${razorpay.key-id:${RAZORPAY_KEY_ID:}}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:${RAZORPAY_KEY_SECRET:}}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret:${RAZORPAY_WEBHOOK_SECRET:}}")
    private String razorpayWebhookSecret;

    @Value("${mail.resend.api-key:${RESEND_API_KEY:}}")
    private String resendApiKey;

    @Value("${twilio.account-sid:#{null}}")
    private String twilioAccountSid;

    @Value("${twilio.auth-token:#{null}}")
    private String twilioAuthToken;

    @Value("${twilio.phone-number:#{null}}")
    private String twilioPhoneNumber;

    @Value("${app.storage.provider:local}")
    private String storageProvider;

    @Value("${azure.storage.account-name:}")
    private String azureStorageAccountName;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Validating production environment variables...");

        boolean failed = false;

        if (!StringUtils.hasText(encryptionSecret)) {
            log.error("CRITICAL: APP_ENCRYPTION_SECRET is missing or empty.");
            failed = true;
        }

        if (!StringUtils.hasText(jwtSecret) || "45f4f9e809b96ece4dc9605067190fe487d40b41e2f701098420bdfa4739f82b".equals(jwtSecret)) {
            log.error("CRITICAL: JWT_SECRET is missing, empty, or using default dev value.");
            failed = true;
        }

        if (!StringUtils.hasText(razorpayKeyId)) {
            log.error("CRITICAL: RAZORPAY_KEY_ID is missing or empty.");
            failed = true;
        }

        if (!StringUtils.hasText(razorpayKeySecret)) {
            log.error("CRITICAL: RAZORPAY_KEY_SECRET is missing or empty.");
            failed = true;
        }

        if (!StringUtils.hasText(razorpayWebhookSecret)) {
            log.error("CRITICAL: RAZORPAY_WEBHOOK_SECRET is missing or empty.");
            failed = true;
        }

        if (!StringUtils.hasText(resendApiKey)) {
            log.error("CRITICAL: RESEND_API_KEY is missing or empty. Emails will silently fail.");
            failed = true;
        }

        if (!StringUtils.hasText(twilioAccountSid) || !StringUtils.hasText(twilioAuthToken) || !StringUtils.hasText(twilioPhoneNumber)) {
            log.error("CRITICAL: Twilio credentials (twilio.account-sid, twilio.auth-token, twilio.phone-number) are missing. SMS will silently fail.");
            failed = true;
        }

        if ("azure_blob".equals(storageProvider)) {
            if (!StringUtils.hasText(azureStorageAccountName) || "devstoreaccount1".equals(azureStorageAccountName)) {
                log.error("CRITICAL: AZURE_STORAGE_ACCOUNT_NAME is missing or using default devstoreaccount1.");
                failed = true;
            }
        }

        if (failed) {
            log.error("Production environment validation FAILED. The application will not start.");
            System.exit(1);
        } else {
            log.info("Production environment validation PASSED.");
        }
    }
}
