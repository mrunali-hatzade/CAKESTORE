package com.cakeplatform.api.modules.location.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "location_pincodes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LocationPincode {

    @Id
    @Column(length = 6)
    private String pincode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id", nullable = false)
    private LocationDistrict district;

    @Column(name = "primary_office_name", nullable = false, length = 150)
    private String primaryOfficeName;

    @Column(name = "office_type", nullable = false, length = 10)
    private String officeType;

    @Column(name = "delivery_status", nullable = false, length = 20)
    @Builder.Default
    private String deliveryStatus = "Delivery";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    /**
     * Helper to deterministically access canonical state via district
     */
    public LocationState getState() {
        return district != null ? district.getState() : null;
    }
}
