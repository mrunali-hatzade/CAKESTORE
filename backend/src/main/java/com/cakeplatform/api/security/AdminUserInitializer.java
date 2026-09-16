package com.cakeplatform.api.security;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopStatus;
import com.cakeplatform.api.modules.shop.VerificationStatus;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionStatus;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@org.springframework.context.annotation.Profile("!prod")
@RequiredArgsConstructor
@Slf4j
public class AdminUserInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.default-email:admin@cakeplatform.com}")
    private String adminEmail;

    @Value("${app.admin.default-password:Password123!}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        // 1. Initialize default admin if not present, or elevate to ADMIN role
        User adminUser = userRepository.findByEmail(adminEmail).orElse(null);
        if (adminUser == null) {
            log.info("No ADMIN user found for {}. Bootstrapping platform administrator.", adminEmail);
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setFullName("Platform Administrator");
            admin.setRole(UserRole.ADMIN);
            admin.setStatus(UserStatus.ACTIVE);
            userRepository.save(admin);
            log.info("Platform administrator account initialized successfully.");
        } else if (adminUser.getRole() != UserRole.ADMIN) {
            log.info("Elevating existing user {} to ADMIN role.", adminEmail);
            adminUser.setRole(UserRole.ADMIN);
            adminUser.setPasswordHash(passwordEncoder.encode(adminPassword));
            userRepository.save(adminUser);
            log.info("Platform administrator role and credentials synchronized.");
        }

        // 2. Initialize frontend demo admin (admin@cakestore.com / admin123) for Quick Test Autofill
        if (userRepository.findByEmail("admin@cakestore.com").isEmpty()) {
            log.info("Bootstrapping demo administrator for Quick Test Autofill: admin@cakestore.com");
            User demoAdmin = new User();
            demoAdmin.setEmail("admin@cakestore.com");
            demoAdmin.setPasswordHash(passwordEncoder.encode("admin123"));
            demoAdmin.setFullName("Demo Administrator");
            demoAdmin.setRole(UserRole.ADMIN);
            demoAdmin.setStatus(UserStatus.ACTIVE);
            userRepository.save(demoAdmin);
        }

        // 3. Initialize frontend demo owner (owner@sweetdelight.com / password123) for Quick Test Autofill
        if (userRepository.findByEmail("owner@sweetdelight.com").isEmpty()) {
            log.info("Bootstrapping demo bakery owner for Quick Test Autofill: owner@sweetdelight.com");
            User demoOwner = new User();
            demoOwner.setEmail("owner@sweetdelight.com");
            demoOwner.setPasswordHash(passwordEncoder.encode("password123"));
            demoOwner.setFullName("Sweet Delight Owner");
            demoOwner.setMobile("9876543210");
            demoOwner.setRole(UserRole.SHOP_OWNER);
            demoOwner.setStatus(UserStatus.ACTIVE);
            User savedOwner = userRepository.save(demoOwner);

            Shop shop = new Shop();
            shop.setOwner(savedOwner);
            shop.setBusinessName("Sweet Delight Bakery");
            shop.setEmail("owner@sweetdelight.com");
            shop.setPhone("9876543210");
            shop.setDescription("Artisanal handcrafted cakes and confectionery");
            shop.setCity("Mumbai");
            shop.setState("Maharashtra");
            shop.setPincode("400001");
            shop.setStatus(ShopStatus.ACTIVE);
            shop.setVerificationStatus(VerificationStatus.VERIFIED);
            Shop savedShop = shopRepository.save(shop);

            Subscription subscription = new Subscription();
            subscription.setShop(savedShop);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setAmount(new BigDecimal("999.00"));
            subscription.setStartDate(LocalDateTime.now());
            subscription.setExpiryDate(LocalDateTime.now().plusMonths(1));
            subscriptionRepository.save(subscription);
            log.info("Demo bakery owner and shop initialized successfully.");
        }

        // 4. Initialize or update user's own account (mrunalithatzade20@gmail.com / password123)
        User personalUser = userRepository.findByEmail("mrunalithatzade20@gmail.com").orElse(null);
        if (personalUser == null) {
            log.info("Bootstrapping personal owner account: mrunalithatzade20@gmail.com");
            User newUser = new User();
            newUser.setEmail("mrunalithatzade20@gmail.com");
            newUser.setPasswordHash(passwordEncoder.encode("password123"));
            newUser.setFullName("Mrunali");
            newUser.setMobile("9876543211");
            newUser.setRole(UserRole.SHOP_OWNER);
            newUser.setStatus(UserStatus.ACTIVE);
            User savedOwner = userRepository.save(newUser);

            Shop shop = new Shop();
            shop.setOwner(savedOwner);
            shop.setBusinessName("Mrunali's Artisanal Bakery");
            shop.setEmail("mrunalithatzade20@gmail.com");
            shop.setPhone("9876543211");
            shop.setDescription("Handcrafted custom cakes & bakery delicacies");
            shop.setCity("Pune");
            shop.setState("Maharashtra");
            shop.setPincode("411001");
            shop.setStatus(ShopStatus.ACTIVE);
            shop.setVerificationStatus(VerificationStatus.VERIFIED);
            Shop savedShop = shopRepository.save(shop);

            Subscription subscription = new Subscription();
            subscription.setShop(savedShop);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setAmount(new BigDecimal("999.00"));
            subscription.setStartDate(LocalDateTime.now());
            subscription.setExpiryDate(LocalDateTime.now().plusMonths(1));
            subscriptionRepository.save(subscription);
            log.info("Personal bakery account initialized successfully.");
        } else {
            personalUser.setPasswordHash(passwordEncoder.encode("password123"));
            personalUser.setStatus(UserStatus.ACTIVE);
            userRepository.save(personalUser);
            log.info("Personal bakery account password refreshed to 'password123'.");
        }
    }
}
