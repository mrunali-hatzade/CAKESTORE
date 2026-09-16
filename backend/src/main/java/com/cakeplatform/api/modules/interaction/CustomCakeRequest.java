package com.cakeplatform.api.modules.interaction;

import com.cakeplatform.api.modules.shop.Shop;
import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "custom_cake_requests")
@Data
public class CustomCakeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_email", nullable = false)
    private String customerEmail;

    @Column(name = "customer_mobile")
    private String customerMobile;

    private String occasion;
    
    @Column(name = "cake_type")
    private String cakeType;
    
    private String flavour;
    
    private Integer servings;

    @Column(name = "design_description", columnDefinition = "TEXT")
    private String designDescription;

    @Column(name = "reference_image_url")
    private String referenceImageUrl;

    private BigDecimal budget;

    @Column(name = "required_date")
    private LocalDate requiredDate;

    @Column(name = "delivery_preference")
    private String deliveryPreference;

    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, REVIEWED, ACCEPTED, REJECTED

    @Column(name = "owner_response", columnDefinition = "TEXT")
    private String ownerResponse;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private java.util.List<CustomCakeRequestFieldValue> fieldValues = new java.util.ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
