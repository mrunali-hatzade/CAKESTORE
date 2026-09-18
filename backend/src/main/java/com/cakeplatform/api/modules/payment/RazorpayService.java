package com.cakeplatform.api.modules.payment;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Order;
import org.json.JSONObject;
import java.math.BigDecimal;
import java.math.RoundingMode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@Service
@Slf4j
@Getter
public class RazorpayService {

    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;

    public RazorpayService(
            @Value("${razorpay.key-id:rzp_test_placeholder}") String keyId,
            @Value("${razorpay.key-secret:secret_placeholder}") String keySecret,
            @Value("${razorpay.webhook-secret:webhook_secret_placeholder}") String webhookSecret) {
        this.keyId = keyId != null ? keyId.trim() : null;
        this.keySecret = keySecret != null ? keySecret.trim() : null;
        this.webhookSecret = webhookSecret != null ? webhookSecret.trim() : null;
    }

    /**
     * Verifies the payment signature returned by the client-side Razorpay checkout.
     * Expected signature payload: HMAC_SHA256(orderId + "|" + paymentId, keySecret).
     */
    public boolean verifyPaymentSignature(String razorpayOrderId, String razorpayPaymentId, String razorpaySignature) {
        log.info("Starting Razorpay signature verification. OrderId: {}, PaymentId: {}", razorpayOrderId, razorpayPaymentId);
        
        if (razorpayOrderId == null || razorpayPaymentId == null || razorpaySignature == null) {
            log.warn("Missing payment signature component: orderId={}, paymentId={}, signature={}",
                    razorpayOrderId, razorpayPaymentId, (razorpaySignature != null ? "[PRESENT]" : "[NULL]"));
            return false;
        }

        boolean secretPresent = (this.keySecret != null && !this.keySecret.isBlank());
        int secretLength = secretPresent ? this.keySecret.length() : 0;
        
        String maskedKeyId = (this.keyId != null && this.keyId.length() > 8) 
            ? this.keyId.substring(0, 8) + "..." 
            : "[MISSING/SHORT]";
            
        log.info("Verification context - KeyId: {}, Secret present: {}, Secret length: {}", 
            maskedKeyId, secretPresent, secretLength);

        String data = razorpayOrderId + "|" + razorpayPaymentId;
        String expectedSignature = calculateHmacSha256(data, keySecret);
        if (expectedSignature == null) {
            log.error("Failed to calculate expected HMAC signature (returned null)");
            return false;
        }

        boolean match = constantTimeEquals(expectedSignature, razorpaySignature.trim());
        log.info("Signature match result: {}", match);
        return match;
    }

    /**
     * Verifies the signature of an incoming Razorpay webhook against the exact raw request payload.
     * Expected signature payload: HMAC_SHA256(rawPayload, webhookSecret).
     */
    public boolean verifyWebhookSignature(String rawPayload, String signatureHeader) {
        if (rawPayload == null || signatureHeader == null || signatureHeader.trim().isEmpty()) {
            log.warn("Missing webhook payload or signature header");
            return false;
        }

        String expectedSignature = calculateHmacSha256(rawPayload, webhookSecret);
        if (expectedSignature == null) {
            return false;
        }

        return constantTimeEquals(expectedSignature, signatureHeader.trim());
    }

    /**
     * Calculates an HMAC-SHA256 hex digest for the given input and secret.
     */
    public String calculateHmacSha256(String data, String secret) {
        if (data == null || secret == null) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            log.error("Failed to calculate HMAC-SHA256: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Constant-time comparison to prevent timing attacks.
     */
    public static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String createSubscriptionOrder(BigDecimal amount, Long planId, Long shopId, String receiptId) {
        if (!isConfigured()) {
            throw new IllegalStateException("Razorpay credentials not configured.");
        }
        try {
            RazorpayClient razorpayClient = new RazorpayClient(keyId, keySecret);
            long amountPaise = amount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", receiptId);
            
            JSONObject notes = new JSONObject();
            notes.put("plan_id", planId);
            notes.put("shop_id", shopId);
            orderRequest.put("notes", notes);
            
            Order order = razorpayClient.orders.create(orderRequest);
            return order.get("id");
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order: {}", e.getMessage());
            throw new RuntimeException("Payment initiation failed. Please try again later.");
        }
    }

    public void verifyOrderDetails(String razorpayOrderId, BigDecimal expectedAmount, String expectedCurrency) {
        if (!isConfigured()) {
            return;
        }
        try {
            RazorpayClient client = new RazorpayClient(keyId, keySecret);
            Order order = client.orders.fetch(razorpayOrderId);
            long rzpAmount = ((Number) order.get("amount")).longValue();
            String rzpCurrency = order.get("currency");
            
            long expectedPaise = expectedAmount.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.UNNECESSARY).longValueExact();
            
            if (rzpAmount != expectedPaise) {
                log.error("Razorpay order amount mismatch. Expected: {}, Actual: {}", expectedPaise, rzpAmount);
                throw new IllegalArgumentException("Payment verification failed. Amount mismatch from provider.");
            }
            if (!expectedCurrency.equalsIgnoreCase(rzpCurrency)) {
                log.error("Razorpay order currency mismatch. Expected: {}, Actual: {}", expectedCurrency, rzpCurrency);
                throw new IllegalArgumentException("Payment verification failed. Currency mismatch from provider.");
            }
        } catch (RazorpayException e) {
            log.error("Failed to fetch order from Razorpay: {}", e.getMessage());
            throw new IllegalArgumentException("Payment verification failed. Could not verify order details.");
        }
    }

    /**
     * Returns true if production or non-placeholder credentials have been configured.
     */
    public boolean isConfigured() {
        return keyId != null && !keyId.isBlank() && !keyId.contains("placeholder")
                && keySecret != null && !keySecret.isBlank() && !keySecret.contains("placeholder");
    }
}
