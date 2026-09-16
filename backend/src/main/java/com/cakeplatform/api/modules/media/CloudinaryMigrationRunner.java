package com.cakeplatform.api.modules.media;

import com.cakeplatform.api.modules.shop.BusinessDocument;
import com.cloudinary.Cloudinary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.migration.media.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class CloudinaryMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final Cloudinary cloudinary;
    
    @Value("${app.file.upload-dir:uploads}")
    private String uploadDir;
    
    @Value("${app.migration.media.dry-run:true}")
    private boolean dryRun;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting Cloudinary Migration Runner... Dry Run: {}", dryRun);

        // Migrate Products
        migrateTable("products", "image_url", "products");
        migrateTable("product_variants", "image_url", "products");
        migrateTable("product_images", "image_url", "products");

        // Migrate Shops
        migrateTable("shops", "logo_url", "logos");
        migrateTable("shops", "cover_image_url", "covers");
        migrateTable("shops", "about_image_url", "covers");

        // Migrate Shop Gallery
        migrateTable("shop_banners", "image_url", "covers");
        migrateTable("shop_gallery_items", "image_url", "products");

        // Migrate Orders & Custom Requests
        migrateTable("order_items", "product_image_url", "products");
        migrateTable("custom_cake_requests", "reference_image_url", "custom-cake-references");

        // Migrate Documents (Authenticated)
        migrateTable("business_documents", "file_url", "documents");

        log.info("Cloudinary Migration Runner Finished.");
    }

    private void migrateTable(String tableName, String columnName, String subDirectory) {
        String sql = "SELECT id, " + columnName + " FROM " + tableName + " WHERE " + columnName + " LIKE '%/uploads/%'";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);

        for (Map<String, Object> row : rows) {
            Long id = ((Number) row.get("id")).longValue();
            String oldUrl = (String) row.get(columnName);

            // Idempotency: skip if already migrated (e.g. contains res.cloudinary.com)
            if (oldUrl == null || oldUrl.contains("res.cloudinary.com")) {
                continue;
            }

            try {
                // Extract filename
                int uploadIdx = oldUrl.indexOf("/uploads/");
                String pathStr = oldUrl.substring(uploadIdx + "/uploads/".length());
                if (pathStr.contains("?")) pathStr = pathStr.substring(0, pathStr.indexOf("?"));
                
                Path localFile = Paths.get(uploadDir).resolve(pathStr).normalize();
                
                if (!Files.exists(localFile)) {
                    log.warn("Migration: Local file not found for {} id={}, URL={}", tableName, id, oldUrl);
                    continue; // Do not fail migration, preserve old URL
                }

                if (dryRun) {
                    log.info("[DRY-RUN] Would migrate {} ID {} -> Upload {} to Cloudinary folder cakestore/prod/{}", tableName, id, localFile, subDirectory);
                    continue;
                }

                // Upload to Cloudinary
                Map<String, Object> params = new HashMap<>();
                String folder = "cakestore/prod/" + subDirectory;
                params.put("folder", folder);
                if ("documents".equalsIgnoreCase(subDirectory) || "verifications".equalsIgnoreCase(subDirectory)) {
                    params.put("type", "authenticated");
                }

                Map uploadResult = cloudinary.uploader().upload(localFile.toFile(), params);
                String secureUrl = uploadResult.get("secure_url").toString();

                // Update exact record
                String updateSql = "UPDATE " + tableName + " SET " + columnName + " = ? WHERE id = ?";
                jdbcTemplate.update(updateSql, secureUrl, id);

                log.info("Successfully migrated {} ID {}: {} -> {}", tableName, id, oldUrl, secureUrl);
            } catch (Exception e) {
                log.error("Failed to migrate {} ID {}. DB remains unchanged.", tableName, id, e);
            }
        }
    }
}
