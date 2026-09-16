package com.cakeplatform.api.modules.location.exception;

import lombok.Getter;

import java.util.Collections;
import java.util.Map;

@Getter
public class InvalidLocationException extends RuntimeException {
    private final Map<String, String> fieldErrors;

    public InvalidLocationException(String message) {
        super(message);
        this.fieldErrors = Collections.emptyMap();
    }

    public InvalidLocationException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors != null ? fieldErrors : Collections.emptyMap();
    }
}
