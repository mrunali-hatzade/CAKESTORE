import java.net.*;
import java.sql.*;

public class NetworkDiag {
    public static void main(String[] args) {
        String host = "psql-cakestore-prod.postgres.database.azure.com";
        String url = "jdbc:postgresql://" + host + ":5432/cake_platform?sslmode=require";
        
        System.out.println("### Java DNS");
        try {
            InetAddress[] addrs = InetAddress.getAllByName(host);
            System.out.println("Addresses returned: " + addrs.length);
            for (InetAddress a : addrs) {
                System.out.println("- " + a.getHostAddress() + " (IPv4=" + (a instanceof Inet4Address) + ", IPv6=" + (a instanceof Inet6Address) + ")");
            }
        } catch(Exception e) { e.printStackTrace(); }

        System.out.println("\n### Raw TCP");
        System.out.println("IPv4:");
        System.setProperty("java.net.preferIPv4Stack", "true");
        testTcp(host);

        System.out.println("IPv6:");
        System.setProperty("java.net.preferIPv4Stack", "false");
        System.setProperty("java.net.preferIPv6Addresses", "true");
        testTcp(host);

        System.out.println("\n### JDBC");
        System.out.println("Normal JVM:");
        System.setProperty("java.net.preferIPv4Stack", "false");
        System.setProperty("java.net.preferIPv6Addresses", "false");
        testJdbc(url);

        System.out.println("preferIPv4Stack=true:");
        System.setProperty("java.net.preferIPv4Stack", "true");
        testJdbc(url);

        System.out.println("preferIPv6Addresses=true:");
        System.setProperty("java.net.preferIPv4Stack", "false");
        System.setProperty("java.net.preferIPv6Addresses", "true");
        testJdbc(url);
    }
    
    private static void testTcp(String host) {
        try {
            InetAddress[] addrs = InetAddress.getAllByName(host);
            for (InetAddress addr : addrs) {
                long start = System.currentTimeMillis();
                try (Socket s = new Socket()) {
                    s.connect(new InetSocketAddress(addr, 5432), 5000);
                    System.out.println("  SUCCESS to " + addr.getHostAddress() + " in " + (System.currentTimeMillis() - start) + "ms");
                } catch(Exception e) {
                    System.out.println("  FAIL to " + addr.getHostAddress() + " in " + (System.currentTimeMillis() - start) + "ms (" + e.getClass().getSimpleName() + ")");
                }
            }
        } catch(Exception e) {}
    }

    private static void testJdbc(String url) {
        long start = System.currentTimeMillis();
        try {
            DriverManager.getConnection(url, "cakestoreadmin", "dummy_pass");
            System.out.println("  SUCCESS");
        } catch(Exception e) {
            System.out.println("  FAIL in " + (System.currentTimeMillis() - start) + "ms: " + e.getMessage());
        }
    }
}
