package com.cakeplatform.api.modules.notification;

import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/messages")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminMessageController {

    private final BroadcastService broadcastService;

    @PostMapping
    public ResponseEntity<String> sendAdminMessage(@RequestBody AdminMessageRequest request) {
        // Fire and forget: delegates to @Async service
        broadcastService.sendAndRecordBroadcast(request);
        return ResponseEntity.ok("Broadcast dispatched successfully. Processing in background.");
    }
    
    @GetMapping("/history")
    public ResponseEntity<List<BroadcastHistory>> getBroadcastHistory() {
        return ResponseEntity.ok(broadcastService.getHistory());
    }
}
