package com.cakeplatform.api.modules.settings.migration;

import com.cakeplatform.api.modules.settings.EncryptionConverter;
import com.cakeplatform.api.modules.settings.GlobalSettings;
import com.cakeplatform.api.modules.settings.GlobalSettingsRepository;
import com.cakeplatform.api.modules.settings.migration.GlobalSettingsEncryptionMigrationUtility.MigrationResult;
import com.cakeplatform.api.modules.settings.migration.GlobalSettingsEncryptionMigrationUtility.Status;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link GlobalSettingsEncryptionMigrationUtility} covering the required scenarios.
 *
 * The tests use a mocked {@link GlobalSettingsRepository} to avoid any real DB access.
 * EncryptionConverter is used directly – the old fallback key is 16 spaces, the new key is
 * a deterministic 16‑character string.
 */
class GlobalSettingsEncryptionMigrationUtilityTest {

    private GlobalSettingsRepository repo;
    private GlobalSettingsEncryptionMigrationUtility util;

    private GlobalSettingsEncryptionMigrationUtility.StandaloneConverter oldConverter;
    private GlobalSettingsEncryptionMigrationUtility.StandaloneConverter newConverter;

    private static final String OLD_KEY = "                "; // 16 spaces
    private static final String NEW_KEY = "1234567890abcdef"; // 16 bytes

    @BeforeEach
    void setUp() {
        repo = mock(GlobalSettingsRepository.class);
        util = new GlobalSettingsEncryptionMigrationUtility(repo);
        oldConverter = new GlobalSettingsEncryptionMigrationUtility.StandaloneConverter(OLD_KEY);
        newConverter = new GlobalSettingsEncryptionMigrationUtility.StandaloneConverter(NEW_KEY);
    }

    private GlobalSettings createSettings(String keySecret, String webhookSecret) {
        GlobalSettings gs = new GlobalSettings();
        gs.setRazorpayKeySecret(keySecret);
        gs.setRazorpayWebhookSecret(webhookSecret);
        return gs;
    }

    @Test
    void testOldKeyEncryptedValueMigratesSuccessfully() {
        String plain = "s3crEt";
        String oldEnc = oldConverter.convertToDatabaseColumn(plain);
        GlobalSettings gs = createSettings(oldEnc, null);
        when(repo.findAll()).thenReturn(Collections.singletonList(gs));

        MigrationResult result = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        assertTrue(result.canMigrate);
        assertEquals(2, result.fields.size()); // key secret + webhook secret (null)
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_key_secret") && f.status == Status.ENC_NEEDS_MIGRATION));
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_webhook_secret") && f.status == Status.NULL));

        util.performMigration(Collections.singletonList(gs), result, oldConverter, newConverter);
        ArgumentCaptor<List<GlobalSettings>> captor = ArgumentCaptor.forClass(List.class);
        verify(repo).saveAll(captor.capture());
        GlobalSettings saved = captor.getValue().get(0);
        assertNotNull(saved.getRazorpayKeySecret());
        assertTrue(saved.getRazorpayKeySecret().startsWith("ENC:"));
        assertEquals(plain, newConverter.convertToEntityAttribute(saved.getRazorpayKeySecret()));
    }

    @Test
    void testAlreadyNewKeyEncryptedValueIsSkipped() {
        String plain = "alreadyNew";
        String newEnc = newConverter.convertToDatabaseColumn(plain);
        GlobalSettings gs = createSettings(newEnc, null);
        when(repo.findAll()).thenReturn(Collections.singletonList(gs));
        MigrationResult result = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        assertTrue(result.canMigrate);
        assertEquals(2, result.fields.size());
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_key_secret") && f.status == Status.ENC_ALREADY_MIGRATED));
        util.performMigration(Collections.singletonList(gs), result, oldConverter, newConverter);
        verify(repo).saveAll(Collections.singletonList(gs));
        assertEquals(newEnc, gs.getRazorpayKeySecret());
    }

    @Test
    void testNullAndBlankValuesAreSkipped() {
        GlobalSettings gs = createSettings(null, "   ");
        when(repo.findAll()).thenReturn(Collections.singletonList(gs));
        MigrationResult result = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        assertTrue(result.canMigrate);
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_key_secret") && f.status == Status.NULL));
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_webhook_secret") && f.status == Status.BLANK));
        util.performMigration(Collections.singletonList(gs), result, oldConverter, newConverter);
        verify(repo).saveAll(Collections.singletonList(gs));
    }

    @Test
    void testPlaintextValueIsFlaggedAndNotMigrated() {
        GlobalSettings gs = createSettings("plainSecret", null);
        when(repo.findAll()).thenReturn(Collections.singletonList(gs));
        MigrationResult result = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        assertTrue(result.canMigrate);
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_key_secret") && f.status == Status.PLAINTEXT));
        util.performMigration(Collections.singletonList(gs), result, oldConverter, newConverter);
        verify(repo).saveAll(Collections.singletonList(gs));
    }

    @Test
    void testMalformedEncValueCausesFailureAndRollback() {
        GlobalSettings gs = createSettings("ENC:@@@notbase64@@@", null);
        when(repo.findAll()).thenReturn(Collections.singletonList(gs));
        MigrationResult result = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        assertFalse(result.canMigrate);
        assertTrue(result.fields.stream().anyMatch(f -> f.fieldName.equals("razorpay_key_secret") && f.status == Status.MIGRATION_FAILED));
        verify(repo, never()).saveAll(any());
    }


    @Test
    void testIdempotentRunDoesNotReencrypt() {
        String plain = "secret";
        String oldEnc = oldConverter.convertToDatabaseColumn(plain);
        GlobalSettings gs = createSettings(oldEnc, oldEnc);
        when(repo.findAll()).thenReturn(Collections.singletonList(gs));
        MigrationResult first = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        util.performMigration(Collections.singletonList(gs), first, oldConverter, newConverter);
        String newEnc = gs.getRazorpayKeySecret();
        assertTrue(newEnc.startsWith("ENC:"));
        MigrationResult second = util.evaluate(Collections.singletonList(gs), oldConverter, newConverter);
        assertTrue(second.canMigrate);
        assertTrue(second.fields.stream().allMatch(f -> f.status == Status.ENC_ALREADY_MIGRATED));
    }
}
