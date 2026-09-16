package com.cakeplatform.api.modules.location;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class LocationSeedDataIntegrityTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("Verify LGD States & Districts Seed File Integrity")
    void testStatesDistrictsSeedIntegrity() throws Exception {
        ClassPathResource resource = new ClassPathResource("data/locations/lgd_states_districts_normalized.json");
        assertTrue(resource.exists(), "lgd_states_districts_normalized.json must exist");

        JsonNode root = objectMapper.readTree(resource.getInputStream());
        assertTrue(root.isArray(), "States must be a JSON array");
        assertEquals(36, root.size(), "Must contain exactly 36 States/UTs");

        Set<String> stateCodes = new HashSet<>();
        int totalDistricts = 0;

        for (JsonNode stateNode : root) {
            assertTrue(stateNode.hasNonNull("stateCode"), "Each state must have stateCode");
            assertTrue(stateNode.hasNonNull("stateName"), "Each state must have stateName");
            assertTrue(stateNode.hasNonNull("type"), "Each state must have type");
            String code = stateNode.get("stateCode").asText();
            assertFalse(stateCodes.contains(code), "Duplicate state code: " + code);
            stateCodes.add(code);

            JsonNode districts = stateNode.get("districts");
            assertNotNull(districts);
            assertTrue(districts.isArray());
            assertTrue(districts.size() > 0, "State " + code + " must have at least one district");
            totalDistricts += districts.size();

            for (JsonNode distNode : districts) {
                assertTrue(distNode.hasNonNull("name"), "District must have name in state " + code);
                assertFalse(distNode.get("name").asText().isBlank());
            }
        }

        assertTrue(totalDistricts >= 50, "Expected at least 50 key districts in seed dataset");
    }

    @Test
    @DisplayName("Verify LGD Urban Local Bodies (Cities) Seed File Integrity")
    void testUrbanLocalBodiesSeedIntegrity() throws Exception {
        ClassPathResource resource = new ClassPathResource("data/locations/lgd_urban_local_bodies_normalized.json");
        assertTrue(resource.exists(), "lgd_urban_local_bodies_normalized.json must exist");

        JsonNode root = objectMapper.readTree(resource.getInputStream());
        assertTrue(root.isArray(), "Cities must be a JSON array");
        assertTrue(root.size() >= 20, "Should contain at least 20 tier 1/2 cities");

        for (JsonNode cityNode : root) {
            assertTrue(cityNode.hasNonNull("name"), "City must have name");
            assertTrue(cityNode.hasNonNull("districtName"), "City must have districtName");
            assertTrue(cityNode.hasNonNull("stateCode"), "City must have stateCode");
            assertTrue(cityNode.hasNonNull("tier"), "City must have tier");
        }
    }

    @Test
    @DisplayName("Verify India Post Pincodes CSV Seed File Integrity")
    void testPincodesSeedIntegrity() throws Exception {
        ClassPathResource resource = new ClassPathResource("data/locations/india_post_pincodes_normalized.csv");
        assertTrue(resource.exists(), "india_post_pincodes_normalized.csv must exist");

        Set<String> pins = new HashSet<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            assertNotNull(header);
            assertTrue(header.contains("pincode"));

            String line;
            int count = 0;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] parts = line.split(",");
                assertTrue(parts.length >= 6, "Each row must have at least 6 columns");
                String pin = parts[0].trim();
                assertTrue(pin.matches("^[1-9][0-9]{5}$"), "Invalid PIN format: " + pin);
                assertFalse(pins.contains(pin), "Duplicate PIN code in seed: " + pin);
                pins.add(pin);
                count++;
            }
            assertTrue(count >= 30, "Should contain at least 30 pincodes in seed dataset");
        }
    }

    @Test
    @DisplayName("Verify India Post Locality Mappings CSV Seed File Integrity")
    void testLocalityMappingsSeedIntegrity() throws Exception {
        ClassPathResource resource = new ClassPathResource("data/locations/india_post_locality_mappings_normalized.csv");
        assertTrue(resource.exists(), "india_post_locality_mappings_normalized.csv must exist");

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            assertNotNull(header);
            assertTrue(header.contains("locality_name"));

            String line;
            int count = 0;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] parts = line.split(",");
                assertTrue(parts.length >= 8, "Each locality mapping row must have at least 8 columns");
                String locality = parts[0].trim();
                String city = parts[1].trim();
                String pin = parts[4].trim();
                assertFalse(locality.isBlank());
                assertFalse(city.isBlank());
                assertTrue(pin.matches("^[1-9][0-9]{5}$"), "Invalid PIN in locality mapping: " + pin);
                count++;
            }
            assertTrue(count >= 25, "Should contain at least 25 locality mappings in seed dataset");
        }
    }
}
