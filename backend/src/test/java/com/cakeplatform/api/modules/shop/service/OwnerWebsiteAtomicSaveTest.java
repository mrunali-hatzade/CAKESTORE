package com.cakeplatform.api.modules.shop.service;

import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.shop.ShopDeliveryConfig;
import com.cakeplatform.api.modules.shop.ShopStorefrontSettings;
import com.cakeplatform.api.modules.shop.dto.ShopDeliveryConfigRequest;
import com.cakeplatform.api.modules.shop.dto.ShopStorefrontSettingsRequest;
import com.cakeplatform.api.modules.shop.dto.UpdateShopRequest;
import com.cakeplatform.api.modules.shop.dto.WebsiteConfigurationRequest;
import com.cakeplatform.api.modules.shop.ShopRepository;
import com.cakeplatform.api.modules.shop.ShopDeliveryConfigRepository;
import com.cakeplatform.api.modules.shop.ShopStorefrontSettingsRepository;
import com.cakeplatform.api.modules.subscription.Subscription;
import com.cakeplatform.api.modules.subscription.SubscriptionRepository;
import com.cakeplatform.api.modules.subscription.SubscriptionStatus;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest
@ActiveProfiles("test")
public class OwnerWebsiteAtomicSaveTest {

    @Autowired
    private OwnerStorefrontService ownerStorefrontService;

    @Autowired
    private ShopRepository shopRepository;

    @Autowired
    private ShopDeliveryConfigRepository deliveryRepo;

    @Autowired
    private ShopStorefrontSettingsRepository settingsRepo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    private User testOwner;
    private Shop testShop;

    @BeforeEach
    void setUp() {
        // Create an owner
        testOwner = new User();
        testOwner.setFullName("Atomic Save Owner");
        testOwner.setEmail("atomic@example.com_" + System.currentTimeMillis());
        testOwner.setMobile("9876543210_" + System.currentTimeMillis());
        testOwner.setPasswordHash("hash");
        testOwner.setRole(com.cakeplatform.api.modules.user.UserRole.SHOP_OWNER);
        testOwner.setStatus(com.cakeplatform.api.modules.user.UserStatus.ACTIVE);
        testOwner = userRepository.save(testOwner);

        // Create a shop
        testShop = new Shop();
        testShop.setOwner(testOwner);
        testShop.setBusinessName("Old Business Name");
        testShop.setPhone("1111111111");
        testShop.setStatus(com.cakeplatform.api.modules.shop.ShopStatus.ACTIVE);
        testShop.setAddress("Old Address");
        testShop.setCity("Old City");
        testShop.setState("Old State");
        testShop.setPincode("111111");
        testShop = shopRepository.save(testShop);

        // Create initial config
        ShopDeliveryConfig delivery = new ShopDeliveryConfig();
        delivery.setShop(testShop);
        delivery.setDeliveryChargeType("FIXED");
        delivery.setFixedChargeAmount(BigDecimal.valueOf(50));
        deliveryRepo.save(delivery);

        // Create initial settings
        ShopStorefrontSettings settings = new ShopStorefrontSettings();
        settings.setShop(testShop);
        settings.setHeroBannerEnabled(false);
        settingsRepo.save(settings);

        // Add subscription
        Subscription subscription = new Subscription();
        subscription.setShop(testShop);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setAmount(BigDecimal.valueOf(100));
        subscription.setStartDate(LocalDateTime.now().minusDays(1));
        subscription.setExpiryDate(LocalDateTime.now().plusMonths(1));
        subscriptionRepository.save(subscription);
    }

