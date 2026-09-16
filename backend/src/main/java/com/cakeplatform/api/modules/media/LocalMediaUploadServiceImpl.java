package com.cakeplatform.api.modules.media;

import com.cakeplatform.api.config.FileStorageProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalMediaUploadServiceImpl implements StorageService {

    private final Path fileStorageLocation;

    @Autowired
    public LocalMediaUploadServiceImpl(FileStorageProperties fileStorageProperties) {
        this.fileStorageLocation = Paths.get(fileStorageProperties.getUploadDir())
                .toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public String storeFile(MultipartFile file, String subDirectory) {
        // Normalize file name
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = "";
        
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalFileName.substring(dotIndex);
        }
        
        String fileName = UUID.randomUUID().toString() + extension;

        try {
            // Check if the file's name or subdirectory contains invalid characters
            if (fileName.contains("..")) {
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + fileName);
            }
            if (subDirectory != null && (subDirectory.contains("..") || subDirectory.contains("/") || subDirectory.contains("\\"))) {
                throw new IllegalArgumentException("Invalid subdirectory path sequence: " + subDirectory);
            }

            Path targetLocation = this.fileStorageLocation;
            if (subDirectory != null && !subDirectory.isEmpty()) {
                targetLocation = this.fileStorageLocation.resolve(subDirectory).normalize();
                if (!targetLocation.startsWith(this.fileStorageLocation)) {
                    throw new SecurityException("Path traversal attempt detected in subdirectory: " + subDirectory);
                }
                Files.createDirectories(targetLocation);
            }

            targetLocation = targetLocation.resolve(fileName).normalize();
            if (!targetLocation.startsWith(this.fileStorageLocation)) {
                throw new SecurityException("Path traversal attempt detected in file path");
            }
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            String uriPrefix = "/uploads/";
            if (subDirectory != null && !subDirectory.isEmpty()) {
                uriPrefix += subDirectory + "/";
            }
            
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path(uriPrefix)
                    .path(fileName)
                    .toUriString();
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + fileName + ". Please try again!", ex);
        }
    }

    public Resource loadFileAsResource(String fileName, String subDirectory) {
        try {
            Path targetLocation = this.fileStorageLocation;
            if (subDirectory != null && !subDirectory.isEmpty()) {
                targetLocation = this.fileStorageLocation.resolve(subDirectory);
            }
            
            Path filePath = targetLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("File not found " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found " + fileName, ex);
        }
    }

    public boolean deleteFileByUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains("/uploads/")) {
            return false;
        }
        try {
            int uploadIndex = fileUrl.indexOf("/uploads/") + "/uploads/".length();
            String relativePathStr = fileUrl.substring(uploadIndex);
            if (relativePathStr.contains("?")) {
                relativePathStr = relativePathStr.substring(0, relativePathStr.indexOf("?"));
            }
            Path filePath = this.fileStorageLocation.resolve(relativePathStr).normalize();
            if (filePath.startsWith(this.fileStorageLocation)) {
                return Files.deleteIfExists(filePath);
            }
        } catch (Exception ignored) {
            // Best effort file deletion; do not fail transaction
        }
        return false;
    }
}

