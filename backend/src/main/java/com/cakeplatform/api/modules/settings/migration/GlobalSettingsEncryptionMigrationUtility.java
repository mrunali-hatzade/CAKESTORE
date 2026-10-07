package com.cakeplatform.api.modules.settings.migration;


import com.cakeplatform.api.modules.settings.GlobalSettings;
import com.cakeplatform.api.modules.settings.GlobalSettingsRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Isolated one‑off utility to migrate the encrypted Razorpay secrets in {@code global_settings}
 * from the insecure 16‑space fallback key to the production {@code APP_ENCRYPTION_SECRET}.
 *
 * <p>Usage (from the project root):
 * <pre>
 *   java -jar backend/target/cake-platform-api.jar \
 *       --spring.main.web-application-type=none \
 *       com.cakeplatform.api.modules.settings.migration.GlobalSettingsEncryptionMigrationUtility \
 *       --dry-run            # show what would happen, no DB writes
 *       --confirm            # required to actually write changes
 * </pre>
 *
 * <p>The utility never logs secrets or keys. All operations are performed in a single
 * transaction; any failure causes a full rollback.
 */
@SpringBootApplication(scanBasePackages = "com.cakeplatform.api")
@EntityScan("com.cakeplatform.api")
@EnableJpaRepositories("com.cakeplatform.api")
public class GlobalSettingsEncryptionMigrationUtility implements CommandLineRunner {

    private final GlobalSettingsRepository repository;

    public GlobalSettingsEncryptionMigrationUtility(GlobalSettingsRepository repository) {
        this.repository = repository;
    }

