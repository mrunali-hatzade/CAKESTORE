package com.cakeplatform.api.modules.auth.service;

import com.cakeplatform.api.modules.auth.entity.OtpVerification;
import com.cakeplatform.api.modules.auth.repository.OtpVerificationRepository;
import com.cakeplatform.api.modules.notification.SmsService;
import com.cakeplatform.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuestOtpService {

    private final OtpVerificationRepository otpRepository;
    private final SmsService smsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 3;
    private final SecureRandom secureRandom = new SecureRandom();

    private String normalizePhone(String phone) {
        if (phone == null) return null;
        String normalized = phone.replaceAll("\\s+", "").replaceAll("\\-", "");
        if (!normalized.startsWith("+")) {
            if (normalized.length() == 10) {
                normalized = "+91" + normalized; // Default to India if not specified, matching checkout assumption
            } else {
                normalized = "+" + normalized;
            }
        }
        return normalized;
    }

    @Transactional
    public void requestOtp(String phoneNumber) {
        String normalizedPhone = normalizePhone(phoneNumber);
        
        // Prevent revealing if user has orders or not in the HTTP response.
        // For rate limiting and resend cooldown:
        Optional<OtpVerification> existing = otpRepository.findTopByPhoneNumberOrderByCreatedAtDesc(normalizedPhone);
        if (existing.isPresent()) {
            OtpVerification otp = existing.get();
            if (otp.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
                throw new RuntimeException("Please wait before requesting a new OTP");
            }
            // Invalidate old OTP by setting expiry to now
            otp.setExpiresAt(LocalDateTime.now());
            otpRepository.save(otp);
        }

        String rawOtp = generateOtp();
        String otpHash = passwordEncoder.encode(rawOtp);

        OtpVerification verification = new OtpVerification();
        verification.setPhoneNumber(normalizedPhone);
        verification.setOtpHash(otpHash);
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        otpRepository.save(verification);

        String message = String.format("Your CakeStore order tracking code is: %s. It is valid for %d minutes.", rawOtp, OTP_EXPIRY_MINUTES);
        smsService.sendSms(normalizedPhone, message);
    }

    @Transactional
    public String verifyOtp(String phoneNumber, String otp) {
        String normalizedPhone = normalizePhone(phoneNumber);
        OtpVerification verification = otpRepository.findTopByPhoneNumberOrderByCreatedAtDesc(normalizedPhone)
                .orElseThrow(() -> new RuntimeException("Invalid or expired OTP"));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        if (verification.getAttempts() >= MAX_ATTEMPTS) {
            throw new RuntimeException("Maximum verification attempts exceeded. Please request a new OTP.");
        }

        verification.setAttempts(verification.getAttempts() + 1);

        if (!passwordEncoder.matches(otp, verification.getOtpHash())) {
            otpRepository.save(verification); // Save attempt increment
            throw new RuntimeException("Invalid or expired OTP");
        }

        // Success: Invalidate OTP
        verification.setExpiresAt(LocalDateTime.now());
        otpRepository.save(verification);

        // Generate short-lived JWT for guest tracker (15 mins)
        // We will need a method in JwtService to generate a guest token
        return jwtService.generateGuestToken(normalizedPhone);
    }

    private String generateOtp() {
        StringBuilder otp = new StringBuilder(OTP_LENGTH);
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }
}
