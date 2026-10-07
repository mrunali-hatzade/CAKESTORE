package com.cakeplatform.api.modules.auth.service;

import com.cakeplatform.api.modules.auth.entity.OtpVerification;
import com.cakeplatform.api.modules.auth.repository.OtpVerificationRepository;
import com.cakeplatform.api.modules.notification.SmsService;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CustomerAccountHydrationTest {

    @Mock
    private OtpVerificationRepository otpRepository;
    @Mock
    private SmsService smsService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private GuestOtpService otpService;

    private OtpVerification verification;

    @BeforeEach
    void setUp() {
        verification = new OtpVerification();
        verification.setPhoneNumber("9876543210");
        verification.setOtpHash("hashed_otp");
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(5));
        verification.setAttempts(0);
    }

    @Test
    void testNewPhone_CreatesCustomerAccount() {
        when(otpRepository.findTopByPhoneNumberOrderByCreatedAtDesc("9876543210"))
                .thenReturn(Optional.of(verification));
        when(passwordEncoder.matches("123456", "hashed_otp")).thenReturn(true);
        when(userRepository.findByMobile("9876543210")).thenReturn(Optional.empty());
        
        User savedUser = new User();
        savedUser.setMobile("9876543210");
        savedUser.setRole(UserRole.CUSTOMER);
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        when(jwtService.generateToken(any(), any())).thenReturn("new_jwt_token");

        String token = otpService.verifyOtp("9876543210", "123456");

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        
        User createdUser = userCaptor.getValue();
        assertEquals("9876543210", createdUser.getMobile());
        assertEquals(UserRole.CUSTOMER, createdUser.getRole());
        assertEquals("new_jwt_token", token);
    }

    @Test
    void testExistingCustomerPhone_ReusesCustomerAccount() {
        when(otpRepository.findTopByPhoneNumberOrderByCreatedAtDesc("9876543210"))
                .thenReturn(Optional.of(verification));
        when(passwordEncoder.matches("123456", "hashed_otp")).thenReturn(true);
        
        User existingUser = new User();
        existingUser.setId(10L);
        existingUser.setMobile("9876543210");
        existingUser.setRole(UserRole.CUSTOMER);
        
        when(userRepository.findByMobile("9876543210")).thenReturn(Optional.of(existingUser));
        when(jwtService.generateToken(any(), any())).thenReturn("existing_jwt_token");

        String token = otpService.verifyOtp("9876543210", "123456");

        // Verify that save was NOT called since the user already exists
        verify(userRepository, never()).save(any(User.class));
        assertEquals("existing_jwt_token", token);
    }
}
