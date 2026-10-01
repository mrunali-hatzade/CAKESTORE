package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.shop.CouponRepository;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final ShopAccessValidator shopAccessValidator;

    @Value("${app.business.default-timezone:Asia/Kolkata}")
    private String configuredTimezone;

    public ZoneId getOperationalZone() {
        try {
            return ZoneId.of(configuredTimezone);
        } catch (Exception e) {
            return ZoneId.systemDefault();
        }
    }

    public Map<String, Object> getDashboardAnalytics(Long userId) {
        return getDashboardAnalytics(userId, "7d");
    }

    public Map<String, Object> getDashboardAnalytics(Long userId, String range) {
        Shop shop = shopAccessValidator.getValidShopForOwner(userId);
        Long shopId = shop.getId();

        // 1. Total lifetime valid order count (excluding abandoned online payments)
        long totalOrders = orderRepository.countVisibleOrdersByShopId(shopId);

        // 2. Realized Lifetime Revenue (Paid & Delivered)
        BigDecimal totalRevenue = orderRepository.sumRevenueByShopId(shopId);
        if (totalRevenue == null) {
            totalRevenue = BigDecimal.ZERO;
        }

        // 2b. Gross Order Value (All confirmed customer orders)
        BigDecimal totalGrossSales = orderRepository.sumGrossSalesByShopId(shopId);
        if (totalGrossSales == null) {
            totalGrossSales = BigDecimal.ZERO;
        }

        // 3. Lifetime Average Order Value based on customer order baskets
        BigDecimal lifetimeAov = totalOrders > 0
                ? totalGrossSales.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 4. Time Window Resolution
        ZoneId zone = getOperationalZone();
        LocalDate today = LocalDate.now(zone);
        LocalDate startDate;
        int periodDays;

        String cleanRange = (range != null && !range.isBlank()) ? range.trim().toLowerCase() : "7d";
        switch (cleanRange) {
            case "30d":
                periodDays = 30;
                startDate = today.minusDays(29);
                break;
            case "this_month":
                startDate = today.withDayOfMonth(1);
                periodDays = today.getDayOfMonth();
                break;
            case "all":
                periodDays = 90; // Default 90-day velocity window for all-time view
                startDate = today.minusDays(89);
                break;
            case "7d":
            default:
                periodDays = 7;
                startDate = today.minusDays(6);
                cleanRange = "7d";
                break;
        }

        LocalDateTime startDateTime = startDate.atStartOfDay();

        // 5. Build Chronological Daily Points and SalesByDay Map
        DateTimeFormatter shortLabelFormatter = DateTimeFormatter.ofPattern("EEE d", Locale.ENGLISH);
        List<Map<String, Object>> dailyData = new ArrayList<>();
        Map<String, Map<String, Object>> dateLookup = new HashMap<>();
        Map<String, BigDecimal> salesByDay = new LinkedHashMap<>();

        for (int i = 0; i < periodDays; i++) {
            LocalDate d = startDate.plusDays(i);
            String dateStr = d.toString();
            String dayName = d.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            String shortDay = d.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            boolean isToday = d.equals(today);
            String label = isToday ? "Today" : d.format(shortLabelFormatter);

            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", dateStr);
            point.put("dayName", dayName);
            point.put("shortDay", shortDay);
            point.put("label", label);
            point.put("revenue", BigDecimal.ZERO);
            point.put("orderCount", 0);
            point.put("isToday", isToday);

            dailyData.add(point);
            dateLookup.put(dateStr, point);

            // Backward-compatible day-name map
            salesByDay.put(dayName, BigDecimal.ZERO);
        }

        // Query all real valid customer orders in this period (both online paid & COD in-preparation)
        List<Order> recentOrders = orderRepository.findRecentValidOrders(shopId, startDateTime);
        BigDecimal periodRevenue = BigDecimal.ZERO;
        int periodOrders = 0;

        for (Order o : recentOrders) {
            if (o.getCreatedAt() != null && o.getTotalAmount() != null) {
                LocalDate orderDate = o.getCreatedAt().atZone(ZoneId.systemDefault()).withZoneSameInstant(zone).toLocalDate();
                String dateStr = orderDate.toString();

                Map<String, Object> point = dateLookup.get(dateStr);
                if (point != null) {
                    BigDecimal currentRev = (BigDecimal) point.get("revenue");
                    int currentOrders = (Integer) point.get("orderCount");

                    BigDecimal orderTotal = o.getTotalAmount();
                    point.put("revenue", currentRev.add(orderTotal));
                    point.put("orderCount", currentOrders + 1);

                    periodRevenue = periodRevenue.add(orderTotal);
                    periodOrders++;

                    String dayName = (String) point.get("dayName");
                    salesByDay.put(dayName, salesByDay.getOrDefault(dayName, BigDecimal.ZERO).add(orderTotal));
                }
            }
        }

        // Peak Day in Period
        String peakDay = null;
        String peakDate = null;
        BigDecimal peakAmount = BigDecimal.ZERO;

        for (Map<String, Object> point : dailyData) {
            BigDecimal rev = (BigDecimal) point.get("revenue");
            if (rev.compareTo(peakAmount) > 0) {
                peakAmount = rev;
                peakDay = (String) point.get("dayName");
                peakDate = (String) point.get("date");
            }
        }

        BigDecimal periodDailyAverage = periodDays > 0
                ? periodRevenue.divide(BigDecimal.valueOf(periodDays), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // 6. Order Status Fulfillment Health Breakdown
        List<Object[]> statusCountsRaw = orderRepository.countOrdersByStatusForShop(shopId);
        long completedOrders = 0;
        long inProgressOrders = 0;
        long cancelledOrders = 0;

        long totalStatusOrders = 0;

        for (Object[] row : statusCountsRaw) {
            String status = row[0] != null ? row[0].toString().toUpperCase() : "UNKNOWN";
            long count = ((Number) row[1]).longValue();
            totalStatusOrders += count;

            if (status.equals("COMPLETED") || status.equals("DELIVERED")) {
                completedOrders += count;
            } else if (status.equals("CANCELLED")) {
                cancelledOrders += count;
            } else if (status.equals("NEW") || status.equals("CONFIRMED") || status.equals("PREPARING") || status.equals("READY") || status.equals("READY_FOR_PICKUP") || status.equals("OUT_FOR_DELIVERY")) {
                inProgressOrders += count;
            }
        }

        double cancellationRate = totalStatusOrders > 0
                ? Math.round((cancelledOrders * 1000.0) / totalStatusOrders) / 10.0
                : 0.0;

        // 7. Payment Methods Breakdown (COD vs Online / UPI)
        List<Object[]> paymentRaw = orderRepository.sumRevenueByPaymentMethodForShop(shopId);
        List<Map<String, Object>> paymentBreakdown = new ArrayList<>();
        BigDecimal totalPaymentRevenue = BigDecimal.ZERO;

        for (Object[] row : paymentRaw) {
            String method = row[0] != null ? row[0].toString().toUpperCase() : "OTHER";
            long count = row[1] != null ? ((Number) row[1]).longValue() : 0;
            BigDecimal rev = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;

            totalPaymentRevenue = totalPaymentRevenue.add(rev);

            String label = method.contains("COD") ? "Cash on Delivery (COD)" : (method.contains("RAZORPAY") || method.contains("ONLINE") ? "Online / UPI" : method);

            Map<String, Object> pItem = new HashMap<>();
            pItem.put("method", method);
            pItem.put("label", label);
            pItem.put("orderCount", count);
            pItem.put("revenue", rev);
            paymentBreakdown.add(pItem);
        }

        for (Map<String, Object> pItem : paymentBreakdown) {
            BigDecimal rev = (BigDecimal) pItem.get("revenue");
            double pct = totalPaymentRevenue.compareTo(BigDecimal.ZERO) > 0
                    ? Math.round(rev.multiply(BigDecimal.valueOf(100)).divide(totalPaymentRevenue, 1, RoundingMode.HALF_UP).doubleValue())
                    : 0.0;
            pItem.put("percentage", pct);
        }

        // 7b. Cash on Delivery (COD) Cash Flow & Settlement Breakdown
        List<Object[]> pendingCodRaw = orderRepository.sumPendingCodForShop(shopId);
        BigDecimal pendingCodAmount = BigDecimal.ZERO;
        long pendingCodOrders = 0;
        if (!pendingCodRaw.isEmpty() && pendingCodRaw.get(0) != null) {
            Object[] row = pendingCodRaw.get(0);
            if (row.length > 0 && row[0] != null) pendingCodAmount = (BigDecimal) row[0];
            if (row.length > 1 && row[1] != null) pendingCodOrders = ((Number) row[1]).longValue();
        }

        List<Object[]> collectedCodRaw = orderRepository.sumCollectedCodForShop(shopId);
        BigDecimal collectedCodAmount = BigDecimal.ZERO;
        long collectedCodOrders = 0;
        if (!collectedCodRaw.isEmpty() && collectedCodRaw.get(0) != null) {
            Object[] row = collectedCodRaw.get(0);
            if (row.length > 0 && row[0] != null) collectedCodAmount = (BigDecimal) row[0];
            if (row.length > 1 && row[1] != null) collectedCodOrders = ((Number) row[1]).longValue();
        }

        List<Object[]> collectedOnlineRaw = orderRepository.sumCollectedOnlineForShop(shopId);
        BigDecimal onlineCollectedAmount = BigDecimal.ZERO;
        long onlineOrders = 0;
        if (!collectedOnlineRaw.isEmpty() && collectedOnlineRaw.get(0) != null) {
            Object[] row = collectedOnlineRaw.get(0);
            if (row.length > 0 && row[0] != null) onlineCollectedAmount = (BigDecimal) row[0];
            if (row.length > 1 && row[1] != null) onlineOrders = ((Number) row[1]).longValue();
        }

        BigDecimal calculatedCollectedRevenue = collectedCodAmount.add(onlineCollectedAmount);
        long calculatedCollectedOrders = collectedCodOrders + onlineOrders;

        Map<String, Object> codSettlement = new LinkedHashMap<>();
        codSettlement.put("pendingAmount", pendingCodAmount);
        codSettlement.put("pendingOrders", pendingCodOrders);
        codSettlement.put("collectedAmount", collectedCodAmount);
        codSettlement.put("collectedOrders", collectedCodOrders);
        codSettlement.put("onlineCollectedAmount", onlineCollectedAmount);
        codSettlement.put("onlineOrders", onlineOrders);
        codSettlement.put("totalCollectedAmount", calculatedCollectedRevenue);
        codSettlement.put("totalCollectedOrders", calculatedCollectedOrders);

        // 8. Real Top-selling products from OrderItem snapshots with Revenue & Photo
        List<Object[]> topProductsRaw = orderRepository.findTopSellingProductsWithRevenueByShopId(shopId, PageRequest.of(0, 5));
        Map<String, Integer> topSellingProducts = new LinkedHashMap<>();
        List<Map<String, Object>> topProductsDetails = new ArrayList<>();
        int totalTopUnits = 0;

        for (Object[] row : topProductsRaw) {
            String productName = (String) row[0];
            Number qty = (Number) row[1];
            BigDecimal rev = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            String imgUrl = row.length > 3 ? (String) row[3] : null;

            int units = qty != null ? qty.intValue() : 0;
            totalTopUnits += units;

            if (productName != null) {
                topSellingProducts.put(productName, units);

                Map<String, Object> p = new HashMap<>();
                p.put("name", productName);
                p.put("quantity", units);
                p.put("revenue", rev);
                p.put("imageUrl", imgUrl);
                topProductsDetails.add(p);
            }
        }

        for (Map<String, Object> p : topProductsDetails) {
            int units = (Integer) p.get("quantity");
            double share = totalTopUnits > 0 ? Math.round((units * 100.0) / totalTopUnits) : 0.0;
            p.put("sharePercentage", share);
        }

        // 9. Coupon performance metrics
        long totalCoupons = couponRepository.countByShopId(shopId);
        long activeCoupons = couponRepository.countByShopIdAndIsActiveTrue(shopId);
        BigDecimal totalDiscountGranted = orderRepository.sumTotalDiscountByShopId(shopId);
        if (totalDiscountGranted == null) {
            totalDiscountGranted = BigDecimal.ZERO;
        }
        long totalCouponOrders = orderRepository.countCouponOrdersByShopId(shopId);
        double couponUtilizationRate = totalOrders > 0
                ? Math.round((totalCouponOrders * 1000.0) / totalOrders) / 10.0
                : 0.0;

        Map<String, Object> analytics = new HashMap<>();
        analytics.put("shopId", shopId);
        analytics.put("range", cleanRange);
        analytics.put("totalOrders", totalOrders);
        BigDecimal collectedRevenue = calculatedCollectedRevenue.compareTo(BigDecimal.ZERO) > 0 ? calculatedCollectedRevenue : totalRevenue;
        analytics.put("totalRevenue", collectedRevenue);
        analytics.put("realizedRevenue", collectedRevenue);
        analytics.put("collectedRevenue", collectedRevenue);
        analytics.put("totalGrossSales", totalGrossSales);
        analytics.put("pendingReceivables", pendingCodAmount);
        analytics.put("pendingCodAmount", pendingCodAmount);
        analytics.put("pendingCodOrders", pendingCodOrders);
        analytics.put("collectedCodAmount", collectedCodAmount);
        analytics.put("collectedCodOrders", collectedCodOrders);
        analytics.put("onlineCollectedAmount", onlineCollectedAmount);
        analytics.put("onlineOrders", onlineOrders);
        analytics.put("codSettlement", codSettlement);
        analytics.put("completedOrders", completedOrders);
        analytics.put("inProgressOrders", inProgressOrders);
        analytics.put("cancelledOrders", cancelledOrders);
        analytics.put("cancellationRate", cancellationRate);
        analytics.put("averageOrderValue", lifetimeAov);

        analytics.put("periodRevenue", periodRevenue);
        analytics.put("periodOrders", periodOrders);
        analytics.put("periodDailyAverage", periodDailyAverage);
        analytics.put("peakDay", peakDay);
        analytics.put("peakDate", peakDate);
        analytics.put("peakAmount", peakAmount);

        analytics.put("dailyData", dailyData);
        analytics.put("salesByDay", salesByDay);

        analytics.put("topSellingProducts", topSellingProducts);
        analytics.put("topProductsDetails", topProductsDetails);
        analytics.put("paymentBreakdown", paymentBreakdown);

        analytics.put("totalCoupons", totalCoupons);
        analytics.put("activeCoupons", activeCoupons);
        analytics.put("totalDiscountGranted", totalDiscountGranted);
        analytics.put("totalCouponOrders", totalCouponOrders);
        analytics.put("couponUtilizationRate", couponUtilizationRate);

        return analytics;
    }
}
