package com.cakeplatform.api.modules.email;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dev/emails")
@Profile({"dev", "test", "local"})
public class DevEmailController {

    private final DevEmailSink devEmailSink;

    public DevEmailController(DevEmailSink devEmailSink) {
        this.devEmailSink = devEmailSink;
    }

    @GetMapping
    public List<String> getEmails(@RequestParam String to) {
        return devEmailSink.getEmailsFor(to);
    }
}
