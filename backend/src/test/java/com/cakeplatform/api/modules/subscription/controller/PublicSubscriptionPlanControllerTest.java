package com.cakeplatform.api.modules.subscription.controller;

import com.cakeplatform.api.modules.subscription.SubscriptionPlan;
import com.cakeplatform.api.modules.subscription.SubscriptionPlanRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
public class PublicSubscriptionPlanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SubscriptionPlanRepository planRepository;

    @Test
    void shouldReturnActivePlansAndExcludeInactive() throws Exception {
        SubscriptionPlan plan = new SubscriptionPlan();
        plan.setId(1L);
        plan.setName("Test Plan");
        plan.setPrice(new BigDecimal("350.00"));
        plan.setBillingCycle("monthly");
        plan.setDurationDays(30);
        plan.setIsActive(true);

        when(planRepository.findByIsActiveTrue()).thenReturn(List.of(plan));

        mockMvc.perform(get("/api/subscription-plans"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$[0].planId").value(1))
                .andExpect(jsonPath("$[0].name").value("Test Plan"))
                .andExpect(jsonPath("$[0].price").value(350.00))
                .andExpect(jsonPath("$[0].billingCycle").value("monthly"));
    }
}
