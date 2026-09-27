package com.cakeplatform.api.modules.notification;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class NotificationFallbackDeliveryTest {

    @Test
    @DisplayName("EmailService.sendEmail - safely falls back to structured logging when no API key provided")
    void testEmailDeliveryWithoutCredentials() {
        EmailService emailService = new EmailService();

        // Must safely execute without throwing any exception even when credentials are null/empty
        assertDoesNotThrow(() -> {
            emailService.sendEmail("customer@example.com", "Order Update #1234", "Your cake order is in the oven!");
        });
    }

    @Test
    @DisplayName("EmailService.sendEmail - gracefully skips when recipient is blank")
    void testEmailDeliveryWithBlankRecipient() {
        EmailService emailService = new EmailService();

        assertDoesNotThrow(() -> {
            emailService.sendEmail("", "Test Subject", "Test Body");
            emailService.sendEmail(null, "Test Subject", "Test Body");
        });
    }

    @Test
    @DisplayName("SmsService.sendSms - gracefully falls back to mock delivery when Twilio is unconfigured")
    void testSmsDeliveryWithoutCredentials() {
        SmsService smsService = new SmsService();
        smsService.init(); // runs with null/empty credentials

        // Must safely execute mock delivery without throwing any exception
        assertDoesNotThrow(() -> {
            smsService.sendSms("9876543210", "Your cake order #1234 is ready for pickup!");
        });
    }
}
