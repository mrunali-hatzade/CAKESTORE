package com.cakeplatform.api.modules.review;

import com.cakeplatform.api.modules.interaction.Feedback;
import com.cakeplatform.api.modules.interaction.FeedbackRepository;
import com.cakeplatform.api.modules.interaction.dto.FeedbackRequest;
import com.cakeplatform.api.modules.interaction.service.InteractionService;
import com.cakeplatform.api.modules.media.StorageService;
import com.cakeplatform.api.modules.notification.NotificationService;
import com.cakeplatform.api.modules.notification.NotificationType;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.storefront.CustomerMediaController;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontController;
import com.cakeplatform.api.modules.storefront.CustomerStorefrontService;
import com.cakeplatform.api.modules.storefront.dto.StorefrontShopSummaryDTO;
import com.cakeplatform.api.modules.user.User;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CustomerFeedbackAndMediaPhase1Test {

    @Mock
    private FeedbackRepository feedbackRepository;

    @Mock
    private ShopRepository shopRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private StorageService storageService;

    @Mock
    private CustomerStorefrontService storefrontService;

    private InteractionService interactionService;
    private CustomerMediaController customerMediaController;
    private CustomerStorefrontController customerStorefrontController;

    private Shop bakeryShop;
    private Shop otherBakeryShop;
    private User bakeryOwner;
    private Product cakeProduct;
    private Product otherBakeryProduct;

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();

        bakeryOwner = new User();
        bakeryOwner.setId(10L);
        bakeryOwner.setEmail("baker@example.com");

        bakeryShop = new Shop();
        bakeryShop.setId(100L);
        bakeryShop.setBusinessName("The Royal Oven");
        bakeryShop.setStatus(ShopStatus.ACTIVE);
        bakeryShop.setOwner(bakeryOwner);

        otherBakeryShop = new Shop();
        otherBakeryShop.setId(200L);
        otherBakeryShop.setBusinessName("Another Bakery");
        otherBakeryShop.setStatus(ShopStatus.ACTIVE);

        cakeProduct = new Product();
        cakeProduct.setId(501L);
        cakeProduct.setName("Triple Chocolate Mousse Cake");
        cakeProduct.setPrice(BigDecimal.valueOf(1200));
        cakeProduct.setShop(bakeryShop);

        otherBakeryProduct = new Product();
        otherBakeryProduct.setId(999L);
        otherBakeryProduct.setName("Red Velvet Slice");
        otherBakeryProduct.setPrice(BigDecimal.valueOf(350));
        otherBakeryProduct.setShop(otherBakeryShop);

        interactionService = new InteractionService(
                feedbackRepository,
                null,
                null,
                null,
                shopRepository,
                notificationService,
                productRepository
        );

        customerMediaController = new CustomerMediaController(storageService);
        customerStorefrontController = new CustomerStorefrontController(storefrontService);
    }

    // =========================================================================
    // 1. V27 ENTITY & DTO VALIDATION TESTS
    // =========================================================================
    @Nested
    @DisplayName("V27 Entity and DTO Validation")
    class EntityAndDtoTests {

        @Test
        @DisplayName("Feedback entity correctly stores and accesses V27 fields")
        void testFeedbackEntityV27Fields() {
            Feedback feedback = new Feedback();
            feedback.setProduct(cakeProduct);
            feedback.setProductName("Triple Chocolate Mousse Cake");
            feedback.setRecommendationText("Highly recommended for birthdays! Rich Belgian chocolate.");
            feedback.setCakeImageUrl("https://storage.example.com/review-media/cake123.jpg");
            feedback.setCakeVideoUrl("https://storage.example.com/review-media/cake123.mp4");

            assertEquals(501L, feedback.getProductId());
            assertEquals(cakeProduct, feedback.getProduct());
            assertEquals("Triple Chocolate Mousse Cake", feedback.getProductName());
            assertEquals("Highly recommended for birthdays! Rich Belgian chocolate.", feedback.getRecommendationText());
            assertEquals("https://storage.example.com/review-media/cake123.jpg", feedback.getCakeImageUrl());
            assertEquals("https://storage.example.com/review-media/cake123.mp4", feedback.getCakeVideoUrl());

            feedback.setProduct(null);
            assertNull(feedback.getProductId());
        }

        @Test
        @DisplayName("FeedbackRequest DTO accepts valid V27 fields and enforces constraint annotations")
        void testFeedbackRequestValidation() {
            FeedbackRequest validReq = new FeedbackRequest();
            validReq.setCustomerDisplayName("Aarav Patel");
            validReq.setRating(5);
            validReq.setComment("Outstanding quality and taste!");
            validReq.setProductId(501L);
            validReq.setProductName("Triple Chocolate Mousse Cake");
            validReq.setRecommendationText("Get the 1kg version for parties.");
            validReq.setCakeImageUrl("https://storage.example.com/img.jpg");
            validReq.setCakeVideoUrl("https://storage.example.com/vid.mp4");

            var violations = validator.validate(validReq);
            assertTrue(violations.isEmpty(), "Valid request should produce 0 violations");

            // Test rating constraints
            FeedbackRequest invalidRatingReq = new FeedbackRequest();
            invalidRatingReq.setRating(6);
            invalidRatingReq.setComment("Too high rating");
            assertFalse(validator.validate(invalidRatingReq).isEmpty());

            FeedbackRequest zeroRatingReq = new FeedbackRequest();
            zeroRatingReq.setRating(0);
            zeroRatingReq.setComment("Zero rating");
            assertFalse(validator.validate(zeroRatingReq).isEmpty());

            // Test blank comment constraint
            FeedbackRequest blankCommentReq = new FeedbackRequest();
            blankCommentReq.setRating(4);
            blankCommentReq.setComment("   ");
            assertFalse(validator.validate(blankCommentReq).isEmpty());
        }
    }

    // =========================================================================
    // 2. INTERACTION SERVICE FEEDBACK ENHANCEMENT TESTS
    // =========================================================================
    @Nested
    @DisplayName("Interaction Service Feedback Product & Media Enhancement")
    class InteractionServiceFeedbackTests {

        @Test
        @DisplayName("Submit feedback with valid product sets FK and derives authoritative name")
        void testSubmitFeedback_WithValidProduct_DerivesAuthoritativeName() {
            when(shopRepository.findById(100L)).thenReturn(Optional.of(bakeryShop));
            when(productRepository.findById(501L)).thenReturn(Optional.of(cakeProduct));
            when(feedbackRepository.save(any(Feedback.class))).thenAnswer(invocation -> {
                Feedback f = invocation.getArgument(0);
                f.setId(1001L);
                return f;
            });

            FeedbackRequest req = new FeedbackRequest();
            req.setCustomerDisplayName("Sneha R.");
            req.setRating(5);
            req.setComment("Superb cake presentation and taste!");
            req.setProductId(501L);
            req.setProductName("Untrusted User Provided Name");
            req.setRecommendationText("Ask for less sugar if preferred.");
            req.setCakeImageUrl("https://storage.example.com/review-media/cake.jpg");
            req.setCakeVideoUrl("https://storage.example.com/review-media/cake.mp4");

            Feedback saved = interactionService.submitFeedback(100L, req);

            assertNotNull(saved);
            assertEquals(cakeProduct, saved.getProduct());
            assertEquals("Triple Chocolate Mousse Cake", saved.getProductName(), "Authoritative DB product name must be used");
            assertEquals("Ask for less sugar if preferred.", saved.getRecommendationText());
            assertEquals("https://storage.example.com/review-media/cake.jpg", saved.getCakeImageUrl());
            assertEquals("https://storage.example.com/review-media/cake.mp4", saved.getCakeVideoUrl());
            assertTrue(saved.getIsApproved());

            verify(notificationService).createNotification(
                    eq(bakeryOwner),
                    eq(NotificationType.NEW_FEEDBACK),
                    eq("New Feedback"),
                    contains("5-star"),
                    eq("1001"),
                    eq(true)
            );
        }

        @Test
        @DisplayName("Submit feedback with product belonging to another bakery throws IllegalArgumentException")
        void testSubmitFeedback_WithProductFromOtherBakery_ThrowsException() {
            when(shopRepository.findById(100L)).thenReturn(Optional.of(bakeryShop));
            when(productRepository.findById(999L)).thenReturn(Optional.of(otherBakeryProduct));

            FeedbackRequest req = new FeedbackRequest();
            req.setRating(4);
            req.setComment("Cross-bakery cake attempt");
            req.setProductId(999L);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    interactionService.submitFeedback(100L, req)
            );
            assertEquals("Product does not belong to this bakery", ex.getMessage());
            verify(feedbackRepository, never()).save(any());
        }

        @Test
        @DisplayName("Submit feedback with non-existent productId throws IllegalArgumentException")
        void testSubmitFeedback_WithNonExistentProduct_ThrowsException() {
            when(shopRepository.findById(100L)).thenReturn(Optional.of(bakeryShop));
            when(productRepository.findById(888L)).thenReturn(Optional.empty());

            FeedbackRequest req = new FeedbackRequest();
            req.setRating(5);
            req.setComment("Missing product");
            req.setProductId(888L);

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                    interactionService.submitFeedback(100L, req)
            );
            assertTrue(ex.getMessage().contains("Product not found with ID: 888"));
            verify(feedbackRepository, never()).save(any());
        }

        @Test
        @DisplayName("Submit feedback without productId preserves backward compatibility and free text product name")
        void testSubmitFeedback_WithoutProduct_SucceedsWithLegacyBehavior() {
            when(shopRepository.findById(100L)).thenReturn(Optional.of(bakeryShop));
            when(feedbackRepository.save(any(Feedback.class))).thenAnswer(invocation -> {
                Feedback f = invocation.getArgument(0);
                f.setId(1002L);
                return f;
            });

            FeedbackRequest req = new FeedbackRequest();
            req.setRating(5);
            req.setComment("General bakery compliment");
            req.setProductName("Custom Customised Vanilla Sponge");

            Feedback saved = interactionService.submitFeedback(100L, req);

            assertNotNull(saved);
            assertNull(saved.getProduct());
            assertEquals("Custom Customised Vanilla Sponge", saved.getProductName());
            verify(productRepository, never()).findById(any());
        }
    }

    // =========================================================================
    // 3. CUSTOMER MEDIA CONTROLLER REVIEW MEDIA UPLOAD TESTS
    // =========================================================================
    @Nested
    @DisplayName("Review Media Upload Endpoint (/api/storefront/media/upload-review-media)")
    class ReviewMediaUploadTests {

        @Test
        @DisplayName("Valid JPEG image upload succeeds and returns review-media URL")
        void testUploadReviewMedia_ValidJpeg_Success() {
            byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46};
            MockMultipartFile file = new MockMultipartFile("file", "cake.jpg", "image/jpeg", jpegBytes);

            when(storageService.storeFile(any(), eq("review-media")))
                    .thenReturn("http://localhost:8080/uploads/review-media/uuid-cake.jpg");

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertNotNull(response.getBody());
            assertEquals("http://localhost:8080/uploads/review-media/uuid-cake.jpg", response.getBody().get("url"));
            assertEquals("cake.jpg", response.getBody().get("fileName"));
            assertEquals("image/jpeg", response.getBody().get("type"));
        }

        @Test
        @DisplayName("Valid PNG image upload succeeds")
        void testUploadReviewMedia_ValidPng_Success() {
            byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
            MockMultipartFile file = new MockMultipartFile("file", "cake.png", "image/png", pngBytes);

            when(storageService.storeFile(any(), eq("review-media")))
                    .thenReturn("http://localhost:8080/uploads/review-media/uuid-cake.png");

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("http://localhost:8080/uploads/review-media/uuid-cake.png", response.getBody().get("url"));
        }

        @Test
        @DisplayName("Valid WEBP image upload succeeds")
        void testUploadReviewMedia_ValidWebp_Success() {
            byte[] webpBytes = new byte[]{
                    0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38
            };
            MockMultipartFile file = new MockMultipartFile("file", "cake.webp", "image/webp", webpBytes);

            when(storageService.storeFile(any(), eq("review-media")))
                    .thenReturn("http://localhost:8080/uploads/review-media/uuid-cake.webp");

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("http://localhost:8080/uploads/review-media/uuid-cake.webp", response.getBody().get("url"));
        }

        @Test
        @DisplayName("Valid MP4 video upload succeeds (with ftyp magic bytes)")
        void testUploadReviewMedia_ValidMp4_Success() {
            // 4 bytes length, then 'ftyp' (0x66, 0x74, 0x79, 0x70)
            byte[] mp4Bytes = new byte[]{0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32};
            MockMultipartFile file = new MockMultipartFile("file", "cake-cutting.mp4", "video/mp4", mp4Bytes);

            when(storageService.storeFile(any(), eq("review-media")))
                    .thenReturn("http://localhost:8080/uploads/review-media/uuid-video.mp4");

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("http://localhost:8080/uploads/review-media/uuid-video.mp4", response.getBody().get("url"));
            assertEquals("video/mp4", response.getBody().get("type"));
        }

        @Test
        @DisplayName("Valid WebM video upload succeeds (with EBML magic bytes)")
        void testUploadReviewMedia_ValidWebm_Success() {
            // EBML magic bytes: 0x1A, 0x45, 0xDF, 0xA3
            byte[] webmBytes = new byte[]{(byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3, 0x01, 0x00, 0x00, 0x00};
            MockMultipartFile file = new MockMultipartFile("file", "cake-cutting.webm", "video/webm", webmBytes);

            when(storageService.storeFile(any(), eq("review-media")))
                    .thenReturn("http://localhost:8080/uploads/review-media/uuid-video.webm");

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("http://localhost:8080/uploads/review-media/uuid-video.webm", response.getBody().get("url"));
        }

        @Test
        @DisplayName("Image exceeding 5MB is rejected with 400 Bad Request")
        void testUploadReviewMedia_ImageExceeding5Mb_Rejected() {
            byte[] largeImageBytes = new byte[5 * 1024 * 1024 + 1];
            largeImageBytes[0] = (byte) 0xFF;
            largeImageBytes[1] = (byte) 0xD8;
            largeImageBytes[2] = (byte) 0xFF;
            MockMultipartFile file = new MockMultipartFile("file", "huge.jpg", "image/jpeg", largeImageBytes);

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertTrue(response.getBody().get("error").contains("5MB limit"));
        }

        @Test
        @DisplayName("Video exceeding 25MB is rejected with 400 Bad Request")
        void testUploadReviewMedia_VideoExceeding25Mb_Rejected() {
            byte[] largeVideoBytes = new byte[25 * 1024 * 1024 + 1];
            largeVideoBytes[4] = 0x66;
            largeVideoBytes[5] = 0x74;
            largeVideoBytes[6] = 0x79;
            largeVideoBytes[7] = 0x70;
            MockMultipartFile file = new MockMultipartFile("file", "huge.mp4", "video/mp4", largeVideoBytes);

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertTrue(response.getBody().get("error").contains("25MB limit"));
        }

        @Test
        @DisplayName("Unsupported file types (e.g. PDF, SVG, EXE) are rejected with 400 Bad Request")
        void testUploadReviewMedia_UnsupportedType_Rejected() {
            MockMultipartFile pdfFile = new MockMultipartFile("file", "doc.pdf", "application/pdf", "%PDF".getBytes());
            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(pdfFile);
            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertTrue(response.getBody().get("error").contains("Invalid file type"));

            MockMultipartFile svgFile = new MockMultipartFile("file", "vector.svg", "image/svg+xml", "<svg></svg>".getBytes());
            ResponseEntity<Map<String, String>> svgResponse = customerMediaController.uploadReviewMedia(svgFile);
            assertEquals(HttpStatus.BAD_REQUEST, svgResponse.getStatusCode());

            MockMultipartFile exeFile = new MockMultipartFile("file", "malicious.exe", "application/octet-stream", "MZ".getBytes());
            ResponseEntity<Map<String, String>> exeResponse = customerMediaController.uploadReviewMedia(exeFile);
            assertEquals(HttpStatus.BAD_REQUEST, exeResponse.getStatusCode());
        }

        @Test
        @DisplayName("Corrupt or fake media failing magic byte validation is rejected")
        void testUploadReviewMedia_InvalidMagicBytes_Rejected() {
            byte[] fakeBytes = "Plain text pretending to be MP4".getBytes();
            MockMultipartFile file = new MockMultipartFile("file", "fake.mp4", "video/mp4", fakeBytes);

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertTrue(response.getBody().get("error").contains("Magic bytes verification failed"));
        }

        @Test
        @DisplayName("MIME type mismatch with file extension is rejected")
        void testUploadReviewMedia_MimeTypeMismatch_Rejected() {
            byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0};
            MockMultipartFile file = new MockMultipartFile("file", "image.jpg", "text/plain", jpegBytes);

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertTrue(response.getBody().get("error").contains("MIME type does not match"));
        }

        @Test
        @DisplayName("Empty media file is rejected")
        void testUploadReviewMedia_EmptyFile_Rejected() {
            MockMultipartFile file = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

            ResponseEntity<Map<String, String>> response = customerMediaController.uploadReviewMedia(file);

            assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
            assertTrue(response.getBody().get("error").contains("File must not be empty"));
        }
    }

    // =========================================================================
    // 4. MARKETPLACE TOP RATED SIZE PROPAGATION TESTS
    // =========================================================================
    @Nested
    @DisplayName("Marketplace Search Size Parameter Propagation")
    class SearchSizePropagationTests {

        @Test
        @DisplayName("When page is null, searchShops forwards requested size parameter to discoverShops")
        void testSearchShops_PropagatesSize_WhenPageIsNull() {
            when(storefrontService.discoverShops(
                    eq("India"), eq("Maharashtra"), eq("Pune"), eq("Pune"), eq("Shivajinagar"), eq("411005"),
                    isNull(), isNull(), isNull(), isNull(), isNull(), eq(10.0), eq("rating"), eq(4)
            )).thenReturn(Collections.emptyList());

            ResponseEntity<?> response = customerStorefrontController.searchShops(
                    "Maharashtra", "Pune", "Pune", "Shivajinagar", "411005", "India",
                    null, null, null, null, null, 10.0, "rating", null, 4
            );

            assertNotNull(response);
            assertEquals(HttpStatus.OK, response.getStatusCode());
            verify(storefrontService, times(1)).discoverShops(
                    eq("India"), eq("Maharashtra"), eq("Pune"), eq("Pune"), eq("Shivajinagar"), eq("411005"),
                    isNull(), isNull(), isNull(), isNull(), isNull(), eq(10.0), eq("rating"), eq(4)
            );
        }
    }
}
