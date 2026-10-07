package com.cakeplatform.api.modules.communication.controller;

import com.cakeplatform.api.modules.communication.PlatformFeedback;
import com.cakeplatform.api.modules.communication.PlatformFeedbackService;
import com.cakeplatform.api.modules.communication.dto.CreatePlatformFeedbackRequest;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/owner/feedback")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
@Slf4j
public class OwnerFeedbackController {

    private final PlatformFeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> submitFeedback(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreatePlatformFeedbackRequest request) {

        log.info("Owner ID {} submitting platform feedback", userDetails.getId());
        PlatformFeedback feedback = feedbackService.submitFeedback(userDetails.getId(), request);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Platform feedback submitted successfully",
                "id", feedback.getId()
        ));
    }
}
