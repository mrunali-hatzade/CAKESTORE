package com.cakeplatform.api.modules.location.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "location_countries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationCountry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 3)
    private String code;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "phone_code", nullable = false, length = 10)
    private String phoneCode;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
