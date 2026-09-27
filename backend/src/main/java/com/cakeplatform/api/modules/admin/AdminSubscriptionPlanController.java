package com.cakeplatform.api.modules.admin;

import com.cakeplatform.api.modules.subscription.SubscriptionPlan;
import com.cakeplatform.api.modules.subscription.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/plans")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminSubscriptionPlanController {

    private final SubscriptionPlanRepository planRepository;

    @GetMapping
    public ResponseEntity<List<SubscriptionPlan>> getAllPlans() {
        return ResponseEntity.ok(planRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<SubscriptionPlan> createPlan(@RequestBody SubscriptionPlan plan) {
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SubscriptionPlan> updatePlan(@PathVariable Long id, @RequestBody SubscriptionPlan planUpdates) {
        SubscriptionPlan plan = planRepository.findById(id).orElseThrow();
        
        if (planUpdates.getName() != null) plan.setName(planUpdates.getName());
        if (planUpdates.getDescription() != null) plan.setDescription(planUpdates.getDescription());
        if (planUpdates.getBillingCycle() != null) plan.setBillingCycle(planUpdates.getBillingCycle());
        if (planUpdates.getPrice() != null) plan.setPrice(planUpdates.getPrice());
        if (planUpdates.getCurrency() != null) plan.setCurrency(planUpdates.getCurrency());
        if (planUpdates.getDurationDays() != null) plan.setDurationDays(planUpdates.getDurationDays());
        if (planUpdates.getFeatures() != null) plan.setFeatures(planUpdates.getFeatures());
        
        return ResponseEntity.ok(planRepository.save(plan));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<SubscriptionPlan> togglePlanStatus(@PathVariable Long id, @RequestParam Boolean isActive) {
        SubscriptionPlan plan = planRepository.findById(id).orElseThrow();
        plan.setIsActive(isActive);
        return ResponseEntity.ok(planRepository.save(plan));
    }
}
