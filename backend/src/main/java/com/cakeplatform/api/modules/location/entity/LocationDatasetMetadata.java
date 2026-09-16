package com.cakeplatform.api.modules.location.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "location_dataset_metadata")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationDatasetMetadata {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "dataset_name", nullable = false, unique = true, length = 100)
    private String datasetName;

    @Column(name = "source_authority", nullable = false, length = 150)
    private String sourceAuthority;

    @Column(name = "source_version", nullable = false, length = 50)
    private String sourceVersion;

    @Column(name = "source_url", nullable = false, length = 500)
    private String sourceUrl;

    @Column(name = "checksum_sha256", nullable = false, length = 64)
    private String checksumSha256;

    @Column(name = "states_count", nullable = false)
    @Builder.Default
    private Integer statesCount = 0;

    @Column(name = "districts_count", nullable = false)
    @Builder.Default
    private Integer districtsCount = 0;

    @Column(name = "cities_count", nullable = false)
    @Builder.Default
    private Integer citiesCount = 0;

    @Column(name = "localities_count", nullable = false)
    @Builder.Default
    private Integer localitiesCount = 0;

    @Column(name = "pincodes_count", nullable = false)
    @Builder.Default
    private Integer pincodesCount = 0;

    @Column(name = "unresolved_count", nullable = false)
    @Builder.Default
    private Integer unresolvedCount = 0;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "LOADING"; // LOADING, READY, FAILED, SUPERSEDED

    @Column(name = "loader_summary", columnDefinition = "TEXT")
    private String loaderSummary;

    @Column(name = "started_at", nullable = false)
    @Builder.Default
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
