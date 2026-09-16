package com.cakeplatform.api.modules.location.repository;

import com.cakeplatform.api.modules.location.entity.LocationDatasetMetadata;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
@Slf4j
public class LocationDatasetMetadataDao {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<LocationDatasetMetadata> ROW_MAPPER = new RowMapper<>() {
        @Override
        public LocationDatasetMetadata mapRow(ResultSet rs, int rowNum) throws SQLException {
            Timestamp startedTs = rs.getTimestamp("started_at");
            Timestamp completedTs = rs.getTimestamp("completed_at");
            return LocationDatasetMetadata.builder()
                    .id(rs.getInt("id"))
                    .datasetName(rs.getString("dataset_name"))
                    .sourceAuthority(rs.getString("source_authority"))
                    .sourceVersion(rs.getString("source_version"))
                    .sourceUrl(rs.getString("source_url"))
                    .checksumSha256(rs.getString("checksum_sha256"))
                    .statesCount(rs.getInt("states_count"))
                    .districtsCount(rs.getInt("districts_count"))
                    .citiesCount(rs.getInt("cities_count"))
                    .localitiesCount(rs.getInt("localities_count"))
                    .pincodesCount(rs.getInt("pincodes_count"))
                    .unresolvedCount(rs.getInt("unresolved_count"))
                    .status(rs.getString("status"))
                    .loaderSummary(rs.getString("loader_summary"))
                    .startedAt(startedTs != null ? startedTs.toLocalDateTime() : null)
                    .completedAt(completedTs != null ? completedTs.toLocalDateTime() : null)
                    .build();
        }
    };

    public Optional<LocationDatasetMetadata> findByName(String datasetName) {
        String sql = "SELECT * FROM location_dataset_metadata WHERE dataset_name = ?";
        try {
            LocationDatasetMetadata meta = jdbcTemplate.queryForObject(sql, ROW_MAPPER, datasetName);
            return Optional.ofNullable(meta);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Optional<LocationDatasetMetadata> findActiveReadyDataset(String datasetName) {
        String sql = "SELECT * FROM location_dataset_metadata WHERE dataset_name = ? AND status = 'READY'";
        try {
            LocationDatasetMetadata meta = jdbcTemplate.queryForObject(sql, ROW_MAPPER, datasetName);
            return Optional.ofNullable(meta);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public void upsertLoading(String datasetName, String authority, String version, String url, String checksum) {
        String sql = "INSERT INTO location_dataset_metadata " +
                "(dataset_name, source_authority, source_version, source_url, checksum_sha256, status, started_at, completed_at) " +
                "VALUES (?, ?, ?, ?, ?, 'LOADING', CURRENT_TIMESTAMP, NULL) " +
                "ON CONFLICT (dataset_name) DO UPDATE SET " +
                "source_authority = EXCLUDED.source_authority, " +
                "source_version = EXCLUDED.source_version, " +
                "source_url = EXCLUDED.source_url, " +
                "checksum_sha256 = EXCLUDED.checksum_sha256, " +
                "status = 'LOADING', " +
                "started_at = CURRENT_TIMESTAMP, " +
                "completed_at = NULL";
        jdbcTemplate.update(sql, datasetName, authority, version, url, checksum);
    }

    public void updateReady(String datasetName, int states, int districts, int cities, int localities, int pincodes, int unresolved, String summary) {
        String sql = "UPDATE location_dataset_metadata SET " +
                "states_count = ?, " +
                "districts_count = ?, " +
                "cities_count = ?, " +
                "localities_count = ?, " +
                "pincodes_count = ?, " +
                "unresolved_count = ?, " +
                "status = 'READY', " +
                "loader_summary = ?, " +
                "completed_at = CURRENT_TIMESTAMP " +
                "WHERE dataset_name = ?";
        jdbcTemplate.update(sql, states, districts, cities, localities, pincodes, unresolved, summary, datasetName);
    }

    public void updateFailed(String datasetName, String summary) {
        String sql = "UPDATE location_dataset_metadata SET " +
                "status = 'FAILED', " +
                "loader_summary = ?, " +
                "completed_at = CURRENT_TIMESTAMP " +
                "WHERE dataset_name = ?";
        jdbcTemplate.update(sql, summary, datasetName);
    }
}
