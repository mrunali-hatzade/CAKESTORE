package com.cakeplatform.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;

// Debug utility - not a Spring Boot Application
public class DatabaseInspector {
    public static void main(String[] args) {
        ApplicationContext context = SpringApplication.run(DatabaseInspector.class, args);
        JdbcTemplate jdbcTemplate = context.getBean(JdbcTemplate.class);
        
        System.out.println("=== INSPECTING subscription_plans ===");
        List<Map<String, Object>> plans = jdbcTemplate.queryForList("SELECT * FROM subscription_plans");
        System.out.println("Total plans: " + plans.size());
        plans.forEach(System.out::println);

        System.out.println("=== INSPECTING subscriptions ===");
        List<Map<String, Object>> subs = jdbcTemplate.queryForList("SELECT id, shop_id, plan_id, amount, status FROM subscriptions LIMIT 5");
        System.out.println("Sample subscriptions: " + subs.size());
        subs.forEach(System.out::println);

        System.out.println("=== INSPECTING payments ===");
        List<Map<String, Object>> payments = jdbcTemplate.queryForList("SELECT id, shop_id, subscription_id, amount, status FROM payments LIMIT 5");
        System.out.println("Sample payments: " + payments.size());
        payments.forEach(System.out::println);

        System.exit(0);
    }
}
