package com.cakeplatform.api.modules.subscription.controller;

import com.cakeplatform.api.modules.subscription.SubscriptionPlanRepository;
import com.cakeplatform.api.modules.subscription.dto.SubscriptionPlanResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/subscription-plans")
@RequiredArgsConstructor
public class PublicSubscriptionPlanController {

    private final SubscriptionPlanRepository subscriptionPlanRepository;

    @GetMapping
    public ResponseEntity<List<SubscriptionPlanResponse>> getActivePlans() {
        List<SubscriptionPlanResponse> plans = subscriptionPlanRepository.findByIsActiveTrue()
                .stream()
                .map(SubscriptionPlanResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(plans);
    }
}
