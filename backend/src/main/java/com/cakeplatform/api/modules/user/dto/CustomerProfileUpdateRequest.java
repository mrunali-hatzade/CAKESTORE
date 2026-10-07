package com.cakeplatform.api.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CustomerProfileUpdateRequest {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @Email(message = "Invalid email format")
    private String email;
}
