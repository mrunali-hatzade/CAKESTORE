package com.cakeplatform.api.modules.shop.controller;

import com.cakeplatform.api.modules.media.StorageService;
import com.cakeplatform.api.modules.shop.BusinessDocument;
import com.cakeplatform.api.modules.shop.BusinessDocumentRepository;
import com.cakeplatform.api.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DocumentAccessController {

    private final BusinessDocumentRepository businessDocumentRepository;
    private final StorageService storageService;

    @GetMapping("/admin/documents/{id}/view")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> viewDocumentAdmin(@PathVariable Long id) {
        return handleDocumentView(id, null, true);
    }

    @GetMapping("/owner/documents/{id}/view")
    @PreAuthorize("hasRole('SHOP_OWNER')")
    public ResponseEntity<Void> viewDocumentOwner(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails userDetails) {
        return handleDocumentView(id, userDetails.getId(), false);
    }

    private ResponseEntity<Void> handleDocumentView(Long docId, Long ownerId, boolean isAdmin) {
        BusinessDocument doc = businessDocumentRepository.findById(docId).orElse(null);
        if (doc == null) {
            return ResponseEntity.notFound().build();
        }

        // Tenant isolation check
        if (!isAdmin && (doc.getShop() == null || !doc.getShop().getOwner().getId().equals(ownerId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String signedUrl = storageService.generateSignedUrl(doc.getFileUrl());
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(signedUrl))
                .build();
    }
}
