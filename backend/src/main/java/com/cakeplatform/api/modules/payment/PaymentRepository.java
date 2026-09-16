package com.cakeplatform.api.modules.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByShopId(Long shopId);
    List<Payment> findByShopIdOrderByCreatedAtDesc(Long shopId);
    java.util.Optional<Payment> findByProviderPaymentId(String providerPaymentId);
    java.util.Optional<Payment> findByProviderOrderId(String providerOrderId);
    java.util.Optional<Payment> findByIdAndShopId(Long id, Long shopId);
    void deleteByShopId(Long shopId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    java.util.Optional<Payment> findByIdWithLock(@org.springframework.data.repository.query.Param("id") Long id);

    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.status = 'COMPLETED'")
    BigDecimal getTotalRevenue();

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status = 'COMPLETED' AND (p.paidAt >= :startOfDay OR (p.paidAt IS NULL AND p.createdAt >= :startOfDay))")
    long countTodayCompletedPayments(@org.springframework.data.repository.query.Param("startOfDay") java.time.LocalDateTime startOfDay);

    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.status = 'COMPLETED' AND (p.paidAt >= :startOfMonth OR (p.paidAt IS NULL AND p.createdAt >= :startOfMonth))")
    BigDecimal getMonthlyRevenue(@org.springframework.data.repository.query.Param("startOfMonth") java.time.LocalDateTime startOfMonth);
}
