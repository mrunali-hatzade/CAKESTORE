package com.cakeplatform.api.modules.media;

import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.interaction.controller.CustomerInteractionController;
import com.cakeplatform.api.modules.interaction.controller.OwnerInteractionController;
import com.cakeplatform.api.modules.interaction.dto.CustomCakeDto;
import com.cakeplatform.api.modules.interaction.dto.ReplyRequest;
import com.cakeplatform.api.modules.interaction.service.InteractionService;
import com.cakeplatform.api.modules.interaction.service.OwnerInteractionService;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.storefront.CustomerMediaController;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GuestMediaUploadSecurityTest {

    @Mock
    private StorageService storageService;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private CustomCakeRequestRepository customCakeRequestRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    private CustomerMediaController customerMediaController;
    private MediaController ownerMediaController;
    private InteractionService interactionService;
    private OwnerInteractionService ownerInteractionService;

    private Shop testShop;
    private User ownerA;
    private User ownerB;

    @BeforeEach
    void setUp() {
        customerMediaController = new CustomerMediaController(storageService);
        ownerMediaController = new MediaController(storageService);
        interactionService = new InteractionService(null, null, customCakeRequestRepository, shopRepository, notificationService);
        ownerInteractionService = new OwnerInteractionService(null, null, customCakeRequestRepository, shopAccessValidator);

        ownerA = new User();
        ownerA.setId(10L);
        ownerA.setEmail("ownerA@test.com");
        ownerA.setRole(UserRole.SHOP_OWNER);

        ownerB = new User();
        ownerB.setId(20L);
        ownerB.setEmail("ownerB@test.com");
        ownerB.setRole(UserRole.SHOP_OWNER);

        testShop = new Shop();
        testShop.setId(100L);
        testShop.setBusinessName("Artisan Bakes");
        testShop.setStatus(ShopStatus.ACTIVE);
        testShop.setOwner(ownerA);
    }

    @Test
    @DisplayName("H1.1: Valid JPEG guest upload succeeds and returns safe media URL")
    void testValidJpegGuestUpload_Succeeds() {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};
        MockMultipartFile file = new MockMultipartFile("file", "cake-photo.jpg", "image/jpeg", jpegBytes);

        when(storageService.storeFile(any(), eq("custom-cake-references")))
                .thenReturn("http://localhost:8080/uploads/custom-cake-references/uuid-12345.jpg");

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("http://localhost:8080/uploads/custom-cake-references/uuid-12345.jpg", response.getBody().get("url"));
        assertEquals("cake-photo.jpg", response.getBody().get("fileName"));
    }

    @Test
    @DisplayName("H1.2: Valid PNG guest upload succeeds")
    void testValidPngGuestUpload_Succeeds() {
        byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        MockMultipartFile file = new MockMultipartFile("file", "sketch.png", "image/png", pngBytes);

        when(storageService.storeFile(any(), eq("custom-cake-references")))
                .thenReturn("http://localhost:8080/uploads/custom-cake-references/uuid-png.png");

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/custom-cake-references/uuid-png.png", response.getBody().get("url"));
    }

    @Test
    @DisplayName("H1.3: Valid WEBP guest upload succeeds")
    void testValidWebpGuestUpload_Succeeds() {
        // RIFF (4 bytes) + 4 size bytes + WEBP (4 bytes)
        byte[] webpBytes = new byte[]{
                0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38
        };
        MockMultipartFile file = new MockMultipartFile("file", "modern.webp", "image/webp", webpBytes);

        when(storageService.storeFile(any(), eq("custom-cake-references")))
                .thenReturn("http://localhost:8080/uploads/custom-cake-references/uuid-webp.webp");

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/custom-cake-references/uuid-webp.webp", response.getBody().get("url"));
    }

    @Test
    @DisplayName("H1.4: File exceeding 5MB is rejected with 400 Bad Request")
    void testFileExceeding5Mb_Rejected() {
        byte[] largeBytes = new byte[5 * 1024 * 1024 + 1];
        largeBytes[0] = (byte) 0xFF;
        largeBytes[1] = (byte) 0xD8;
        largeBytes[2] = (byte) 0xFF;
        MockMultipartFile file = new MockMultipartFile("file", "massive.jpg", "image/jpeg", largeBytes);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("5MB limit"));
    }

    @Test
    @DisplayName("H1.5: Fake JPEG with invalid magic bytes is rejected")
    void testFakeJpegInvalidMagicBytes_Rejected() {
        byte[] fakeContent = "This is a malicious text file disguised as a jpeg".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", fakeContent);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("Magic bytes verification failed"));
    }

    @Test
    @DisplayName("H1.6: SVG image upload is strictly rejected")
    void testSvgUpload_Rejected() {
        byte[] svgBytes = "<svg xmlns='http://www.w3.org/2000/svg'><script>alert('xss')</script></svg>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "vector.svg", "image/svg+xml", svgBytes);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("Invalid file type"));
    }

    @Test
    @DisplayName("H1.7: HTML upload is strictly rejected")
    void testHtmlUpload_Rejected() {
        byte[] htmlBytes = "<html><body><h1>Injected</h1></body></html>".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "payload.html", "text/html", htmlBytes);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("Invalid file type"));
    }

    @Test
    @DisplayName("H1.8: Executable .exe upload is strictly rejected")
    void testExecutableUpload_Rejected() {
        byte[] exeBytes = new byte[]{0x4D, 0x5A, 0x00, 0x00}; // MZ header
        MockMultipartFile file = new MockMultipartFile("file", "trojan.exe", "application/octet-stream", exeBytes);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("H1.9: PDF is rejected on guest endpoint (restricted to images)")
    void testPdfUpload_RejectedOnGuestEndpoint() {
        byte[] pdfBytes = "%PDF-1.4 sample content".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "invoice.pdf", "application/pdf", pdfBytes);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("Invalid file type"));
    }

    @Test
    @DisplayName("H1.10: Path traversal in filename is sanitized and server generates UUID file")
    void testPathTraversalInFilename_Sanitized() {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};
        MockMultipartFile file = new MockMultipartFile("file", "../../etc/passwd.jpg", "image/jpeg", jpegBytes);

        when(storageService.storeFile(any(), eq("custom-cake-references")))
                .thenReturn("http://localhost:8080/uploads/custom-cake-references/safe-uuid.jpg");

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/custom-cake-references/safe-uuid.jpg", response.getBody().get("url"));
    }

    @Test
    @DisplayName("H1.11: Empty file is rejected")
    void testEmptyFile_Rejected() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        ResponseEntity<Map<String, String>> response = customerMediaController.uploadReferenceImage(file);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().get("error").contains("File must not be empty"));
    }

    @Test
    @DisplayName("H1.12: Custom cake inquiry persists reference image URL and bakery owner can view it")
    void testCustomCakeInquiry_PersistsReferenceImageUrl_OwnerCanView() {
        when(shopRepository.findById(100L)).thenReturn(Optional.of(testShop));

        CustomCakeDto dto = new CustomCakeDto();
        dto.setCustomerName("Priya Sharma");
        dto.setCustomerEmail("priya@example.com");
        dto.setCustomerMobile("9876543210");
        dto.setOccasion("First Birthday");
        dto.setCakeType("TIER_CAKE");
        dto.setFlavour("Belgian Dark Truffle");
        dto.setServings(25);
        dto.setBudget(BigDecimal.valueOf(3500));
        dto.setRequiredDate(LocalDate.now().plusDays(5));
        dto.setDeliveryPreference("DOORSTEP_DELIVERY");
        dto.setDesignDescription("Two-tier pastel pink with gold leaf");
        dto.setReferenceImageUrl("http://localhost:8080/uploads/custom-cake-references/inspiration-uuid.jpg");

        when(customCakeRequestRepository.save(any(CustomCakeRequest.class))).thenAnswer(invocation -> {
            CustomCakeRequest req = invocation.getArgument(0);
            req.setId(501L);
            return req;
        });

        CustomCakeRequest saved = interactionService.submitCustomCakeRequest(100L, dto);

        assertNotNull(saved);
        assertEquals(501L, saved.getId());
        assertEquals("http://localhost:8080/uploads/custom-cake-references/inspiration-uuid.jpg", saved.getReferenceImageUrl());

        // Bakery Owner retrieves inquiries
        when(shopAccessValidator.getValidShopForOwner(10L)).thenReturn(testShop);
        when(customCakeRequestRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(saved));

        List<CustomCakeRequest> ownerInquiries = ownerInteractionService.getMyCustomCakeRequests(10L);

        assertEquals(1, ownerInquiries.size());
        assertEquals("http://localhost:8080/uploads/custom-cake-references/inspiration-uuid.jpg", ownerInquiries.get(0).getReferenceImageUrl());
    }

    @Test
    @DisplayName("H1.13: Cross-owner isolation: Owner B cannot view or update Owner A's custom cake requests")
    void testCrossOwnerIsolation_Denied() {
        Shop shopB = new Shop();
        shopB.setId(200L);
        shopB.setOwner(ownerB);

        when(shopAccessValidator.getValidShopForOwner(20L)).thenReturn(shopB);
        // Request 501 belongs to Shop 100, not Shop 200
        when(customCakeRequestRepository.findByIdAndShopId(501L, 200L)).thenReturn(Optional.empty());

        ReplyRequest reply = new ReplyRequest();
        reply.setReply("Price is ₹4000");

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                ownerInteractionService.updateCustomCakeRequestStatus(20L, 501L, "REVIEWED", reply)
        );
        assertTrue(ex.getMessage().contains("not found"));
    }

    @Test
    @DisplayName("H1.14: Missing reference image is handled cleanly without NPE")
    void testMissingReferenceImage_HandledCleanly() {
        when(shopRepository.findById(100L)).thenReturn(Optional.of(testShop));

        CustomCakeDto dto = new CustomCakeDto();
        dto.setCustomerName("Rahul Verma");
        dto.setCustomerEmail("rahul@example.com");
        dto.setReferenceImageUrl(null); // No reference image

        when(customCakeRequestRepository.save(any(CustomCakeRequest.class))).thenAnswer(invocation -> {
            CustomCakeRequest req = invocation.getArgument(0);
            req.setId(502L);
            return req;
        });

        CustomCakeRequest saved = interactionService.submitCustomCakeRequest(100L, dto);

        assertNotNull(saved);
        assertNull(saved.getReferenceImageUrl());
    }

    @Test
    @DisplayName("H1.15: Existing owner media upload remains functional")
    void testExistingOwnerMediaUpload_RemainsFunctional() {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
        MockMultipartFile file = new MockMultipartFile("file", "product.jpg", "image/jpeg", jpegBytes);

        when(storageService.storeFile(any(), eq("products")))
                .thenReturn("http://localhost:8080/uploads/products/prod-123.jpg");

        ResponseEntity<Map<String, String>> response = ownerMediaController.uploadFile(file, "products");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("http://localhost:8080/uploads/products/prod-123.jpg", response.getBody().get("url"));
    }
}
