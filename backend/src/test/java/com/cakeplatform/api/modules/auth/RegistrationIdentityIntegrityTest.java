package com.cakeplatform.api.modules.auth;

import com.cakeplatform.api.config.GlobalExceptionHandler;
import com.cakeplatform.api.exception.DuplicateResourceException;
import com.cakeplatform.api.modules.auth.dto.AuthResponse;
import com.cakeplatform.api.modules.auth.dto.LoginRequest;
import com.cakeplatform.api.modules.auth.dto.RegisterRequest;
import com.cakeplatform.api.modules.auth.service.AuthService;
import com.cakeplatform.api.modules.media.StorageService;
import com.cakeplatform.api.modules.notification.AdminNotificationService;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.BusinessDocumentRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.UserStatus;
import com.cakeplatform.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class RegistrationIdentityIntegrityTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private StorageService storageService;

    @Mock
    private BusinessDocumentRepository businessDocumentRepository;

    @Mock
    private AdminNotificationService adminNotificationService;

    private AuthService authService;
    private ShopAccessValidator shopAccessValidator;
    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                shopRepository,
                subscriptionRepository,
                passwordEncoder,
                jwtService,
                authenticationManager,
                storageService,
                businessDocumentRepository,
                adminNotificationService
        );
        shopAccessValidator = new ShopAccessValidator(shopRepository, subscriptionRepository);
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("1. New owner registration succeeds with PENDING shop, PROCESSING verification, and inactive subscription")
    void testNewOwnerRegistration_Succeeds_WithPendingAndProcessing() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Anita Verma")
                .email("anita@bakes.com")
                .password("SecurePass123!")
                .mobile("+91 9876543210")
                .businessName("Anita Cakes")
                .addressLine1("123 MG Road")
                .city("Pune")
                .state("Maharashtra")
                .pincode("411001")
                .build();

        when(userRepository.existsByEmailIgnoreCase("anita@bakes.com")).thenReturn(false);
        when(userRepository.existsByMobile("9876543210")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded_hash");

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(101L);
            return u;
        });

        when(shopRepository.existsByOwnerId(101L)).thenReturn(false);

        when(shopRepository.save(any(Shop.class))).thenAnswer(invocation -> {
            Shop s = invocation.getArgument(0);
            s.setId(201L);
            return s;
        });

        when(jwtService.generateToken(any())).thenReturn("mock_jwt_token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("mock_jwt_token", response.getToken());
        assertEquals("anita@bakes.com", response.getEmail());
        assertEquals("PENDING", response.getShopStatus());
        assertEquals("NONE", response.getSubscriptionStatus());

        // Verify saved Shop has PENDING and PROCESSING
        ArgumentCaptor<Shop> shopCaptor = ArgumentCaptor.forClass(Shop.class);
        verify(shopRepository).save(shopCaptor.capture());
        Shop savedShop = shopCaptor.getValue();
        assertEquals(ShopStatus.PENDING, savedShop.getStatus());
        assertEquals(VerificationStatus.PROCESSING, savedShop.getVerificationStatus());
        assertEquals("9876543210", savedShop.getPhone());
    }

    @Test
    @DisplayName("2. Canonical phone normalization strips non-digits, leading country code, and leading zero")
    void testCanonicalPhoneNormalization() {
        assertEquals("9876543210", AuthService.normalizeIndianMobile("+91 9876543210"));
        assertEquals("9876543210", AuthService.normalizeIndianMobile("+919876543210"));
        assertEquals("9876543210", AuthService.normalizeIndianMobile("09876543210"));
        assertEquals("9876543210", AuthService.normalizeIndianMobile("9876543210"));
        assertEquals("9876543210", AuthService.normalizeIndianMobile("98765 43210"));
        assertNull(AuthService.normalizeIndianMobile(""));
        assertNull(AuthService.normalizeIndianMobile(null));
    }

    @Test
    @DisplayName("3. Duplicate email registration rejected with field-specific message")
    void testDuplicateEmail_Rejected_FieldSpecificError() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Anita Verma")
                .email("  ANITA@bakes.com  ")
                .password("SecurePass123!")
                .mobile("9123456780")
                .businessName("Anita Cakes")
                .addressLine1("123 MG Road")
                .city("Pune")
                .state("Maharashtra")
                .pincode("411001")
                .build();

        when(userRepository.existsByEmailIgnoreCase("anita@bakes.com")).thenReturn(true);
        when(userRepository.existsByMobile("9123456780")).thenReturn(false);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> authService.register(request));

        assertEquals("This email is already registered. Please login or use another email.", ex.getMessage());
        assertTrue(ex.getFieldErrors().containsKey("email"));
        assertEquals("This email is already registered. Please login or use another email.", ex.getFieldErrors().get("email"));
        assertFalse(ex.getFieldErrors().containsKey("mobile"));
    }

    @Test
    @DisplayName("4. Duplicate phone registration rejected with field-specific message across formats")
    void testDuplicatePhone_Rejected_FieldSpecificError() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Anita Verma")
                .email("new@bakes.com")
                .password("SecurePass123!")
                .mobile("+91 98765-43210")
                .businessName("Anita Cakes")
                .addressLine1("123 MG Road")
                .city("Pune")
                .state("Maharashtra")
                .pincode("411001")
                .build();

        when(userRepository.existsByEmailIgnoreCase("new@bakes.com")).thenReturn(false);
        when(userRepository.existsByMobile("9876543210")).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> authService.register(request));

        assertEquals("This phone number is already registered. Please use another number.", ex.getMessage());
        assertTrue(ex.getFieldErrors().containsKey("mobile"));
        assertEquals("This phone number is already registered. Please use another number.", ex.getFieldErrors().get("mobile"));
        assertFalse(ex.getFieldErrors().containsKey("email"));
    }

    @Test
    @DisplayName("5. Both duplicate email and phone produce structured errors for both fields")
    void testDuplicateEmailAndPhone_StructuredErrorsForBothFields() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Anita Verma")
                .email("anita@bakes.com")
                .password("SecurePass123!")
                .mobile("9876543210")
                .businessName("Anita Cakes")
                .addressLine1("123 MG Road")
                .city("Pune")
                .state("Maharashtra")
                .pincode("411001")
                .build();

        when(userRepository.existsByEmailIgnoreCase("anita@bakes.com")).thenReturn(true);
        when(userRepository.existsByMobile("9876543210")).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> authService.register(request));

        assertEquals("Email and phone number are already registered.", ex.getMessage());
        assertTrue(ex.getFieldErrors().containsKey("email"));
        assertTrue(ex.getFieldErrors().containsKey("mobile"));
        assertEquals("This email is already registered. Please login or use another email.", ex.getFieldErrors().get("email"));
        assertEquals("This phone number is already registered. Please use another number.", ex.getFieldErrors().get("mobile"));
    }

    @Test
    @DisplayName("6. One owner cannot register a second shop")
    void testOneOwnerToOneShop_SecondShopRejected() {
        RegisterRequest request = RegisterRequest.builder()
                .fullName("Anita Verma")
                .email("anita2@bakes.com")
                .password("SecurePass123!")
                .mobile("9111222333")
                .businessName("Second Shop")
                .addressLine1("456 Park Ave")
                .city("Pune")
                .state("Maharashtra")
                .pincode("411001")
                .build();

        when(userRepository.existsByEmailIgnoreCase("anita2@bakes.com")).thenReturn(false);
        when(userRepository.existsByMobile("9111222333")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hash");

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(301L);
            return u;
        });

        // Owner already has a shop
        when(shopRepository.existsByOwnerId(301L)).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> authService.register(request));
        assertEquals("An owner account can only own one bakery store.", ex.getMessage());
        verify(shopRepository, never()).save(any());
    }

    @Test
    @DisplayName("7. ShopAccessValidator detects multiple shops and rejects data integrity violation")
    void testShopAccessValidator_RejectsMultipleShops() {
        Shop s1 = new Shop();
        s1.setId(1L);
        Shop s2 = new Shop();
        s2.setId(2L);

        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(s1, s2));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> shopAccessValidator.getShopByOwnerId(10L));
        assertTrue(ex.getMessage().contains("Multiple shops found for single owner account"));
    }

    @Test
    @DisplayName("8. GlobalExceptionHandler handleDuplicateResourceException returns 409 with field error details")
    void testGlobalExceptionHandler_DuplicateResource() {
        Map<String, String> fieldErrors = Map.of(
                "email", "This email is already registered. Please login or use another email.",
                "mobile", "This phone number is already registered. Please use another number."
        );
        DuplicateResourceException ex = new DuplicateResourceException("Email and phone number are already registered.", fieldErrors);

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDuplicateResourceException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Email and phone number are already registered.", response.getBody().get("error"));
        assertEquals("This email is already registered. Please login or use another email.", response.getBody().get("email"));
        assertEquals("This phone number is already registered. Please use another number.", response.getBody().get("mobile"));
        assertNotNull(response.getBody().get("fieldErrors"));
    }

    @Test
    @DisplayName("9. GlobalExceptionHandler handleDataIntegrityViolationException catches mobile uniqueness race condition")
    void testGlobalExceptionHandler_MobileRaceCondition() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "could not execute statement; SQL [n/a]; constraint [idx_users_mobile_unique]; nested exception is org.hibernate.exception.ConstraintViolationException"
        );

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("This phone number is already registered. Please use another number.", response.getBody().get("error"));
        assertEquals("This phone number is already registered. Please use another number.", response.getBody().get("mobile"));
    }

    @Test
    @DisplayName("10. GlobalExceptionHandler handleDataIntegrityViolationException catches email uniqueness race condition")
    void testGlobalExceptionHandler_EmailRaceCondition() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "ERROR: duplicate key value violates unique constraint \"users_email_key\""
        );

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("This email is already registered. Please login or use another email.", response.getBody().get("error"));
        assertEquals("This email is already registered. Please login or use another email.", response.getBody().get("email"));
    }

    @Test
    @DisplayName("11. GlobalExceptionHandler handleDataIntegrityViolationException catches owner-to-one-shop constraint")
    void testGlobalExceptionHandler_OwnerRaceCondition() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException(
                "ERROR: duplicate key value violates unique constraint \"uk_shops_owner_id\""
        );

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDataIntegrityViolationException(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("An owner account can only own one bakery store.", response.getBody().get("error"));
    }

    @Test
    @DisplayName("12. Login normalizes email case-insensitively")
    void testLogin_EmailNormalization() {
        LoginRequest request = new LoginRequest();
        request.setEmail("  OWNER@SweetDelight.COM  ");
        request.setPassword("password123");

        User mockUser = new User();
        mockUser.setId(50L);
        mockUser.setEmail("owner@sweetdelight.com");
        mockUser.setRole(UserRole.SHOP_OWNER);
        mockUser.setFullName("Sweet Owner");

        when(userRepository.findByEmailIgnoreCase("owner@sweetdelight.com")).thenReturn(Optional.of(mockUser));
        when(shopRepository.findFirstByOwnerId(50L)).thenReturn(Optional.empty());
        when(jwtService.generateToken(any(), any())).thenReturn("jwt_token_123");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("owner@sweetdelight.com", response.getEmail());
        assertEquals("jwt_token_123", response.getToken());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }
}
