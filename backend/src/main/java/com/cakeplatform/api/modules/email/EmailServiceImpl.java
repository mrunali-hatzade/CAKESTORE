package com.cakeplatform.api.modules.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final DevEmailSink devEmailSink;

    @Value("${MAIL_FROM_ADDRESS:noreply@cakeplatform.com}")
    private String fromEmail;

    public EmailServiceImpl(
            @Autowired(required = false) JavaMailSender mailSender,
            @Autowired(required = false) DevEmailSink devEmailSink) {
        this.mailSender = mailSender;
        this.devEmailSink = devEmailSink;
    }

    @Override
    public void sendPasswordResetEmail(String to, String resetLink) {
        String body = "To reset your password, please click the following link:\n\n" +
                      resetLink + "\n\nIf you did not request this, please ignore this email.";

        if (devEmailSink != null) {
            devEmailSink.capture(to, body);
            // In dev/test, we might not have a mailSender configured, but we captured it.
        }

        if (mailSender == null) {
            // DO NOT log the raw resetLink here for security reasons.
            log.warn("JavaMailSender bean not found. Email to {} was not sent via SMTP.", to);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Password Reset Request");
            message.setText(body);

            mailSender.send(message);
            log.info("Password reset email sent to {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}", to, e);
        }
    }
}
