package com.cakeplatform.api.modules.location.readiness;

import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class LocationReadinessState {

    private final AtomicBoolean ready = new AtomicBoolean(false);

    public boolean isReady() {
        return ready.get();
    }

    public void setReady(boolean isReady) {
        this.ready.set(isReady);
    }
}