    @Test
    void shouldRollbackAllIfValidationFailsInAnyStep() {
        WebsiteConfigurationRequest request = new WebsiteConfigurationRequest();

        UpdateShopRequest shopReq = new UpdateShopRequest();
        shopReq.setBusinessName("New Business Name");
        shopReq.setState("INVALID_STATE"); // Assuming this causes location validation failure
        shopReq.setCity("INVALID_CITY");
        shopReq.setPincode("999999");
        request.setShopProfile(shopReq);

        ShopDeliveryConfigRequest delReq = new ShopDeliveryConfigRequest();
        delReq.setDeliveryChargeType("FIXED");
        delReq.setFixedChargeAmount(BigDecimal.valueOf(100)); // New value
        request.setDeliveryConfig(delReq);

        ShopStorefrontSettingsRequest setReq = new ShopStorefrontSettingsRequest();
        setReq.setHeroBannerEnabled(true); // New value
        setReq.setTopRatedEnabled(true);
        setReq.setReviewsEnabled(true);
        setReq.setBakeryInfoEnabled(true);
        setReq.setCategoriesEnabled(true);
        setReq.setFiltersEnabled(true);
        setReq.setRatingsEnabled(true);
        setReq.setAboutStoryEnabled(true);
        setReq.setAboutImageEnabled(true);
        setReq.setFulfillmentEnabled(true);
        setReq.setLeadTimeDays(2);
        setReq.setCustomCakesEnabled(true);
        setReq.setWhatsappEnabled(true);
        setReq.setPhoneEnabled(true);
        setReq.setEmailEnabled(true);
        setReq.setAddressEnabled(true);
        setReq.setMapEnabled(true);
        setReq.setBusinessHoursEnabled(true);
        request.setStorefrontSettings(setReq);

        assertThrows(Exception.class, () -> 
            ownerStorefrontService.saveWebsiteConfiguration(testOwner.getId(), request)
        );

        // Verify Rollback
        Shop shopAfter = shopRepository.findById(testShop.getId()).get();
        assertThat(shopAfter.getBusinessName()).isEqualTo("Old Business Name");

        ShopDeliveryConfig delAfter = deliveryRepo.findByShopId(testShop.getId()).get();
        assertThat(delAfter.getFixedChargeAmount().compareTo(BigDecimal.valueOf(50))).isEqualTo(0);

        ShopStorefrontSettings setAfter = settingsRepo.findByShopId(testShop.getId()).get();
        assertThat(setAfter.getHeroBannerEnabled()).isFalse();
    }

    @Test
    void shouldSaveSuccessfullyWhenAllValid() {
        WebsiteConfigurationRequest request = new WebsiteConfigurationRequest();

        UpdateShopRequest shopReq = new UpdateShopRequest();
        shopReq.setBusinessName("New Valid Name");
        request.setShopProfile(shopReq);

        ShopDeliveryConfigRequest delReq = new ShopDeliveryConfigRequest();
        delReq.setDeliveryChargeType("FREE");
        delReq.setFixedChargeAmount(BigDecimal.ZERO);
        request.setDeliveryConfig(delReq);

        ShopStorefrontSettingsRequest setReq = new ShopStorefrontSettingsRequest();
        setReq.setHeroBannerEnabled(true);
        setReq.setTopRatedEnabled(true);
        setReq.setReviewsEnabled(true);
        setReq.setBakeryInfoEnabled(true);
        setReq.setCategoriesEnabled(true);
        setReq.setFiltersEnabled(true);
        setReq.setRatingsEnabled(true);
        setReq.setAboutStoryEnabled(true);
        setReq.setAboutImageEnabled(true);
        setReq.setFulfillmentEnabled(true);
        setReq.setLeadTimeDays(2);
        setReq.setCustomCakesEnabled(true);
        setReq.setWhatsappEnabled(true);
        setReq.setPhoneEnabled(true);
        setReq.setEmailEnabled(true);
        setReq.setAddressEnabled(true);
        setReq.setMapEnabled(true);
        setReq.setBusinessHoursEnabled(true);
        request.setStorefrontSettings(setReq);

        ownerStorefrontService.saveWebsiteConfiguration(testOwner.getId(), request);

        // Verify Saved
        Shop shopAfter = shopRepository.findById(testShop.getId()).get();
        assertThat(shopAfter.getBusinessName()).isEqualTo("New Valid Name");

        ShopDeliveryConfig delAfter = deliveryRepo.findByShopId(testShop.getId()).get();
        assertThat(delAfter.getDeliveryChargeType()).isEqualTo("FREE");

        ShopStorefrontSettings setAfter = settingsRepo.findByShopId(testShop.getId()).get();
        assertThat(setAfter.getHeroBannerEnabled()).isTrue();
    }
}
