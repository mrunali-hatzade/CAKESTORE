package com.cakeplatform.api.modules.email;

public interface EmailService {
    void sendPasswordResetEmail(String to, String resetLink);
}
