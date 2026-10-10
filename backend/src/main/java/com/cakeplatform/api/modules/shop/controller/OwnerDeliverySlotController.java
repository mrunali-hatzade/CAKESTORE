package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliverySlot;
import com.cakeplatform.api.modules.shop.ShopDeliverySlotRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.dto.DeliverySlotRequest;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/owner/delivery-slots")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
public class OwnerDeliverySlotController {

    private final ShopDeliverySlotRepository deliverySlotRepository;
    private final ShopAccessValidator shopAccessValidator;
    private final com.cakeplatform.api.modules.order.OrderRepository orderRepository;

    @GetMapping
    public ResponseEntity<List<ShopDeliverySlot>> getSlots(@AuthenticationPrincipal CustomUserDetails userDetails) {
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        // Return ALL slots for owner management, not just active ones
        return ResponseEntity.ok(deliverySlotRepository.findByShopId(shop.getId()));
    }

    @PostMapping
    public ResponseEntity<ShopDeliverySlot> createSlot(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DeliverySlotRequest request) {
            
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        
        if (request.getStartTime() != null && request.getEndTime() != null && !request.getStartTime().isBefore(request.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
        }
        
        ShopDeliverySlot slot = new ShopDeliverySlot();
        slot.setShop(shop);
        slot.setDayOfWeek(request.getDayOfWeek() != null ? request.getDayOfWeek().trim().toUpperCase() : null);
        slot.setStartTime(request.getStartTime());
        slot.setEndTime(request.getEndTime());
        slot.setMaxOrders(request.getMaxOrders() != null ? request.getMaxOrders() : 10);
        slot.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        
        validateOverlap(shop, slot);
        
        return ResponseEntity.ok(deliverySlotRepository.save(slot));
    }
    
    private void validateOverlap(Shop shop, ShopDeliverySlot slot) {
        List<ShopDeliverySlot> existingSlots = deliverySlotRepository.findByShopId(shop.getId());
        for (ShopDeliverySlot existing : existingSlots) {
            if (existing.getId() != null && existing.getId().equals(slot.getId())) continue;
            if (existing.getDayOfWeek().equals(slot.getDayOfWeek())) {
                if (slot.getStartTime().isBefore(existing.getEndTime()) && 
                    slot.getEndTime().isAfter(existing.getStartTime())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                        "Slot overlaps with existing slot: " + existing.getStartTime() + " - " + existing.getEndTime());
                }
            }
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ShopDeliverySlot> updateSlot(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody DeliverySlotRequest request) {
            
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        ShopDeliverySlot slot = deliverySlotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));
                
        if (!slot.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        if (request.getStartTime() != null && request.getEndTime() != null && !request.getStartTime().isBefore(request.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time");
        }
        
                slot.setDayOfWeek(request.getDayOfWeek() != null ? request.getDayOfWeek().trim().toUpperCase() : null);
        slot.setStartTime(request.getStartTime());
        slot.setEndTime(request.getEndTime());

        if (request.getMaxOrders() != null) {
            int newMax = request.getMaxOrders();
            if (newMax <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Capacity must be greater than zero");
            }
            int maxActive = orderRepository.findMaxActiveOrdersOnAnyUpcomingDate(slot.getId());
            if (newMax < maxActive) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Capacity cannot be lower than the number of active orders already assigned to this slot (" + maxActive + ").");
            }
            slot.setMaxOrders(newMax);
        }
        
        if (request.getIsActive() != null) {
            slot.setIsActive(request.getIsActive());
        }
        
        validateOverlap(shop, slot);
        
        return ResponseEntity.ok(deliverySlotRepository.save(slot));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ShopDeliverySlot> updateStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> statusUpdate) {
            
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        ShopDeliverySlot slot = deliverySlotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));
                
        if (!slot.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        if (statusUpdate.containsKey("isActive")) {
            slot.setIsActive(statusUpdate.get("isActive"));
            return ResponseEntity.ok(deliverySlotRepository.save(slot));
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing isActive field");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSlot(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id) {
            
        Shop shop = shopAccessValidator.getValidShopForOwner(userDetails.getId());
        ShopDeliverySlot slot = deliverySlotRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Slot not found"));
                
        if (!slot.getShop().getId().equals(shop.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        
        try {
            deliverySlotRepository.delete(slot);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException e) {
            // Cannot hard delete if there are existing orders attached to this slot
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete slot because it is linked to existing orders. Please deactivate it instead.");
        }
    }
}