    public static void main(String[] args) {
        System.setProperty("migration.utility.active", "true");
        SpringApplication.run(GlobalSettingsEncryptionMigrationUtility.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        if (!"true".equals(System.getProperty("migration.utility.active"))) {
            return;
        }
        
        boolean dryRun = false;
        boolean confirm = false;
        for (String arg : args) {
            if ("--dry-run".equals(arg)) {
                dryRun = true;
            } else if ("--confirm".equals(arg)) {
                confirm = true;
            }
        }

        String newKeyEnv = System.getenv("APP_ENCRYPTION_SECRET");
        if (!StringUtils.hasText(newKeyEnv)) {
            System.err.println("ERROR: APP_ENCRYPTION_SECRET environment variable is missing or empty.");
            System.exit(1);
        }
        if (newKeyEnv.getBytes(java.nio.charset.StandardCharsets.UTF_8).length != 16) {
            System.err.println("ERROR: APP_ENCRYPTION_SECRET must be exactly 16 bytes for AES‑128.");
            System.exit(1);
        }

        // Prepare converters
        StandaloneConverter oldConverter = new StandaloneConverter("                "); // 16 spaces
        StandaloneConverter newConverter = new StandaloneConverter(newKeyEnv);

        List<GlobalSettings> settingsList = repository.findAll();
        if (settingsList.isEmpty()) {
            System.out.println("No GlobalSettings rows found – nothing to migrate.");
            return;
        }

        MigrationResult result = evaluate(settingsList, oldConverter, newConverter);
        result.printReport(dryRun);

        if (dryRun) {
            System.out.println("Dry‑run complete – no database modifications performed.");
            return;
        }

        if (!confirm) {
            System.out.println("Write mode requires explicit '--confirm' flag. Aborting.");
            return;
        }

        if (!result.canMigrate) {
            System.out.println("Migration aborted due to previous errors. No changes applied.");
            return;
        }

        // Perform actual migration inside a transaction
        try {
            performMigration(settingsList, result, oldConverter, newConverter);
            System.out.println("Migration completed successfully.");
        } catch (DataAccessException e) {
            System.err.println("ERROR: Database error during migration – transaction rolled back.");
            e.printStackTrace();
            System.exit(1);
        }
    }

    static class FieldInfo {
        String fieldName;
        String originalValue; // may be null
        Status status;
        String note;
    }

    enum Status {
        NULL, BLANK, PLAINTEXT, ENC_ALREADY_MIGRATED, ENC_NEEDS_MIGRATION, MIGRATION_FAILED
    }

    static class MigrationResult {
        List<FieldInfo> fields = new ArrayList<>();
        boolean canMigrate = true;

        void add(FieldInfo info) {
            fields.add(info);
            if (info.status == Status.MIGRATION_FAILED) {
                canMigrate = false;
            }
        }

        void printReport(boolean dryRun) {
            System.out.println("--- Migration Report " + (dryRun ? "(dry‑run)" : "(write mode)") + " ---");
            for (FieldInfo f : fields) {
                System.out.printf("%s: %s", f.fieldName, f.status);
                if (StringUtils.hasText(f.note)) {
                    System.out.printf(" – %s", f.note);
                }
                System.out.println();
            }
        }
    }

    MigrationResult evaluate(List<GlobalSettings> settings, StandaloneConverter oldConv, StandaloneConverter newConv) {
        MigrationResult result = new MigrationResult();
        for (GlobalSettings gs : settings) {
            processField(gs.getRazorpayKeySecret(), "razorpay_key_secret", result, oldConv, newConv);
            processField(gs.getRazorpayWebhookSecret(), "razorpay_webhook_secret", result, oldConv, newConv);
        }
        return result;
    }

    private void processField(String value, String fieldName, MigrationResult result,
                              StandaloneConverter oldConv, StandaloneConverter newConv) {
        FieldInfo info = new FieldInfo();
        info.fieldName = fieldName;
        info.originalValue = value;
        if (value == null) {
            info.status = Status.NULL;
            result.add(info);
            return;
        }
        if (value.isBlank()) {
            info.status = Status.BLANK;
            result.add(info);
            return;
        }
        if (!value.startsWith("ENC:")) {
            info.status = Status.PLAINTEXT;
            info.note = "Manual review required";
            result.add(info);
            return;
        }
        // Encrypted value – try new key first
        try {
            newConv.convertToEntityAttribute(value);
            info.status = Status.ENC_ALREADY_MIGRATED;
            result.add(info);
            return;
        } catch (Exception ignored) {
            // proceed to old key
        }
        try {
            String plain = oldConv.convertToEntityAttribute(value);
            // successful decryption – mark for migration
            info.status = Status.ENC_NEEDS_MIGRATION;
            result.add(info);
        } catch (Exception e) {
            info.status = Status.MIGRATION_FAILED;
            info.note = "Unable to decrypt with old key";
            result.add(info);
        }
    }

    @Transactional
    protected void performMigration(List<GlobalSettings> settings, MigrationResult result,
                                   StandaloneConverter oldConv, StandaloneConverter newConv) {
        // Map field name to new encrypted value
        for (GlobalSettings gs : settings) {
            // Razorpay Key Secret
            String newKeySecret = migrateField(gs.getRazorpayKeySecret(), result, oldConv, newConv);
            if (newKeySecret != null) {
                gs.setRazorpayKeySecret(newKeySecret);
            }
            // Razorpay Webhook Secret
            String newWebhookSecret = migrateField(gs.getRazorpayWebhookSecret(), result, oldConv, newConv);
            if (newWebhookSecret != null) {
                gs.setRazorpayWebhookSecret(newWebhookSecret);
            }
        }
        repository.saveAll(settings);
    }

    private String migrateField(String currentValue, MigrationResult result,
                                StandaloneConverter oldConv, StandaloneConverter newConv) {
        if (currentValue == null || currentValue.isBlank() || !currentValue.startsWith("ENC:")) {
            return null; // nothing to change
        }
        // Find corresponding FieldInfo
        FieldInfo fi = result.fields.stream()
                .filter(f -> f.originalValue == currentValue && (f.status == Status.ENC_NEEDS_MIGRATION))
                .findFirst()
                .orElse(null);
        if (fi == null) {
            return null; // either already migrated or should not be touched
        }
        // Decrypt with old key (already succeeded in evaluation) and re‑encrypt with new key
        String plain = oldConv.convertToEntityAttribute(currentValue);
        return newConv.convertToDatabaseColumn(plain);
    }
    static class StandaloneConverter {
        private static final String ALGORITHM = "AES";
        private final byte[] key;

        StandaloneConverter(String secret) {
            String paddedKey = String.format("%-16s", secret).substring(0, 16);
            this.key = paddedKey.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }

        String convertToDatabaseColumn(String attribute) {
            if (attribute == null || attribute.isBlank()) return attribute;
            try {
                javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance(ALGORITHM);
                cipher.init(javax.crypto.Cipher.ENCRYPT_MODE, new javax.crypto.spec.SecretKeySpec(key, ALGORITHM));
                byte[] encrypted = cipher.doFinal(attribute.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                return "ENC:" + java.util.Base64.getEncoder().encodeToString(encrypted);
            } catch (Exception e) {
                throw new RuntimeException("Encryption failed", e);
            }
        }

        String convertToEntityAttribute(String dbData) {
            if (dbData == null || !dbData.startsWith("ENC:")) return dbData;
            try {
                String actualData = dbData.substring(4);
                javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance(ALGORITHM);
                cipher.init(javax.crypto.Cipher.DECRYPT_MODE, new javax.crypto.spec.SecretKeySpec(key, ALGORITHM));
                byte[] decrypted = cipher.doFinal(java.util.Base64.getDecoder().decode(actualData));
                return new String(decrypted, java.nio.charset.StandardCharsets.UTF_8);
            } catch (Exception e) {
                throw new RuntimeException("Decryption failed", e);
            }
        }
    }
}
