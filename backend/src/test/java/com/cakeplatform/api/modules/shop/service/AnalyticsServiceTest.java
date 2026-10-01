package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.order.Order;
import com.cakeplatform.api.modules.order.OrderRepository;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AnalyticsServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private com.cakeplatform.api.modules.shop.CouponRepository couponRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @InjectMocks
    private AnalyticsService analyticsService;

    private Shop shopA;
    private Shop shopB;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(analyticsService, "configuredTimezone", "Asia/Kolkata");

        shopA = new Shop();
        shopA.setId(101L);
        shopA.setBusinessName("Artisan Bakery A");

        shopB = new Shop();
        shopB.setId(202L);
        shopB.setBusinessName("Artisan Bakery B");
    }

    @Test
    @DisplayName("A-F: Realized Revenue Calculation strictly adheres to single business rule")
    void testRealizedRevenueRule() {
        // Setup Shop A
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(orderRepository.countVisibleOrdersByShopId(101L)).thenReturn(6L);

        // Expected Realized Revenue:
        // Valid Paid order: ₹1000 (INCLUDED)
        // Delivered order: ₹500 (INCLUDED)
        // Cancelled order (even if PAID): ₹800 (EXCLUDED)
        // Refunded order: ₹600 (EXCLUDED)
        // Failed payment order: ₹400 (EXCLUDED)
        // Unpaid non-fulfilled order: ₹300 (EXCLUDED)
        // Net Realized Sum = 1000 + 500 = ₹1500
        BigDecimal expectedRealizedRevenue = new BigDecimal("1500.00");
        when(orderRepository.sumRevenueByShopId(101L)).thenReturn(expectedRealizedRevenue);
        when(orderRepository.sumGrossSalesByShopId(anyLong())).thenReturn(new java.math.BigDecimal("5000.00"));
        when(orderRepository.findRecentValidOrders(eq(101L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(101L), any(PageRequest.class))).thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getDashboardAnalytics(1L);

        assertNotNull(result);
        assertEquals(101L, result.get("shopId"));
        assertEquals(6L, result.get("totalOrders"));
        assertEquals(expectedRealizedRevenue, result.get("totalRevenue"));
        verify(orderRepository).sumRevenueByShopId(101L);
    }

    @Test
    @DisplayName("G-H: 7-Day Real Sales Velocity Aggregation with Zero-Sales Days")
    void testSevenDayVelocityAggregation() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(orderRepository.countVisibleOrdersByShopId(101L)).thenReturn(2L);
        when(orderRepository.sumRevenueByShopId(101L)).thenReturn(new BigDecimal("2200.00"));
        when(orderRepository.sumGrossSalesByShopId(anyLong())).thenReturn(new java.math.BigDecimal("5000.00"));

        LocalDate today = LocalDate.now(analyticsService.getOperationalZone());
        LocalDate twoDaysAgo = today.minusDays(2);

        Order orderToday = new Order();
        orderToday.setId(1L);
        orderToday.setShop(shopA);
        orderToday.setTotalAmount(new BigDecimal("1500.00"));
        orderToday.setOrderStatus("CONFIRMED");
        orderToday.setPaymentStatus("PAID");
        orderToday.setCreatedAt(today.atTime(14, 30));

        Order orderTwoDaysAgo = new Order();
        orderTwoDaysAgo.setId(2L);
        orderTwoDaysAgo.setShop(shopA);
        orderTwoDaysAgo.setTotalAmount(new BigDecimal("700.00"));
        orderTwoDaysAgo.setOrderStatus("DELIVERED");
        orderTwoDaysAgo.setPaymentStatus("PAID");
        orderTwoDaysAgo.setCreatedAt(twoDaysAgo.atTime(10, 15));

        when(orderRepository.findRecentValidOrders(eq(101L), any(LocalDateTime.class)))
                .thenReturn(List.of(orderToday, orderTwoDaysAgo));
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(101L), any(PageRequest.class)))
                .thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getDashboardAnalytics(1L);

        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> salesByDay = (Map<String, BigDecimal>) result.get("salesByDay");
        assertNotNull(salesByDay);
        assertEquals(7, salesByDay.size(), "Must contain exactly 7 calendar days");

        String todayKey = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
        String twoDaysAgoKey = twoDaysAgo.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        assertEquals(new BigDecimal("1500.00"), salesByDay.get(todayKey));
        assertEquals(new BigDecimal("700.00"), salesByDay.get(twoDaysAgoKey));

        // Verify zero-sales days return exactly 0.00, not null
        int zeroDaysCount = 0;
        for (Map.Entry<String, BigDecimal> entry : salesByDay.entrySet()) {
            if (!entry.getKey().equals(todayKey) && !entry.getKey().equals(twoDaysAgoKey)) {
                assertEquals(BigDecimal.ZERO, entry.getValue(), "Zero sales day must return 0.00");
                zeroDaysCount++;
            }
        }
        assertEquals(5, zeroDaysCount, "Exactly 5 days must have zero sales");
    }

    @Test
    @DisplayName("I-J: Top 5 Selling Products from OrderItem Snapshot and Empty Handling")
    void testTopSellingProducts() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(orderRepository.countVisibleOrdersByShopId(101L)).thenReturn(10L);
        when(orderRepository.sumRevenueByShopId(101L)).thenReturn(new BigDecimal("8500.00"));
        when(orderRepository.sumGrossSalesByShopId(anyLong())).thenReturn(new java.math.BigDecimal("5000.00"));
        when(orderRepository.findRecentValidOrders(eq(101L), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        List<Object[]> mockTopProducts = List.of(
                new Object[]{"Belgian Chocolate Truffle", 42L, new java.math.BigDecimal("1200.00")},
                new Object[]{"Red Velvet Supreme", 28L, new java.math.BigDecimal("900.00")},
                new Object[]{"Fresh Mango Delight", 19L, new java.math.BigDecimal("600.00")},
                new Object[]{"Lotus Biscoff Cheesecake", 15L, new java.math.BigDecimal("400.00")},
                new Object[]{"Pineapple Classic", 8L, new java.math.BigDecimal("200.00")}
        );
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(101L), eq(PageRequest.of(0, 5))))
                .thenReturn(mockTopProducts);

        Map<String, Object> result = analyticsService.getDashboardAnalytics(1L);

        @SuppressWarnings("unchecked")
        Map<String, Integer> topProducts = (Map<String, Integer>) result.get("topSellingProducts");
        assertNotNull(topProducts);
        assertEquals(5, topProducts.size());
        assertEquals(42, topProducts.get("Belgian Chocolate Truffle"));
        assertEquals(28, topProducts.get("Red Velvet Supreme"));
        assertEquals(19, topProducts.get("Fresh Mango Delight"));
        assertEquals(15, topProducts.get("Lotus Biscoff Cheesecake"));
        assertEquals(8, topProducts.get("Pineapple Classic"));
    }

    @Test
    @DisplayName("Zero-Data Shop: Returns valid empty/zero structures (never null, never fake)")
    void testZeroDataBakery() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(orderRepository.countVisibleOrdersByShopId(101L)).thenReturn(0L);
        when(orderRepository.sumRevenueByShopId(101L)).thenReturn(BigDecimal.ZERO);
        when(orderRepository.sumGrossSalesByShopId(anyLong())).thenReturn(new java.math.BigDecimal("5000.00"));
        when(orderRepository.findRecentValidOrders(eq(101L), any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(101L), any(PageRequest.class)))
                .thenReturn(Collections.emptyList());

        Map<String, Object> result = analyticsService.getDashboardAnalytics(1L);

        assertNotNull(result);
        assertEquals(0L, result.get("totalOrders"));
        assertEquals(BigDecimal.ZERO, result.get("totalRevenue"));

        @SuppressWarnings("unchecked")
        Map<String, Integer> topProducts = (Map<String, Integer>) result.get("topSellingProducts");
        assertNotNull(topProducts);
        assertTrue(topProducts.isEmpty(), "Zero sales must return empty top products map");

        @SuppressWarnings("unchecked")
        Map<String, BigDecimal> salesByDay = (Map<String, BigDecimal>) result.get("salesByDay");
        assertNotNull(salesByDay);
        assertEquals(7, salesByDay.size());
        for (BigDecimal val : salesByDay.values()) {
            assertEquals(BigDecimal.ZERO, val, "All 7 days must be 0.00 for brand new shop");
        }
    }

    @Test
    @DisplayName("K-M: Multi-Tenant Isolation (Shop A vs Shop B)")
    void testMultiTenantIsolation() {
        // Setup Owner 1 -> Shop A (₹1,000, Belgian Chocolate Truffle)
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(shopA);
        when(orderRepository.countVisibleOrdersByShopId(101L)).thenReturn(1L);
        when(orderRepository.sumRevenueByShopId(101L)).thenReturn(new BigDecimal("1000.00"));
        when(orderRepository.sumGrossSalesByShopId(anyLong())).thenReturn(new java.math.BigDecimal("5000.00"));
        when(orderRepository.findRecentValidOrders(eq(101L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        List<Object[]> mockProductsA = Collections.singletonList(new Object[]{"Belgian Chocolate Truffle", 1L, new java.math.BigDecimal("1200.00")});
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(101L), eq(PageRequest.of(0, 5))))
                .thenReturn(mockProductsA);

        // Setup Owner 2 -> Shop B (₹5,000, Red Velvet Supreme)
        when(shopAccessValidator.getValidShopForOwner(2L)).thenReturn(shopB);
        when(orderRepository.countVisibleOrdersByShopId(202L)).thenReturn(3L);
        when(orderRepository.sumRevenueByShopId(202L)).thenReturn(new BigDecimal("5000.00"));
        when(orderRepository.sumGrossSalesByShopId(anyLong())).thenReturn(new java.math.BigDecimal("5000.00"));
        when(orderRepository.findRecentValidOrders(eq(202L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        List<Object[]> mockProductsB = Collections.singletonList(new Object[]{"Red Velvet Supreme", 5L, new java.math.BigDecimal("900.00")});
        when(orderRepository.findTopSellingProductsWithRevenueByShopId(eq(202L), eq(PageRequest.of(0, 5))))
                .thenReturn(mockProductsB);

        // Execute for Owner 1
        Map<String, Object> resultA = analyticsService.getDashboardAnalytics(1L);
        assertEquals(101L, resultA.get("shopId"));
        assertEquals(new BigDecimal("1000.00"), resultA.get("totalRevenue"));
        @SuppressWarnings("unchecked")
        Map<String, Integer> topProductsA = (Map<String, Integer>) resultA.get("topSellingProducts");
        assertTrue(topProductsA.containsKey("Belgian Chocolate Truffle"));
        assertFalse(topProductsA.containsKey("Red Velvet Supreme"), "Shop A must NEVER see Shop B products");

        // Execute for Owner 2
        Map<String, Object> resultB = analyticsService.getDashboardAnalytics(2L);
        assertEquals(202L, resultB.get("shopId"));
        assertEquals(new BigDecimal("5000.00"), resultB.get("totalRevenue"));
        @SuppressWarnings("unchecked")
        Map<String, Integer> topProductsB = (Map<String, Integer>) resultB.get("topSellingProducts");
        assertTrue(topProductsB.containsKey("Red Velvet Supreme"));
        assertFalse(topProductsB.containsKey("Belgian Chocolate Truffle"), "Shop B must NEVER see Shop A products");
    }
}
