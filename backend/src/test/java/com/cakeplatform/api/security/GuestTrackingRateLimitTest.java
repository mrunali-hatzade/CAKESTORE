package com.cakeplatform.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.ServletException;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class GuestTrackingRateLimitTest {

    private RateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter();
    }

    @Test
    void testGuestOrderTrackingRateLimiting_Tier2() throws IOException, ServletException {
        // Send 20 requests to /api/storefront/shops/orders/ORD-12345 (Should pass)
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/storefront/shops/orders/ORD-12345");
            request.setRemoteAddr("192.168.10.10");
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            
            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus()); // Default is 200 for MockResponse
        }

        // The 21st request should be blocked
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("GET", "/api/storefront/shops/orders/ORD-12345");
        blockedRequest.setRemoteAddr("192.168.10.10");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, blockedChain);
        assertEquals(429, blockedResponse.getStatus());
    }

    @Test
    void testGuestInvoiceDownloadRateLimiting_Tier2() throws IOException, ServletException {
        // Send 20 requests to /api/storefront/shops/orders/ORD-54321/invoice (Should pass)
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/storefront/shops/orders/ORD-54321/invoice");
            request.setRemoteAddr("192.168.10.11");
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            
            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus());
        }

        // The 21st request should be blocked
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("GET", "/api/storefront/shops/orders/ORD-54321/invoice");
        blockedRequest.setRemoteAddr("192.168.10.11");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, blockedChain);
        assertEquals(429, blockedResponse.getStatus());
    }

    @Test
    void testUnrelatedStorefrontBrowsing_Tier3() throws IOException, ServletException {
        // Storefront browsing should allow up to 120 requests
        for (int i = 0; i < 120; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/storefront/shops/1/products");
            request.setRemoteAddr("192.168.10.12");
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            
            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus());
        }

        // The 121st request should be blocked
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("GET", "/api/storefront/shops/1/products");
        blockedRequest.setRemoteAddr("192.168.10.12");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, blockedChain);
        assertEquals(429, blockedResponse.getStatus());
    }

    @Test
    void testSpoofedXForwardedForCannotBypassRateLimit() throws IOException, ServletException {
        // Send 20 requests with different X-Forwarded-For headers from the same remote IP
        for (int i = 0; i < 20; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/storefront/shops/orders/ORD-XFF");
            request.setRemoteAddr("10.0.0.5");
            request.addHeader("X-Forwarded-For", "203.0.113." + i); // Attempting to spoof
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            
            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus());
        }

        // The 21st request from the same remote IP should be blocked, regardless of the spoofed header
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("GET", "/api/storefront/shops/orders/ORD-XFF");
        blockedRequest.setRemoteAddr("10.0.0.5");
        blockedRequest.addHeader("X-Forwarded-For", "203.0.113.99");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, blockedChain);
        assertEquals(429, blockedResponse.getStatus());
    }
}
