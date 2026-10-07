package com.cakeplatform.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.ServletException;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class OtpRateLimitSecurityTest {

    private RateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter();
    }

    @Test
    void testOtpRequestRateLimiting() throws IOException, ServletException {
        // Send 10 requests to /api/customer/storefront/tracking/request-otp (Should pass)
        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/customer/storefront/tracking/request-otp");
            request.setRemoteAddr("192.168.1.100");
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            
            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus()); // MockFilterChain doesn't set status, but it stays 200 (OK) default
        }

        // The 11th request should be blocked
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/customer/storefront/tracking/request-otp");
        blockedRequest.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, blockedChain);
        assertEquals(429, blockedResponse.getStatus());
    }

    @Test
    void testDifferentIpCanRequestOtp() throws IOException, ServletException {
        // Exhaust IP 1
        for (int i = 0; i < 11; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/customer/storefront/tracking/request-otp");
            request.setRemoteAddr("192.168.1.101");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
        }

        // IP 2 should still be able to request
        MockHttpServletRequest request2 = new MockHttpServletRequest("POST", "/api/customer/storefront/tracking/request-otp");
        request2.setRemoteAddr("192.168.1.102");
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        filter.doFilter(request2, response2, new MockFilterChain());
        
        assertEquals(200, response2.getStatus());
    }
}
