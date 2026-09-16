package com.cakeplatform.api.modules.media;

import com.cloudinary.Cloudinary;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "cloudinary")
public class CloudinaryUploadServiceImpl implements StorageService {

    private final Cloudinary cloudinary;

    public CloudinaryUploadServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory) {
        try {
            Map<String, Object> params = new HashMap<>();
            String env = "prod"; 
            String folder = "cakestore/" + env + "/" + (subDirectory != null ? subDirectory : "misc");
            params.put("folder", folder);
            
            if ("documents".equalsIgnoreCase(subDirectory) || "verifications".equalsIgnoreCase(subDirectory)) {
                params.put("type", "authenticated");
            }

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), params);
            return uploadResult.get("secure_url").toString();
        } catch (IOException e) {
            throw new RuntimeException("Could not store file to Cloudinary. Please try again!", e);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileName, String subDirectory) {
        throw new UnsupportedOperationException("loadFileAsResource is not supported in Cloudinary mode.");
    }

    @Override
    public boolean deleteFileByUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains("res.cloudinary.com")) {
            return false;
        }
        try {
            int uploadIdx = fileUrl.indexOf("/upload/");
            if (uploadIdx == -1) return false;
            
            String pathWithoutUpload = fileUrl.substring(uploadIdx + 8);
            int firstSlash = pathWithoutUpload.indexOf("/");
            if (firstSlash == -1) return false;
            
            String publicIdWithExtension = pathWithoutUpload.substring(firstSlash + 1);
            int lastDot = publicIdWithExtension.lastIndexOf(".");
            String publicId = lastDot != -1 ? publicIdWithExtension.substring(0, lastDot) : publicIdWithExtension;

            Map<String, Object> params = new HashMap<>();
            if (publicId.contains("/documents/") || publicId.contains("/verifications/")) {
                params.put("type", "authenticated");
            }

            Map result = cloudinary.uploader().destroy(publicId, params);
            return "ok".equals(result.get("result"));
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String generateSignedUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains("res.cloudinary.com") || !fileUrl.contains("/authenticated/")) {
            return fileUrl;
        }
        try {
            int uploadIdx = fileUrl.indexOf("/upload/");
            if (uploadIdx == -1) return fileUrl;
            
            String pathWithoutUpload = fileUrl.substring(uploadIdx + 8);
            int firstSlash = pathWithoutUpload.indexOf("/");
            if (firstSlash == -1) return fileUrl;
            
            String publicIdWithExtension = pathWithoutUpload.substring(firstSlash + 1);
            int lastDot = publicIdWithExtension.lastIndexOf(".");
            String publicId = lastDot != -1 ? publicIdWithExtension.substring(0, lastDot) : publicIdWithExtension;

            // Generate a time-limited signed URL for viewing
            return cloudinary.url()
                .resourceType("image")
                .type("authenticated")
                .signed(true)
                .generate(publicIdWithExtension);
        } catch (Exception e) {
            return fileUrl;
        }
    }
}
