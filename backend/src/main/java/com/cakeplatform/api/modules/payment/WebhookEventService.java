package com.cakeplatform.api.modules.payment;

import com.cakeplatform.api.modules.payment.WebhookEvent;
import com.cakeplatform.api.modules.payment.WebhookEventRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
@Service
public class WebhookEventService {
    private static final Logger log = LoggerFactory.getLogger(WebhookEventService.class);
    private final WebhookEventRepository webhookEventRepository;

    /**
     * Attempts to insert a webhook event record. Returns true if the event was newly inserted,
     * or false if it already existed (duplicate). The insertion runs in a REQUIRES_NEW
     * transaction so that a duplicate constraint violation does not mark the outer caller's
     * transaction as rollback‑only.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean recordEventIfNotExists(String eventId, String eventType) {
        if (webhookEventRepository.existsByEventId(eventId)) {
            log.info("Webhook idempotency: Event {} already processed (pre‑check).", eventId);
            return false;
        }
        try {
            WebhookEvent ev = new WebhookEvent();
            ev.setEventId(eventId);
            ev.setEventType(eventType);
            webhookEventRepository.saveAndFlush(ev);
            return true;
        } catch (DataIntegrityViolationException ex) {
            // Duplicate inserted by a concurrent race; treat as duplicate.
            log.info("Webhook idempotency: Event {} already processed (race).", eventId);
            return false;
        }
    }
}
