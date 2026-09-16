package com.cakeplatform.api.modules.user;

import com.cakeplatform.api.modules.audit.ActivityLoggerService;
import com.cakeplatform.api.modules.interaction.CustomCakeRequest;
import com.cakeplatform.api.modules.interaction.CustomCakeRequestRepository;
import com.cakeplatform.api.modules.interaction.Enquiry;
import com.cakeplatform.api.modules.interaction.EnquiryRepository;
import com.cakeplatform.api.modules.interaction.Feedback;
import com.cakeplatform.api.modules.interaction.FeedbackRepository;
import com.cakeplatform.api.modules.media.StorageService;
import com.cakeplatform.api.modules.notification.NotificationRepository;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.payment.PaymentRepository;
import com.cakeplatform.api.modules.product.Product;
import com.cakeplatform.api.modules.product.ProductCategory;
import com.cakeplatform.api.modules.product.ProductCategoryRepository;
import com.cakeplatform.api.modules.product.ProductRepository;
import com.cakeplatform.api.modules.shop.*;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.user.controller.OwnerAccountController;
import com.cakeplatform.api.modules.user.dto.DeleteAccountRequest;
import com.cakeplatform.api.modules.user.service.OwnerAccountDeletionService;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OwnerAccountDeletionTest {

    @Mock private UserRepository userRepository;
    @Mock private ShopRepository shopRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductCategoryRepository productCategoryRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private ShopDeliverySlotRepository deliverySlotRepository;
    @Mock private CouponRepository couponRepository;
    @Mock private BusinessDocumentRepository businessDocumentRepository;
    @Mock private ShopPayoutDetailsRepository payoutDetailsRepository;
    @Mock private FeedbackRepository feedbackRepository;
    @Mock private EnquiryRepository enquiryRepository;
    @Mock private CustomCakeRequestRepository customCakeRequestRepository;
    @Mock private com.cakeplatform.api.modules.communication.PlatformFeedbackRepository platformFeedbackRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private StorageService storageService;
    @Mock private ActivityLoggerService activityLogger;
    @Mock private PasswordEncoder passwordEncoder;

    private OwnerAccountDeletionService deletionService;
    private OwnerAccountController controller;

    private User testOwner;
    private Shop testShop;
    private CustomUserDetails testUserDetails;

    @BeforeEach
    void setUp() {
        deletionService = new OwnerAccountDeletionService(
                userRepository, shopRepository, productRepository, productCategoryRepository,
                orderRepository, deliverySlotRepository, couponRepository, businessDocumentRepository,
                payoutDetailsRepository, feedbackRepository, enquiryRepository, customCakeRequestRepository,
                platformFeedbackRepository,
                notificationRepository, paymentRepository, subscriptionRepository, storageService,
                activityLogger, passwordEncoder
        );
        controller = new OwnerAccountController(deletionService);

        testOwner = new User();
        testOwner.setId(10L);
        testOwner.setEmail("owner@cakestore.in");
        testOwner.setPasswordHash("$2a$10$hashedPassword");
        testOwner.setRole(UserRole.SHOP_OWNER);
        testOwner.setStatus(UserStatus.ACTIVE);

        testShop = new Shop();
        testShop.setId(100L);
        testShop.setOwner(testOwner);
        testShop.setBusinessName("Artisan Cakes");
        testShop.setLogoUrl("/uploads/logos/logo.png");
        testShop.setCoverImageUrl("/uploads/covers/cover.png");

        testUserDetails = new CustomUserDetails(testOwner);
    }

    // 1. Owner can delete own account successfully
    @Test
    @DisplayName("1. Owner can successfully delete their own account")
    void testOwnerCanDeleteOwnAccountSuccessfully() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches("CorrectPassword123!", testOwner.getPasswordHash())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        DeleteAccountRequest request = new DeleteAccountRequest("CorrectPassword123!", "DELETE MY ACCOUNT");
        assertDoesNotThrow(() -> deletionService.deleteOwnerAccount(10L, request));

        verify(userRepository, times(1)).delete(testOwner);
    }

    // 2. Owner account record is deleted from database
    @Test
    @DisplayName("2. Owner account record is deleted from database")
    void testOwnerAccountIsActuallyRemovedFromDatabase() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));
        verify(userRepository, times(1)).delete(testOwner);
    }

    // 3. Owned bakery is removed
    @Test
    @DisplayName("3. Owned bakery shop is deleted from database")
    void testOwnedBakeryIsRemoved() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));
        verify(shopRepository, times(1)).delete(testShop);
    }

    // 4. Owned products are removed
    @Test
    @DisplayName("4. Owned products are deleted from database")
    void testOwnedProductsAreRemoved() {
        Product product = new Product();
        product.setId(501L);
        product.setShop(testShop);
        product.setImageUrl("/uploads/products/cake.png");

        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(productRepository.findByShopId(100L)).thenReturn(List.of(product));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(productRepository, times(1)).deleteAll(List.of(product));
        verify(storageService, times(1)).deleteFileByUrl("/uploads/products/cake.png");
    }

    // 5. Product categories deleted after products
    @Test
    @DisplayName("5. Product categories deleted after products to satisfy RESTRICT constraint")
    void testCategoriesDeletedAfterProducts() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(productCategoryRepository, times(1)).deleteByShopId(100L);
    }

    // 6. Owned coupons are removed
    @Test
    @DisplayName("6. Owned coupons are deleted")
    void testOwnedCouponsAreRemoved() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));
        verify(couponRepository, times(1)).deleteByShopId(100L);
    }

    // 7. Owned business documents are removed
    @Test
    @DisplayName("7. Owned business documents and physical files are deleted")
    void testOwnedDocumentsAreRemoved() {
        BusinessDocument doc = new BusinessDocument();
        doc.setId(201L);
        doc.setFileUrl("/uploads/documents/fssai.pdf");

        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(businessDocumentRepository.findByShopId(100L)).thenReturn(List.of(doc));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(storageService, times(1)).deleteFileByUrl("/uploads/documents/fssai.pdf");
        verify(businessDocumentRepository, times(1)).deleteByShopId(100L);
    }

    // 8. Owned notifications are removed
    @Test
    @DisplayName("8. Owner-specific notifications are deleted")
    void testOwnedNotificationsAreRemoved() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));
        verify(notificationRepository, times(1)).deleteByRecipientId(10L);
    }

    // 9. Customer interactions (feedback, enquiries, custom cake requests) are removed
    @Test
    @DisplayName("9. Feedback, enquiries, and custom cake requests are deleted")
    void testInteractionsAreRemoved() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(feedbackRepository, times(1)).deleteByShopId(100L);
        verify(enquiryRepository, times(1)).deleteByShopId(100L);
        verify(customCakeRequestRepository, times(1)).deleteByShopId(100L);
    }

    // 10. Customer global accounts remain untouched
    @Test
    @DisplayName("10. Customer global user accounts are not touched during owner deletion")
    void testCustomerGlobalAccountsRemainUntouched() {
        User customerUser = new User();
        customerUser.setId(99L);
        customerUser.setEmail("customer@example.com");
        customerUser.setRole(UserRole.CUSTOMER);

        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(userRepository, never()).delete(customerUser);
        verify(userRepository, times(1)).delete(testOwner);
    }

    // 11. Other owners and bakeries remain untouched (tenant isolation)
    @Test
    @DisplayName("11. Tenant isolation: Other owners and shops remain untouched")
    void testOtherOwnersRemainUntouched() {
        User otherOwner = new User();
        otherOwner.setId(20L);
        otherOwner.setEmail("other@bakery.com");
        otherOwner.setRole(UserRole.SHOP_OWNER);

        Shop otherShop = new Shop();
        otherShop.setId(200L);
        otherShop.setOwner(otherOwner);

        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(userRepository, never()).delete(otherOwner);
        verify(shopRepository, never()).delete(otherShop);
    }

    // 12. Identity derived strictly from security context
    @Test
    @DisplayName("12. Controller derives owner ID strictly from authenticated principal")
    void testControllerDerivesOwnerIdStrictly() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        ResponseEntity<?> response = controller.deleteAccount(
                testUserDetails,
                new DeleteAccountRequest("secret", "DELETE MY ACCOUNT")
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userRepository, times(1)).findById(10L);
    }

    // 13. Customer role cannot access owner deletion
    @Test
    @DisplayName("13. Customer role attempting deletion is rejected with 403 Forbidden")
    void testCustomerCannotAccessOwnerDeletion() {
        User customerUser = new User();
        customerUser.setId(30L);
        customerUser.setRole(UserRole.CUSTOMER);

        when(userRepository.findById(30L)).thenReturn(Optional.of(customerUser));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                deletionService.deleteOwnerAccount(30L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"))
        );
        assertTrue(ex.getMessage().contains("Only shop owners can delete bakery accounts"));
        verify(userRepository, never()).delete(any());
    }

    // 14. Admin role cannot use owner self-delete endpoint
    @Test
    @DisplayName("14. Admin user cannot be deleted via owner endpoint")
    void testAdminCannotUseOwnerSelfDelete() {
        User adminUser = new User();
        adminUser.setId(1L);
        adminUser.setRole(UserRole.ADMIN);

        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                deletionService.deleteOwnerAccount(1L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"))
        );
        assertTrue(ex.getMessage().contains("Admin accounts cannot be deleted through this endpoint"));
        verify(userRepository, never()).delete(any());
    }

    // 15. Wrong password prevents deletion
    @Test
    @DisplayName("15. Wrong password prevents account deletion with 400 Bad Request")
    void testWrongPasswordPreventsDeletion() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches("WrongPassword", testOwner.getPasswordHash())).thenReturn(false);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("WrongPassword", "DELETE MY ACCOUNT"))
        );
        assertEquals("Invalid account password", ex.getMessage());
        verify(userRepository, never()).delete(any());
    }

    // 16. Invalid confirmation text prevents deletion
    @Test
    @DisplayName("16. Invalid confirmation phrase prevents deletion")
    void testInvalidConfirmationTextPreventsDeletion() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches("CorrectPassword", testOwner.getPasswordHash())).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("CorrectPassword", "delete me please"))
        );
        assertTrue(ex.getMessage().contains("Confirmation phrase must be exactly 'DELETE MY ACCOUNT'"));
        verify(userRepository, never()).delete(any());
    }

    // 17. Active customer orders block account deletion
    @Test
    @DisplayName("17. Active customer orders (CONFIRMED/PREPARING/etc.) block account deletion")
    void testActiveCustomerOrdersBlockAccountDeletion() {
        Order activeOrder = new Order();
        activeOrder.setId(901L);
        activeOrder.setShop(testShop);
        activeOrder.setOrderStatus("PREPARING");

        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(activeOrder));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"))
        );
        assertTrue(ex.getMessage().contains("Account cannot be deleted while there are active customer orders"));
        verify(userRepository, never()).delete(any());
    }

    // 18. Completed/cancelled orders do not block deletion and are handled cleanly
    @Test
    @DisplayName("18. Completed and cancelled orders allow deletion and delivery slots are unlinked")
    void testCompletedOrdersDoNotBlockDeletion() {
        ShopDeliverySlot slot = new ShopDeliverySlot();
        slot.setId(701L);

        Order completedOrder = new Order();
        completedOrder.setId(902L);
        completedOrder.setShop(testShop);
        completedOrder.setOrderStatus("COMPLETED");
        completedOrder.setDeliverySlot(slot);

        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(List.of(completedOrder));

        assertDoesNotThrow(() ->
                deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"))
        );

        assertNull(completedOrder.getDeliverySlot());
        verify(orderRepository, times(1)).deleteAll(List.of(completedOrder));
        verify(deliverySlotRepository, times(1)).deleteByShopId(100L);
        verify(userRepository, times(1)).delete(testOwner);
    }

    // 19. Subscriptions and payments are deleted, scheduler cannot process deleted owner
    @Test
    @DisplayName("19. Subscriptions and payments are deleted, preventing scheduler recurrence")
    void testSubscriptionsAndPaymentsDeleted() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(testOwner));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(shopRepository.findByOwnerId(10L)).thenReturn(List.of(testShop));
        when(orderRepository.findByShopIdOrderByCreatedAtDesc(100L)).thenReturn(Collections.emptyList());

        deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"));

        verify(subscriptionRepository, times(1)).deleteByShopId(100L);
        verify(paymentRepository, times(1)).deleteByShopId(100L);
    }

    // 20. Repeated deletion attempt fails safely (user not found)
    @Test
    @DisplayName("20. Repeated deletion attempt fails safely when user is already deleted")
    void testRepeatedDeletionAttemptFailsSafely() {
        when(userRepository.findById(10L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                deletionService.deleteOwnerAccount(10L, new DeleteAccountRequest("secret", "DELETE MY ACCOUNT"))
        );
        assertTrue(ex.getMessage().contains("User not found"));
    }
}
