package com.cakeplatform.api.modules.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MessageResponse {
    private Long id;
    private Long senderId;
    private String senderRole;
    private String text;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
