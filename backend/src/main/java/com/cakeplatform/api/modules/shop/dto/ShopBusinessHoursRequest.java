package com.cakeplatform.api.modules.shop.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class ShopBusinessHoursRequest {
    @NotBlank
    private String dayOfWeek;
    @NotNull
    private Boolean isOpen;
    @NotNull
    private LocalTime openTime;
    @NotNull
    private LocalTime closeTime;
}
