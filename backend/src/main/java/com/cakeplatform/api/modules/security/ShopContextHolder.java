package com.cakeplatform.api.modules.security;

public class ShopContextHolder {
    private static final ThreadLocal<Long> CONTEXT = new ThreadLocal<>();

    public static void setShopId(Long shopId) {
        CONTEXT.set(shopId);
    }

    public static Long getShopId() {
        return CONTEXT.get();
    }

    public static void clear() {
        CONTEXT.remove();
    }
}
