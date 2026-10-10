package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.order.InvoiceService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.security.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class CustomerStorefrontGuestTrackingTest {

    @Mock
    private CustomerStorefrontService storefrontService;

    @Mock
    private InvoiceService invoiceService;

    @InjectMocks
    private CustomerStorefrontController storefrontController;

    private Order testOrder;

    @BeforeEach
    void setUp() {
        testOrder = new Order();
        testOrder.setOrderNumber("ORD-12345");
        testOrder.setCustomerPhone("+91 9876543210");
        testOrder.setCustomerName("Test User");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setupAuthentication(String userPhone) {
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        
        User mockUser = new User();
        mockUser.setMobile(userPhone);
        CustomUserDetails userDetails = new CustomUserDetails(mockUser);
        
        when(context.getAuthentication()).thenReturn(auth);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn(userDetails);
        
        SecurityContextHolder.setContext(context);
    }
    
    private void setupAnonymousAuthentication() {
        SecurityContext context = mock(SecurityContext.class);
        Authentication auth = mock(Authentication.class);
        
        when(context.getAuthentication()).thenReturn(auth);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn("anonymousUser");
        
        SecurityContextHolder.setContext(context);
    }

    private void setupNoAuthentication() {
        SecurityContext context = mock(SecurityContext.class);
        when(context.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(context);
    }

    @Test
    @DisplayName("1. Authenticated customer accessing their own order succeeds")
    void testAuthenticatedUser_OwnOrder_Success() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(testOrder);
        setupAuthentication("9876543210");

        ResponseEntity<Order> response = storefrontController.getGuestOrderDetails("ORD-12345", null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testOrder, response.getBody());
    }

    @Test
    @DisplayName("2. Authenticated customer accessing another customer's order is denied")
    void testAuthenticatedUser_OtherOrder_Forbidden() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(testOrder);
        setupAuthentication("9999999999"); // Different phone

        ResponseEntity<Order> response = storefrontController.getGuestOrderDetails("ORD-12345", null);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    @DisplayName("3. Unauthenticated guest with valid verification can access their own order")
    void testUnauthenticatedGuest_CorrectPhone_Success() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(testOrder);
        setupAnonymousAuthentication();

        ResponseEntity<Order> response = storefrontController.getGuestOrderDetails("ORD-12345", "9876543210");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(testOrder, response.getBody());
    }

    @Test
    @DisplayName("4. Incorrect guest verification is denied and masked as NOT_FOUND")
    void testUnauthenticatedGuest_WrongPhone_Forbidden() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(testOrder);
        setupNoAuthentication();

        ResponseEntity<Order> response = storefrontController.getGuestOrderDetails("ORD-12345", "9999999999");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("4b. Nonexistent order with verification is masked as NOT_FOUND")
    void testUnauthenticatedGuest_NonexistentOrder_NotFound() {
        when(storefrontService.getGuestOrder("ORD-99999")).thenThrow(new RuntimeException("Order not found or invalid order number"));
        setupNoAuthentication();

        ResponseEntity<Order> response = storefrontController.getGuestOrderDetails("ORD-99999", "9876543210");

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    @DisplayName("4c. Unexpected exceptions are not swallowed into 404")
    void testUnauthenticatedGuest_DatabaseException_Throws() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenThrow(new RuntimeException("Database connection failed"));
        setupNoAuthentication();

        org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () -> {
            storefrontController.getGuestOrderDetails("ORD-12345", "9876543210");
        });
    }

    @Test
    @DisplayName("5. Missing guest verification is denied before lookup")
    void testUnauthenticatedGuest_NoPhone_Unauthorized() {
        setupNoAuthentication();

        ResponseEntity<Order> response = storefrontController.getGuestOrderDetails("ORD-12345", null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("6. Guest invoice access follows the same authorization requirements")
    void testUnauthenticatedGuestInvoice_CorrectPhone_Success() throws Exception {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(testOrder);
        when(invoiceService.generateInvoice(testOrder)).thenReturn(new byte[]{1, 2, 3});
        setupAnonymousAuthentication();

        ResponseEntity<byte[]> response = storefrontController.downloadInvoice("ORD-12345", "9876543210");

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(3, response.getBody().length);
    }
}
