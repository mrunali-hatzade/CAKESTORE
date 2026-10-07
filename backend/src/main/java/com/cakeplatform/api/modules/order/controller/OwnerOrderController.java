package com.cakeplatform.api.modules.order.controller;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.service.OrderService;
import com.cakeplatform.api.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/orders")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerOrderController {

    private final OrderService orderService;
    private final com.cakeplatform.api.modules.order.InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<Order>> getOrders(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String search) {
        
        if (size > 100) size = 100;
        if (size < 1) size = 20;
        if (page < 0) page = 0;
        
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return ResponseEntity.ok(orderService.getPaginatedOrdersByUserId(userDetails.getId(), status, paymentStatus, search, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(orderService.getOrderDetails(userDetails.getId(), id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> payload) {
        
        String newStatus = payload.get("status");
        Order updated = orderService.updateOrderStatus(userDetails.getId(), id, newStatus);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/payment-status")
    public ResponseEntity<Order> updatePaymentStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) Map<String, String> payload) {
        
        String newStatus = payload != null && payload.get("paymentStatus") != null ? payload.get("paymentStatus") : "PAID";
        String paymentNote = payload != null ? payload.get("paymentNote") : null;
        Order updated = orderService.updatePaymentStatus(userDetails.getId(), id, newStatus, paymentNote);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws Exception {
            
        Order order = orderService.getOrderDetails(userDetails.getId(), id);
        byte[] pdfBytes = invoiceService.generateInvoice(order);
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "invoice-" + order.getOrderNumber() + ".pdf");
        
        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
    }
}
