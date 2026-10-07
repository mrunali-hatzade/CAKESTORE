package com.cakeplatform.api.modules.user.dto;

import lombok.Data;

@Data
public class CustomerProfileResponse {
    private Long id;
    private String fullName;
    private String email;
    private String mobile;
}
