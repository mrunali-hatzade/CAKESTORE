package com.cakeplatform.api;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.List;
import java.util.Map;

@Component
@org.springframework.context.annotation.Profile("!prod")
public class DebugRunner implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        System.out.println("================ DEBUG INFO ================");
        List<Map<String, Object>> shops = jdbcTemplate.queryForList("SELECT id, owner_id, business_name FROM shops");
        System.out.println("SHOPS: " + shops);
        
        List<Map<String, Object>> users = jdbcTemplate.queryForList("SELECT id, email, role FROM users");
        System.out.println("USERS: " + users);

        List<Map<String, Object>> orders = jdbcTemplate.queryForList("SELECT id, shop_id, customer_email FROM orders");
        System.out.println("ORDERS: " + orders);
        System.out.println("============================================");
    }
}
