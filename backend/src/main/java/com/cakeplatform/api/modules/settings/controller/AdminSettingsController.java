package com.cakeplatform.api.modules.settings.controller;

import com.cakeplatform.api.modules.settings.GlobalSettings;
import com.cakeplatform.api.modules.settings.GlobalSettingsService;
import com.cakeplatform.api.modules.settings.dto.GlobalSettingsDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final GlobalSettingsService service;

    @GetMapping
    public ResponseEntity<GlobalSettings> getSettings() {
        return ResponseEntity.ok(service.getSettings());
    }

    @PutMapping
    public ResponseEntity<GlobalSettings> updateSettings(@RequestBody GlobalSettingsDTO dto) {
        return ResponseEntity.ok(service.updateSettings(dto));
    }
}
