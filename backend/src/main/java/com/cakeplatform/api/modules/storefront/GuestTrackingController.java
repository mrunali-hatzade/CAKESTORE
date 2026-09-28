package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.auth.service.GuestOtpService;
import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.security.JwtService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer/storefront/tracking")
@RequiredArgsConstructor
public class GuestTrackingController {

    private final GuestOtpService otpService;
    private final JwtService jwtService;
    private final OrderRepository orderRepository;

    @PostMapping("/request-otp")
    public ResponseEntity<Void> requestOtp(@RequestBody PhoneRequest request) {
        if (request.getPhone() == null || request.getPhone().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        otpService.requestOtp(request.getPhone());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<TokenResponse> verifyOtp(@RequestBody VerifyOtpRequest request) {
        if (request.getPhone() == null || request.getOtp() == null) {
            return ResponseEntity.badRequest().build();
        }
        String token = otpService.verifyOtp(request.getPhone(), request.getOtp());
        return ResponseEntity.ok(new TokenResponse(token));
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<Order>> getMyOrders(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String token = extractToken(authHeader);
        if (token == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String phone = jwtService.extractGuestPhone(token);
        if (phone == null || !jwtService.isGuestTokenValid(token, phone)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Page<Order> orders = orderRepository.findVisibleOrdersByCustomerPhone(phone, PageRequest.of(page, size));
        return ResponseEntity.ok(orders);
    }

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    @Data
    public static class PhoneRequest {
        private String phone;
    }

    @Data
    public static class VerifyOtpRequest {
        private String phone;
        private String otp;
    }

    @Data
    public static class TokenResponse {
        private final String token;
    }
}
