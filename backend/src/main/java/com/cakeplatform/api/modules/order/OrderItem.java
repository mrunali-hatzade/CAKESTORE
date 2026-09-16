package com.cakeplatform.api.modules.order;

import com.cakeplatform.api.modules.product.Product;
import jakarta.persistence.*;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "product_name_snapshot", nullable = false)
    private String productNameSnapshot;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "total_price", nullable = false)
    private BigDecimal totalPrice;

    @Column(name = "variant_name")
    private String variantName;

    @Column(name = "dietary_preference")
    private String dietaryPreference;

    @Column(name = "cake_message")
    private String cakeMessage;

    @Column(name = "photo_reference_url")
    private String photoReferenceUrl;

    @Column(name = "addons_summary", columnDefinition = "TEXT")
    private String addonsSummary;

    @Column(name = "product_image_url")
    private String productImageUrl;

    @Column(name = "original_price")
    private BigDecimal originalPrice;
}
