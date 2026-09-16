package com.cakeplatform.api.modules.location.exception;

public class LocationServiceUnavailableException extends RuntimeException {
    public LocationServiceUnavailableException(String message) {
        super(message);
    }
}
