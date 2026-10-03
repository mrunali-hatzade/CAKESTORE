package com.cakeplatform.api.modules.communication;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.user.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "platform_feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnore
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id")
    @JsonIgnore
    private Shop shop;

    @Column(nullable = false)
    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PlatformFeedbackCategory category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(columnDefinition = "TEXT")
    private String adminReply;

    private java.time.LocalDateTime repliedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @JsonProperty("shopId")
    public Long getShopId() {
        return shop != null ? shop.getId() : null;
    }

    @JsonProperty("shopName")
    public String getShopName() {
        return shop != null ? shop.getBusinessName() : null;
    }

    @JsonProperty("ownerName")
    public String getOwnerName() {
        return owner != null ? owner.getFullName() : null;
    }

    @JsonProperty("ownerEmail")
    public String getOwnerEmail() {
        return owner != null ? owner.getEmail() : null;
    }
}
