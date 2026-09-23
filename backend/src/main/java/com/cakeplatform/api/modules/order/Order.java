package com.cakeplatform.api.modules.order;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.user.User;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shop_id", nullable = false)
    private Shop shop;

    @com.fasterxml.jackson.annotation.JsonProperty("shopId")
    public Long fetchShopId() {
        return shop != null ? shop.getId() : null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("shopName")
    public String fetchShopName() {
        return shop != null ? shop.getBusinessName() : null;
    }

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Column(name = "order_number", nullable = false, unique = true)
    private String orderNumber;

    @Column(nullable = false)
    private BigDecimal subtotal;

    @Column(name = "delivery_charge", nullable = false)
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "payment_status", nullable = false)
    private String paymentStatus;

    @Column(name = "order_status", nullable = false)
    private String orderStatus; // e.g., NEW, PREPARING, READY, COMPLETED, CANCELLED

    @Column(name = "delivery_address")
    private String deliveryAddress;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_email")
    private String customerEmail;

    @Column(name = "customer_phone")
    private String customerPhone;

    @Column(name = "payment_method")
    private String paymentMethod; // e.g., COD, ONLINE_PAYMENT

    @Column(name = "transaction_id")
    private String transactionId;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_slot_id")
    @JsonIgnore
    private com.cakeplatform.api.modules.shop.ShopDeliverySlot deliverySlot;

    @Column(name = "delivery_date")
    private java.time.LocalDate deliveryDate;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "coupon_code")
    private String couponCode;
}
