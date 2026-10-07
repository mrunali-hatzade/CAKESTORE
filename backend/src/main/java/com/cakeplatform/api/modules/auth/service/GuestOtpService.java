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
    private final com.cakeplatform.api.modules.user.UserRepository userRepository;

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 3;
    private final SecureRandom secureRandom = new SecureRandom();

    private String normalizePhone(String phone) {
        return com.cakeplatform.api.modules.auth.service.AuthService.normalizeIndianMobile(phone);
    }

    @Transactional
    public void requestOtp(String phoneNumber) {
        String normalizedPhone = normalizePhone(phoneNumber);
        if (normalizedPhone == null) throw new RuntimeException("Invalid phone number");
        
        // Prevent revealing if user has orders or not in the HTTP response.
        // For rate limiting and resend cooldown:
        Optional<OtpVerification> existing = otpRepository.findTopByPhoneNumberOrderByCreatedAtDesc(normalizedPhone);
        if (existing.isPresent()) {
            OtpVerification otp = existing.get();
            if (otp.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(LocalDateTime.now())) {
                long secondsLeft = java.time.Duration.between(LocalDateTime.now(), otp.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS)).getSeconds();
                throw new RuntimeException("Please wait " + secondsLeft + " seconds before requesting a new OTP.");
            }
            // Invalidate old OTP by setting expiry to now
            otp.setExpiresAt(LocalDateTime.now());
            otpRepository.save(otp);
        }

        String rawOtp = generateOtp();
        String otpHash = passwordEncoder.encode(rawOtp);

        OtpVerification verification = new OtpVerification();
        verification.setPhoneNumber(normalizedPhone); // Store 10 digit number in DB
        verification.setOtpHash(otpHash);
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES));
        otpRepository.save(verification);

        // The OTP is invalidated after successful verification – no need to state the validity period.
        String message = String.format("Your CakeStore order tracking code is: %s.", rawOtp);
        // Twilio requires E.164 format
        String smsPhone = "+91" + normalizedPhone;
        smsService.sendSms(smsPhone, message);
    }

    @Transactional
    public String verifyOtp(String phoneNumber, String otp) {
        String normalizedPhone = normalizePhone(phoneNumber);
        if (normalizedPhone == null) throw new RuntimeException("Invalid phone number");
        
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

        // Hydrate Customer Account
        com.cakeplatform.api.modules.user.User user = userRepository.findByMobileIncludingDeleted(normalizedPhone).orElse(null);
        if (user == null) {
            user = new com.cakeplatform.api.modules.user.User();
            user.setMobile(normalizedPhone);
            user.setRole(com.cakeplatform.api.modules.user.UserRole.CUSTOMER);
            user = userRepository.save(user);
        } else if (user.isDeleted()) {
            user.setDeleted(false);
            user = userRepository.save(user);
        }

        // Issue CUSTOMER JWT
        com.cakeplatform.api.security.CustomUserDetails userDetails = new com.cakeplatform.api.security.CustomUserDetails(user);
        java.util.Map<String, Object> extraClaims = new java.util.HashMap<>();
        extraClaims.put("granted_role", "CUSTOMER");
        return jwtService.generateToken(extraClaims, userDetails);
    }

    private String generateOtp() {
        StringBuilder otp = new StringBuilder(OTP_LENGTH);
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }
}
