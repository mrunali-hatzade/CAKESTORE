package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.InvoiceService;
import com.cakeplatform.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CustomerPrivacySecurityTest {

    @Mock
    private CustomerStorefrontService storefrontService;

    @Mock
    private InvoiceService invoiceService;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private CustomerStorefrontController controller;

    private Order mockOrder;

    @BeforeEach
    void setUp() {
        mockOrder = new Order();
        mockOrder.setOrderNumber("ORD-12345");
        mockOrder.setCustomerPhone("9876543210");
    }

    @Test
    void testUnauthenticatedOrderLookup_Returns401() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        ResponseEntity<Order> response = controller.getGuestOrderDetails("ORD-12345");
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void testUnauthenticatedInvoiceLookup_Returns401() throws Exception {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        ResponseEntity<byte[]> response = controller.downloadInvoice("ORD-12345");
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    void testInvalidJwtOrderLookup_Returns401() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        // Simulating invalid JWT by having an empty security context
        ResponseEntity<Order> response = controller.getGuestOrderDetails("ORD-12345");
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    private void setupSecurityContext(String phone, String role) {
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken auth = 
            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                phone, null, java.util.Collections.singletonList(new org.springframework.security.core.authority.SimpleGrantedAuthority(role))
        );
        org.springframework.security.core.context.SecurityContext context = org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        org.springframework.security.core.context.SecurityContextHolder.setContext(context);
    }

    @Test
    void testCustomerAAccessingCustomerBOrder_Returns403() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        setupSecurityContext("1111111111", "ROLE_CUSTOMER");

        ResponseEntity<Order> response = controller.getGuestOrderDetails("ORD-12345");
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode()); // Order belongs to "9876543210"
    }
    
    @Test
    void testCustomerAAccessingCustomerBInvoice_Returns403() throws Exception {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        setupSecurityContext("1111111111", "ROLE_CUSTOMER");

        ResponseEntity<byte[]> response = controller.downloadInvoice("ORD-12345");
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void testCustomerAAccessingOwnOrder_Returns200() {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        setupSecurityContext("9876543210", "ROLE_CUSTOMER");

        ResponseEntity<Order> response = controller.getGuestOrderDetails("ORD-12345");
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(mockOrder, response.getBody());
    }

    @Test
    void testCustomerAAccessingOwnInvoice_Returns200() throws Exception {
        when(storefrontService.getGuestOrder("ORD-12345")).thenReturn(mockOrder);
        setupSecurityContext("9876543210", "ROLE_CUSTOMER");
        when(invoiceService.generateInvoice(mockOrder)).thenReturn(new byte[]{1, 2, 3});

        ResponseEntity<byte[]> response = controller.downloadInvoice("ORD-12345");
        assertEquals(HttpStatus.OK, response.getStatusCode());
    }
}
