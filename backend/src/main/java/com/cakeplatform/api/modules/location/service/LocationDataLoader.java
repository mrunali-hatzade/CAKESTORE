package com.cakeplatform.api.modules.location.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class LocationDataLoader implements ApplicationRunner {

    private final LocationDataReconciliationEngine reconciliationEngine;

    @Value("${cakeplatform.locations.seed.enabled:true}")
    private boolean seedEnabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!seedEnabled) {
            log.info("Location data seeding/reconciliation is disabled via configuration (cakeplatform.locations.seed.enabled=false).");
            return;
        }

        try {
            reconciliationEngine.reconcile();
        } catch (Exception e) {
            log.error("Error during startup location dataset reconciliation: {}", e.getMessage(), e);
        }
    }
}
