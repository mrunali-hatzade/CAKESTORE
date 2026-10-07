package com.cakeplatform.api.modules.order;

public enum OrderStatus {
    NEW,
    PENDING_PAYMENT,
    PAID,
    PAYMENT_FAILED,
    CANCELLED,
    COMPLETED,
    PREPARING,
    READY
}
