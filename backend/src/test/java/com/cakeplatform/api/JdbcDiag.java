package com.cakeplatform.api;
import java.sql.*;
public class JdbcDiag {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://psql-cakestore-prod.postgres.database.azure.com:5432/cake_platform?sslmode=require";
        System.out.println("Testing preferIPv6Addresses=true");
        System.setProperty("java.net.preferIPv6Addresses", "true");
        long start = System.currentTimeMillis();
        try {
            DriverManager.getConnection(url, "cakestoreadmin", "dummy");
        } catch(Exception e) {
            System.out.println("Time: " + (System.currentTimeMillis() - start) + "ms");
            System.out.println("Exception: " + e.getMessage());
        }
    }
}
