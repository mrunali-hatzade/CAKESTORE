package com.cakeplatform.api.modules.location.service;

import com.cakeplatform.api.modules.location.entity.LocationDatasetMetadata;
import com.cakeplatform.api.modules.location.readiness.LocationReadinessState;
import com.cakeplatform.api.modules.location.repository.LocationDatasetMetadataDao;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationDataReconciliationEngine {

    public static final String DATASET_NAME = "LGD_INDIA_POST_CANONICAL";
    public static final String SOURCE_AUTHORITY = "Local Government Directory (MoPR) & Department of Posts (data.gov.in)";
    public static final String SOURCE_VERSION = "2024.1";
    public static final String SOURCE_URL = "https://lgd.gov.in and https://data.gov.in";

    private final JdbcTemplate jdbcTemplate;
    private final LocationDatasetMetadataDao metadataDao;
    private final LocationReadinessState readinessState;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    public void reconcile() {
        log.info("Starting canonical Indian location hierarchy verification/reconciliation...");
        readinessState.setReady(false);

        try {
            Resource statesRes = resourceLoader.getResource("classpath:data/locations/lgd_states_districts_normalized.json");
            Resource citiesRes = resourceLoader.getResource("classpath:data/locations/lgd_urban_local_bodies_normalized.json");
            Resource pinsRes = resourceLoader.getResource("classpath:data/locations/india_post_pincodes_normalized.csv");
            Resource locsRes = resourceLoader.getResource("classpath:data/locations/india_post_locality_mappings_normalized.csv");

            if (!statesRes.exists() || !citiesRes.exists() || !pinsRes.exists() || !locsRes.exists()) {
                throw new IllegalStateException("One or more canonical location seed artifacts are missing from classpath");
            }

            // Compute composite checksum of seed files
            String compositeChecksum = computeChecksum(statesRes, citiesRes, pinsRes, locsRes);

            // Check Fast Path
            Optional<LocationDatasetMetadata> activeReady = metadataDao.findActiveReadyDataset(DATASET_NAME);
            if (activeReady.isPresent() && compositeChecksum.equalsIgnoreCase(activeReady.get().getChecksumSha256())) {
                log.info("Fast path: Verified READY location dataset with matching checksum {} already exists. Skipping full reconciliation.", compositeChecksum);
                // Verify basic count sanity
                Integer stateCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM location_states WHERE is_active = true", Integer.class);
                if (stateCount != null && stateCount >= 36) {
                    readinessState.setReady(true);
                    return;
                }
            }

            log.info("Executing full deterministic location dataset reconciliation (Checksum: {})...", compositeChecksum);
            metadataDao.upsertLoading(DATASET_NAME, SOURCE_AUTHORITY, SOURCE_VERSION, SOURCE_URL, compositeChecksum);

            int unresolvedCount = 0;

            // 1. Reconcile Country
            jdbcTemplate.update(
                    "INSERT INTO location_countries (code, name, phone_code, is_active) VALUES ('IND', 'India', '+91', true) " +
                    "ON CONFLICT (code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP"
            );
            Integer countryId = jdbcTemplate.queryForObject("SELECT id FROM location_countries WHERE code = 'IND'", Integer.class);

            // 2. Reconcile States and Districts
            JsonNode statesArray;
            try (InputStream is = statesRes.getInputStream()) {
                statesArray = objectMapper.readTree(is);
            }

            for (JsonNode stateNode : statesArray) {
                String stateCode = stateNode.get("stateCode").asText();
                String stateName = stateNode.get("stateName").asText();
                String stateType = stateNode.has("type") ? stateNode.get("type").asText() : "STATE";
                Integer lgdCode = stateNode.has("lgdCode") ? stateNode.get("lgdCode").asInt() : null;
                String normalizedState = normalize(stateName);

                jdbcTemplate.update(
                        "INSERT INTO location_states (country_id, code, name, normalized_name, type, lgd_code, is_active, updated_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP) " +
                        "ON CONFLICT (country_id, normalized_name) DO UPDATE SET " +
                        "code = EXCLUDED.code, " +
                        "name = EXCLUDED.name, " +
                        "type = EXCLUDED.type, " +
                        "lgd_code = EXCLUDED.lgd_code, " +
                        "is_active = true, " +
                        "updated_at = CURRENT_TIMESTAMP",
                        countryId, stateCode, stateName, normalizedState, stateType, lgdCode
                );

                Integer stateId = jdbcTemplate.queryForObject(
                        "SELECT id FROM location_states WHERE country_id = ? AND normalized_name = ?",
                        Integer.class, countryId, normalizedState
                );

                JsonNode districtsArray = stateNode.get("districts");
                if (districtsArray != null && districtsArray.isArray()) {
                    for (JsonNode distNode : districtsArray) {
                        String distName = distNode.get("name").asText();
                        Integer distLgd = distNode.has("lgdCode") ? distNode.get("lgdCode").asInt() : null;
                        String normalizedDist = normalize(distName);

                        jdbcTemplate.update(
                                "INSERT INTO location_districts (state_id, name, normalized_name, lgd_code, is_active, updated_at) " +
                                "VALUES (?, ?, ?, ?, true, CURRENT_TIMESTAMP) " +
                                "ON CONFLICT (state_id, normalized_name) DO UPDATE SET " +
                                "name = EXCLUDED.name, " +
                                "lgd_code = EXCLUDED.lgd_code, " +
                                "is_active = true, " +
                                "updated_at = CURRENT_TIMESTAMP",
                                stateId, distName, normalizedDist, distLgd
                        );
                    }
                }
            }

            // 3. Reconcile Cities
            JsonNode citiesArray;
            try (InputStream is = citiesRes.getInputStream()) {
                citiesArray = objectMapper.readTree(is);
            }

            for (JsonNode cityNode : citiesArray) {
                String cityName = cityNode.get("name").asText();
                String distName = cityNode.get("districtName").asText();
                String stateCode = cityNode.get("stateCode").asText();
                String tier = cityNode.has("tier") ? cityNode.get("tier").asText() : "TIER_2";
                Integer lgdUlb = cityNode.has("lgdUlbCode") ? cityNode.get("lgdUlbCode").asInt() : null;

                Integer districtId = findDistrictId(distName, stateCode);
                if (districtId != null) {
                    jdbcTemplate.update(
                            "INSERT INTO location_cities (district_id, name, normalized_name, tier, lgd_ulb_code, is_active, updated_at) " +
                            "VALUES (?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP) " +
                            "ON CONFLICT (district_id, normalized_name) DO UPDATE SET " +
                            "name = EXCLUDED.name, " +
                            "tier = EXCLUDED.tier, " +
                            "lgd_ulb_code = EXCLUDED.lgd_ulb_code, " +
                            "is_active = true, " +
                            "updated_at = CURRENT_TIMESTAMP",
                            districtId, cityName, normalize(cityName), tier, lgdUlb
                    );
                } else {
                    unresolvedCount++;
                    log.warn("Reconciliation unresolved: City '{}' cannot map to unknown district '{}' in state '{}'", cityName, distName, stateCode);
                }
            }

            // 4. Reconcile Pincodes
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(pinsRes.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                boolean header = true;
                while ((line = reader.readLine()) != null) {
                    if (header) {
                        header = false;
                        continue;
                    }
                    if (line.isBlank()) continue;
                    String[] parts = line.split(",");
                    if (parts.length < 6) continue;

                    String pin = parts[0].trim();
                    String distName = parts[1].trim();
                    String stateCode = parts[2].trim();
                    String officeName = parts[3].trim();
                    String officeType = parts[4].trim();
                    String deliveryStatus = parts[5].trim();

                    Integer districtId = findDistrictId(distName, stateCode);
                    if (districtId != null) {
                        jdbcTemplate.update(
                                "INSERT INTO location_pincodes (pincode, district_id, primary_office_name, office_type, delivery_status, is_active, updated_at) " +
                                "VALUES (?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP) " +
                                "ON CONFLICT (pincode) DO UPDATE SET " +
                                "district_id = EXCLUDED.district_id, " +
                                "primary_office_name = EXCLUDED.primary_office_name, " +
                                "office_type = EXCLUDED.office_type, " +
                                "delivery_status = EXCLUDED.delivery_status, " +
                                "is_active = true, " +
                                "updated_at = CURRENT_TIMESTAMP",
                                pin, districtId, officeName, officeType, deliveryStatus
                        );
                    } else {
                        unresolvedCount++;
                        log.warn("Reconciliation unresolved: Pincode '{}' cannot map to unknown district '{}' in state '{}'", pin, distName, stateCode);
                    }
                }
            }

            // 5. Reconcile Localities and Locality-Pincode Mappings
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(locsRes.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                boolean header = true;
                while ((line = reader.readLine()) != null) {
                    if (header) {
                        header = false;
                        continue;
                    }
                    if (line.isBlank()) continue;
                    String[] parts = line.split(",");
                    if (parts.length < 8) continue;

                    String locName = parts[0].trim();
                    String cityName = parts[1].trim();
                    String distName = parts[2].trim();
                    String stateCode = parts[3].trim();
                    String pin = parts[4].trim();
                    Double lat = !parts[5].trim().isEmpty() ? Double.parseDouble(parts[5].trim()) : null;
                    Double lng = !parts[6].trim().isEmpty() ? Double.parseDouble(parts[6].trim()) : null;
                    boolean isPrimary = Boolean.parseBoolean(parts[7].trim());

                    Integer cityId = findCityId(cityName, distName, stateCode);
                    if (cityId != null) {
                        jdbcTemplate.update(
                                "INSERT INTO location_localities (city_id, name, normalized_name, latitude, longitude, is_active, updated_at) " +
                                "VALUES (?, ?, ?, ?, ?, true, CURRENT_TIMESTAMP) " +
                                "ON CONFLICT (city_id, normalized_name) DO UPDATE SET " +
                                "name = EXCLUDED.name, " +
                                "latitude = EXCLUDED.latitude, " +
                                "longitude = EXCLUDED.longitude, " +
                                "is_active = true, " +
                                "updated_at = CURRENT_TIMESTAMP",
                                cityId, locName, normalize(locName), lat, lng
                        );

                        Integer locId = jdbcTemplate.queryForObject(
                                "SELECT id FROM location_localities WHERE city_id = ? AND normalized_name = ?",
                                Integer.class, cityId, normalize(locName)
                        );

                        // Ensure Pincode exists before junction insertion
                        Integer pinExists = jdbcTemplate.queryForObject(
                                "SELECT COUNT(*) FROM location_pincodes WHERE pincode = ?", Integer.class, pin
                        );
                        if (pinExists != null && pinExists > 0 && locId != null) {
                            jdbcTemplate.update(
                                    "INSERT INTO location_locality_pincodes (locality_id, pincode, is_primary) " +
                                    "VALUES (?, ?, ?) " +
                                    "ON CONFLICT (locality_id, pincode) DO UPDATE SET is_primary = EXCLUDED.is_primary",
                                    locId, pin, isPrimary
                            );
                        }
                    } else {
                        unresolvedCount++;
                        log.warn("Reconciliation unresolved: Locality '{}' cannot map to unknown city '{}' in district '{}'", locName, cityName, distName);
                    }
                }
            }

            // 6. Assertions on dataset completeness
            int finalStates = Optional.ofNullable(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM location_states WHERE is_active = true", Integer.class)).orElse(0);
            int finalDistricts = Optional.ofNullable(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM location_districts WHERE is_active = true", Integer.class)).orElse(0);
            int finalCities = Optional.ofNullable(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM location_cities WHERE is_active = true", Integer.class)).orElse(0);
            int finalLocalities = Optional.ofNullable(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM location_localities WHERE is_active = true", Integer.class)).orElse(0);
            int finalPincodes = Optional.ofNullable(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM location_pincodes WHERE is_active = true", Integer.class)).orElse(0);

            if (finalStates < 36) {
                throw new IllegalStateException("Incomplete dataset: Expected 36 States/UTs, found " + finalStates);
            }
            if (finalDistricts < 20) {
                throw new IllegalStateException("Incomplete dataset: Districts count below threshold (" + finalDistricts + ")");
            }

            String summary = String.format("States: %d, Districts: %d, Cities: %d, Localities: %d, Pincodes: %d, Unresolved: %d",
                    finalStates, finalDistricts, finalCities, finalLocalities, finalPincodes, unresolvedCount);

            metadataDao.updateReady(DATASET_NAME, finalStates, finalDistricts, finalCities, finalLocalities, finalPincodes, unresolvedCount, summary);
            readinessState.setReady(true);
            log.info("Canonical Indian location hierarchy successfully reconciled and marked READY! ({})", summary);

        } catch (Exception e) {
            log.error("Failed to reconcile canonical location dataset: {}", e.getMessage(), e);
            metadataDao.updateFailed(DATASET_NAME, "Failed: " + e.getMessage());
            readinessState.setReady(false);
            // In dev/test we do not throw so application can still start and test failure modes
        }
    }

    private Integer findDistrictId(String districtName, String stateCode) {
        String sql = "SELECT d.id FROM location_districts d " +
                     "JOIN location_states s ON d.state_id = s.id " +
                     "WHERE d.normalized_name = ? AND LOWER(s.code) = ? LIMIT 1";
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, normalize(districtName), stateCode.toLowerCase().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private Integer findCityId(String cityName, String districtName, String stateCode) {
        String sql = "SELECT c.id FROM location_cities c " +
                     "JOIN location_districts d ON c.district_id = d.id " +
                     "JOIN location_states s ON d.state_id = s.id " +
                     "WHERE c.normalized_name = ? AND d.normalized_name = ? AND LOWER(s.code) = ? LIMIT 1";
        try {
            return jdbcTemplate.queryForObject(sql, Integer.class, normalize(cityName), normalize(districtName), stateCode.toLowerCase().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String normalize(String str) {
        if (str == null) return "";
        return str.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    private String computeChecksum(Resource... resources) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            for (Resource r : resources) {
                try (InputStream is = r.getInputStream()) {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = is.read(buffer)) != -1) {
                        digest.update(buffer, 0, bytesRead);
                    }
                }
            }
            byte[] hash = digest.digest();
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Failed to compute SHA-256 checksum: {}", e.getMessage());
            return UUID.randomUUID().toString();
        }
    }
}
