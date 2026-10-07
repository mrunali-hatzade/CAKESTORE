package com.cakeplatform.api.modules.user.controller;

import com.cakeplatform.api.modules.user.dto.DeleteAccountRequest;
import com.cakeplatform.api.modules.user.service.OwnerAccountDeletionService;
import com.cakeplatform.api.security.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/owner/account")
@PreAuthorize("hasAuthority('ROLE_SHOP_OWNER')")
@RequiredArgsConstructor
@Slf4j
public class OwnerAccountController {

    private final OwnerAccountDeletionService deletionService;

    /**
     * Primary account deletion endpoint.
     * Authenticated owner identity is derived strictly from SecurityContext.
     */
    @PostMapping("/delete")
    public ResponseEntity<?> deleteAccount(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DeleteAccountRequest request) {

        if (userDetails == null || userDetails.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        try {
            deletionService.deleteOwnerAccount(userDetails.getId(), request);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Account and associated bakery data permanently deleted."
            ));
        } catch (AccessDeniedException ade) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ade.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("Unexpected error during owner account deletion for user ID {}: ", userDetails.getId(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "An error occurred while deleting account. Please contact support."));
        }
    }

    /**
     * Conceptual RESTful DELETE mapping supporting both body or direct call.
     */
    @DeleteMapping
    public ResponseEntity<?> deleteAccountRestful(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody(required = false) DeleteAccountRequest request) {

        return deleteAccount(userDetails, request);
    }
}
