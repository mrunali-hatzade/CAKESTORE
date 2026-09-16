package com.cakeplatform.api.modules.security;

import com.cakeplatform.api.config.FileStorageProperties;
import com.cakeplatform.api.config.GlobalExceptionHandler;
import com.cakeplatform.api.modules.common.HealthController;
import com.cakeplatform.api.modules.media.MediaController;
import com.cakeplatform.api.modules.media.StorageService;
import com.cakeplatform.api.security.CustomUserDetailsService;
import com.cakeplatform.api.security.JwtAuthenticationEntryPoint;
import com.cakeplatform.api.security.JwtAuthenticationFilter;
import com.cakeplatform.api.security.RateLimitingFilter;
import com.cakeplatform.api.security.SecurityConfig;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StageEProductionHardeningTest {

    @Mock
    private StorageService storageService;

    @Mock
    private FilterChain filterChain;

    private MediaController mediaController;
    private RateLimitingFilter rateLimitingFilter;
    private HealthController healthController;
    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        mediaController = new MediaController(storageService);
        rateLimitingFilter = new RateLimitingFilter();
        healthController = new HealthController();
        exceptionHandler = new GlobalExceptionHandler();
    }

    // =========================================================================
    // 1. HEALTH CHECK & OBSERVABILITY (E6)
    // =========================================================================

    @Test
    @DisplayName("Health endpoint returns HTTP 200 with UP status and no exposed secrets")
    void testHealthEndpoint_ReturnsUpStatusWithoutSecrets() {
        ResponseEntity<Map<String, Object>> response = healthController.healthCheck();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("UP", response.getBody().get("status"));
        assertEquals("cake-platform-api", response.getBody().get("service"));
        assertNotNull(response.getBody().get("timestamp"));

        // Verify zero secrets leaked
        assertFalse(response.getBody().containsKey("password"));
        assertFalse(response.getBody().containsKey("secret"));
        assertFalse(response.getBody().containsKey("jwt"));
        assertFalse(response.getBody().containsKey("database"));
    }

    // =========================================================================
    // 2. CORS CONFIGURATION HARDENING (E2)
    // =========================================================================

    @Test
    @DisplayName("CORS configuration parses allowed origins and rejects wildcards with credentials")
    void testCorsConfiguration_ExplicitAllowedOriginsAndHeaders() {
        SecurityConfig securityConfig = new SecurityConfig(
                mock(JwtAuthenticationFilter.class),
                mock(CustomUserDetailsService.class),
                mock(JwtAuthenticationEntryPoint.class)
        );

        ReflectionTestUtils.setField(securityConfig, "allowedOriginsConfig", "https://cakestore.in, https://admin.cakestore.in");
        CorsConfigurationSource source = securityConfig.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/storefront/shops");
        CorsConfiguration config = source.getCorsConfiguration(request);

        assertNotNull(config);
        assertEquals(List.of("https://cakestore.in", "https://admin.cakestore.in"), config.getAllowedOrigins());
        assertTrue(config.getAllowCredentials());

        // Wildcard '*' must not be present in allowed origins
        assertFalse(config.getAllowedOrigins().contains("*"));

        // Allowed headers must be explicit (not wildcard '*')
        assertFalse(config.getAllowedHeaders().contains("*"));
        assertTrue(config.getAllowedHeaders().contains("Authorization"));
        assertTrue(config.getAllowedHeaders().contains("Content-Type"));

        // Exposed headers must include Retry-After
        assertTrue(config.getExposedHeaders().contains("Retry-After"));
    }

    // =========================================================================
    // 3. MULTI-TIER RATE LIMITING & WEBHOOK EXEMPTION (E4)
    // =========================================================================

    @Test
    @DisplayName("Webhooks and Health Check are exempt from rate limiting")
    void testRateLimiting_WebhooksAndHealthAreExempt() throws ServletException, IOException {
        // Test webhook exemption
        MockHttpServletRequest webhookReq = new MockHttpServletRequest("POST", "/api/webhooks/razorpay");
        MockHttpServletResponse webhookRes = new MockHttpServletResponse();
        rateLimitingFilter.doFilter(webhookReq, webhookRes, filterChain);
        verify(filterChain, times(1)).doFilter(webhookReq, webhookRes);

        // Test health check exemption
        MockHttpServletRequest healthReq = new MockHttpServletRequest("GET", "/api/health");
        MockHttpServletResponse healthRes = new MockHttpServletResponse();
        rateLimitingFilter.doFilter(healthReq, healthRes, filterChain);
        verify(filterChain, times(1)).doFilter(healthReq, healthRes);
    }

    @Test
    @DisplayName("Auth endpoints enforce 10 req/min and return structured JSON 429 with Retry-After")
    void testRateLimiting_AuthTierEnforcesLimit() throws ServletException, IOException {
        String testIp = "192.168.1.100";

        // First 10 requests should pass
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr(testIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            rateLimitingFilter.doFilter(req, res, filterChain);
            assertEquals(200, res.getStatus());
        }

        // 11th request must be rate limited with HTTP 429
        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedReq.setRemoteAddr(testIp);
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();
        rateLimitingFilter.doFilter(blockedReq, blockedRes, filterChain);

        assertEquals(429, blockedRes.getStatus());
        assertEquals("60", blockedRes.getHeader("Retry-After"));
        assertTrue(blockedRes.getContentType().contains("application/json"));
        assertTrue(blockedRes.getContentAsString().contains("Rate limit exceeded"));
    }

    @Test
    @DisplayName("Storefront browsing allows up to 120 req/min for seamless customer experience")
    void testRateLimiting_StorefrontBrowsingTierAllowsHighVolume() throws ServletException, IOException {
        String testIp = "192.168.1.200";

        // Send 30 rapid storefront browsing requests (well above the old 20 limit)
        for (int i = 0; i < 30; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/storefront/delight-bakery/products");
            req.setRemoteAddr(testIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            rateLimitingFilter.doFilter(req, res, filterChain);
            assertEquals(200, res.getStatus());
        }

        // Verify all 30 were forwarded to filterChain without blocking
        verify(filterChain, times(30)).doFilter(any(), any());
    }

    @Test
    @DisplayName("X-Forwarded-For header is used to discriminate client IPs behind reverse proxy")
    void testRateLimiting_UsesXForwardedForHeader() throws ServletException, IOException {
        // Client A consumes 10 auth tokens
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
            req.setRemoteAddr("10.0.0.1"); // Load balancer IP
            req.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.1");
            MockHttpServletResponse res = new MockHttpServletResponse();
            rateLimitingFilter.doFilter(req, res, filterChain);
        }

        // Client A's 11th request is blocked
        MockHttpServletRequest clientAReq = new MockHttpServletRequest("POST", "/api/auth/login");
        clientAReq.setRemoteAddr("10.0.0.1");
        clientAReq.addHeader("X-Forwarded-For", "203.0.113.10, 10.0.0.1");
        MockHttpServletResponse clientARes = new MockHttpServletResponse();
        rateLimitingFilter.doFilter(clientAReq, clientARes, filterChain);
        assertEquals(429, clientARes.getStatus());

        // Client B from different IP behind SAME proxy is NOT blocked
        MockHttpServletRequest clientBReq = new MockHttpServletRequest("POST", "/api/auth/login");
        clientBReq.setRemoteAddr("10.0.0.1");
        clientBReq.addHeader("X-Forwarded-For", "203.0.113.20, 10.0.0.1");
        MockHttpServletResponse clientBRes = new MockHttpServletResponse();
        rateLimitingFilter.doFilter(clientBReq, clientBRes, filterChain);
        assertEquals(200, clientBRes.getStatus());
    }

    // =========================================================================
    // 4. UPLOAD VALIDATION & MAGIC BYTES SECURITY (E3, E5)
    // =========================================================================

    @Test
    @DisplayName("Upload rejects empty file")
    void testUpload_RejectsEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
        ResponseEntity<Map<String, String>> response = mediaController.uploadFile(emptyFile, "products");

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("empty"));
    }

    @Test
    @DisplayName("Upload rejects path traversal in category/subDirectory")
    void testUpload_RejectsPathTraversalSubdirectory() {
        byte[] validPngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MockMultipartFile validFile = new MockMultipartFile("file", "test.png", "image/png", validPngHeader);

        // Path traversal attempts
        assertEquals(HttpStatus.BAD_REQUEST, mediaController.uploadFile(validFile, "../../etc").getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, mediaController.uploadFile(validFile, "products/../passwords").getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, mediaController.uploadFile(validFile, "unauthorized_folder").getStatusCode());
    }

    @Test
    @DisplayName("Upload rejects disallowed file extensions (.exe, .sh, .html, .js)")
    void testUpload_RejectsDisallowedExtensions() {
        byte[] content = "malicious payload".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile exeFile = new MockMultipartFile("file", "exploit.exe", "application/octet-stream", content);
        MockMultipartFile shFile = new MockMultipartFile("file", "run.sh", "text/plain", content);
        MockMultipartFile htmlFile = new MockMultipartFile("file", "xss.html", "text/html", content);

        assertEquals(HttpStatus.BAD_REQUEST, mediaController.uploadFile(exeFile, "products").getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, mediaController.uploadFile(shFile, "products").getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, mediaController.uploadFile(htmlFile, "products").getStatusCode());
    }

    @Test
    @DisplayName("Upload rejects spoofed files failing magic bytes inspection (e.g. text file renamed to .jpg)")
    void testUpload_RejectsSpoofedMagicBytes() {
        // Plain text content disguised as .jpg
        byte[] fakeJpgContent = "echo 'attack script'".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile spoofedFile = new MockMultipartFile("file", "image.jpg", "image/jpeg", fakeJpgContent);

        ResponseEntity<Map<String, String>> response = mediaController.uploadFile(spoofedFile, "products");
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("Magic bytes verification failed"));
    }

    @Test
    @DisplayName("Upload accepts valid JPEG with correct FF D8 FF magic bytes")
    void testUpload_AcceptsValidJpeg() {
        byte[] validJpeg = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F', 0, 1};
        MockMultipartFile file = new MockMultipartFile("file", "cake.jpg", "image/jpeg", validJpeg);
        when(storageService.storeFile(any(), eq("products"))).thenReturn("http://localhost:8080/uploads/products/uuid.jpg");

        ResponseEntity<Map<String, String>> response = mediaController.uploadFile(file, "products");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/products/uuid.jpg", response.getBody().get("url"));
    }

    @Test
    @DisplayName("Upload accepts valid PNG with correct 89 50 4E 47 magic bytes")
    void testUpload_AcceptsValidPng() {
        byte[] validPng = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", validPng);
        when(storageService.storeFile(any(), eq("logos"))).thenReturn("http://localhost:8080/uploads/logos/uuid.png");

        ResponseEntity<Map<String, String>> response = mediaController.uploadFile(file, "logos");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/logos/uuid.png", response.getBody().get("url"));
    }

    @Test
    @DisplayName("Upload accepts valid PDF with correct %PDF magic bytes")
    void testUpload_AcceptsValidPdf() {
        byte[] validPdf = new byte[]{'%', 'P', 'D', 'F', '-', '1', '.', '5', '\n', 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", "license.pdf", "application/pdf", validPdf);
        when(storageService.storeFile(any(), eq("documents"))).thenReturn("http://localhost:8080/uploads/documents/uuid.pdf");

        ResponseEntity<Map<String, String>> response = mediaController.uploadFile(file, "documents");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/documents/uuid.pdf", response.getBody().get("url"));
    }

    @Test
    @DisplayName("Upload accepts valid WEBP with correct RIFF...WEBP magic bytes")
    void testUpload_AcceptsValidWebp() {
        byte[] validWebp = new byte[]{
                'R', 'I', 'F', 'F',
                0x24, 0, 0, 0,
                'W', 'E', 'B', 'P'
        };
        MockMultipartFile file = new MockMultipartFile("file", "hero.webp", "image/webp", validWebp);
        when(storageService.storeFile(any(), eq("covers"))).thenReturn("http://localhost:8080/uploads/covers/uuid.webp");

        ResponseEntity<Map<String, String>> response = mediaController.uploadFile(file, "covers");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/covers/uuid.webp", response.getBody().get("url"));
    }

    // =========================================================================
    // 5. OBSERVABILITY & ERROR MASKING (E6)
    // =========================================================================

    @Test
    @DisplayName("GlobalExceptionHandler maps MaxUploadSizeExceededException to HTTP 413 Payload Too Large")
    void testExceptionHandler_MaxUploadSize() {
        MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(5 * 1024 * 1024);
        ResponseEntity<Map<String, String>> response = exceptionHandler.handleMaxUploadSizeExceededException(ex);

        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("5MB"));
    }

    @Test
    @DisplayName("GlobalExceptionHandler masks unexpected internal exceptions into safe HTTP 500 without leaking stack trace or SQL")
    void testExceptionHandler_MasksInternalExceptions() {
        Exception internalError = new RuntimeException("org.postgresql.util.PSQLException: ERROR: relation \"users\" does not exist");
        ResponseEntity<Map<String, String>> response = exceptionHandler.handleGeneralException(internalError);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("An unexpected internal server error occurred. Please contact support.", response.getBody().get("error"));

        // Verify raw SQL or table names are completely masked
        assertFalse(response.getBody().get("error").contains("PSQLException"));
        assertFalse(response.getBody().get("error").contains("relation"));
        assertFalse(response.getBody().get("error").contains("users"));
    }

    // =========================================================================
    // 6. MEDIA UPLOAD SERVICE PATH TRAVERSAL DEFENSE
    // =========================================================================

    @Test
    @DisplayName("StorageService rejects subDirectory containing path traversal characters")
    void testStorageService_PathTraversalRejection() throws IOException {
        Path tempDir = Files.createTempDirectory("cakestore_test_uploads");
        FileStorageProperties props = new FileStorageProperties();
        props.setUploadDir(tempDir.toString());
        StorageService uploadService = new com.cakeplatform.api.modules.media.LocalMediaUploadServiceImpl(props);

        MockMultipartFile file = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[]{1, 2, 3});

        // Path traversal in subDirectory
        assertThrows(IllegalArgumentException.class, () -> {
            uploadService.storeFile(file, "../traversal");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            uploadService.storeFile(file, "sub/dir");
        });
    }
}
