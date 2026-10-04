package com.cakeplatform.api.modules.payment.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/webhooks")
public class RazorpayWebhookController {

    @PostMapping("/razorpay-v2")
    public ResponseEntity<Void> handleRazorpayWebhook(
            @RequestHeader("X-Razorpay-Signature") String signature,
            @RequestBody String payload) {
        
        System.out.println("Received Razorpay Webhook: " + payload);
        
        // TODO: Inject SubscriptionService or equivalent and verify signature + handle event
        
        return ResponseEntity.ok().build();
    }
}
