package com.cakeplatform.api.modules.interaction;

import com.cakeplatform.api.modules.shop.Shop;
import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
@Data
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @Column(name = "customer_display_name")
    private String customerDisplayName;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "order_reference")
    private String orderReference;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private com.cakeplatform.api.modules.product.Product product;

    @Column(name = "product_name")
    private String productName;

    @Column(name = "recommendation_text", columnDefinition = "TEXT")
    private String recommendationText;

    @Column(name = "cake_image_url", length = 1000)
    private String cakeImageUrl;

    @Column(name = "cake_video_url", length = 1000)
    private String cakeVideoUrl;

    public Long getProductId() {
        return product != null ? product.getId() : null;
    }

    @Column(name = "customer_email")
    private String customerEmail;

    @JsonIgnore
    @Column(name = "edit_token", length = 100)
    private String editToken;

    @Column(name = "is_approved", nullable = false)
    private Boolean isApproved = true;

    @Column(name = "owner_reply", columnDefinition = "TEXT")
    private String ownerReply;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private String deletedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
