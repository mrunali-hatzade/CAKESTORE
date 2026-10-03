package com.cakeplatform.api.modules.notification;

import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastService {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final BroadcastHistoryRepository broadcastHistoryRepository;

    @Async
    @Transactional
    public void sendAndRecordBroadcast(AdminMessageRequest request) {
        log.info("Starting async broadcast: {}", request.getTitle());
        List<User> targets;
        int count = 0;

        if (request.getSpecificOwnerId() != null) {
            User owner = userRepository.findById(request.getSpecificOwnerId()).orElse(null);
            targets = (owner != null) ? List.of(owner) : Collections.emptyList();
        } else {
            targets = userRepository.findByRole(UserRole.SHOP_OWNER);
        }

        for (User owner : targets) {
            try {
                notificationService.createNotification(
                        owner,
                        NotificationType.ADMIN_MESSAGE,
                        request.getTitle(),
                        request.getMessage(),
                        null,
                        request.isSendEmail()
                );
                count++;
            } catch (Exception e) {
                log.error("Failed to send broadcast to user {}: {}", owner.getId(), e.getMessage());
            }
        }

        // Save History
        BroadcastHistory history = BroadcastHistory.builder()
                .title(request.getTitle())
                .message(request.getMessage())
                .targetType(request.getSpecificOwnerId() != null ? "SPECIFIC" : "ALL")
                .targetOwnerId(request.getSpecificOwnerId())
                .recipientCount(count)
                .sentEmail(request.isSendEmail())
                .build();
        
        broadcastHistoryRepository.save(history);
        log.info("Finished async broadcast. Reached {} recipients.", count);
    }
    
    public List<BroadcastHistory> getHistory() {
        return broadcastHistoryRepository.findAllByOrderBySentAtDesc();
    }
}
