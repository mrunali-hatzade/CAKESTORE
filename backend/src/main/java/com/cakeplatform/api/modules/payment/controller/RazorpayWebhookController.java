package com.cakeplatform.api.modules.payment.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks")
public class RazorpayWebhookController {

    @PostMapping("/razorpay-v2")
    public ResponseEntity<Void> handleRazorpayWebhook(
            @RequestHeader("X-Razorpay-Signature") String signature,
            @RequestBody String payload) {

        // This legacy v2 endpoint never verified signatures or processed events.
        // Reject it explicitly so callers cannot mistake an accepted request for a
        // successfully processed payment webhook. The validated implementation is
        // exposed by WebhookController.
        return ResponseEntity.status(HttpStatus.GONE).build();
    }
}
