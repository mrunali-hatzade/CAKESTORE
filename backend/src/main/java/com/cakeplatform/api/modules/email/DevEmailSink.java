package com.cakeplatform.api.modules.email;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Controlled in-memory email capture for local development and testing.
 * Strictly disabled in production via profile.
 */
@Component
@Profile({"dev", "test", "local"})
public class DevEmailSink {

    private final Map<String, List<String>> emailsByRecipient = new ConcurrentHashMap<>();

    public void capture(String to, String content) {
        emailsByRecipient.computeIfAbsent(to, k -> Collections.synchronizedList(new ArrayList<>())).add(content);
    }

    public List<String> getEmailsFor(String to) {
        return emailsByRecipient.getOrDefault(to, Collections.emptyList());
    }

    public void clear() {
        emailsByRecipient.clear();
    }
}
