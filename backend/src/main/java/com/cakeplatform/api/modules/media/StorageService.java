package com.cakeplatform.api.modules.media;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    String storeFile(MultipartFile file, String subDirectory);
    Resource loadFileAsResource(String fileName, String subDirectory);
    boolean deleteFileByUrl(String fileUrl);
    
    default String generateSignedUrl(String fileUrl) {
        return fileUrl; // Default implementation returns raw URL for local storage
    }
}
