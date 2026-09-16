package com.cakeplatform.api.modules.storefront;

import com.cakeplatform.api.modules.media.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/storefront/media")
@RequiredArgsConstructor
@Slf4j
public class CustomerMediaController {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".webp");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final String SUBDIRECTORY = "custom-cake-references";

    private final StorageService storageService;

    @PostMapping("/upload-reference")
    public ResponseEntity<Map<String, String>> uploadReferenceImage(@RequestParam("file") MultipartFile file) {

        // 1. Validate file presence
        if (file == null || file.isEmpty() || file.getSize() == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        // 2. Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size exceeds 5MB limit"));
        }

        // 3. Validate filename & extension whitelist (reject SVG, HTML, PDF, EXE, etc.)
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Filename must include a valid image extension (.jpg, .jpeg, .png, .webp)"));
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file type. Only JPEG, PNG, and WEBP image references are accepted."));
        }

        // 4. Validate Magic Bytes (inspect actual binary content)
        if (!isValidMagicBytes(file, extension)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or corrupt image content. Magic bytes verification failed."));
        }

        // 5. Store file under controlled subdirectory with server-generated UUID filename
        String fileDownloadUri = storageService.storeFile(file, SUBDIRECTORY);

        Map<String, String> response = new HashMap<>();
        response.put("url", fileDownloadUri);
        response.put("fileName", file.getOriginalFilename());
        response.put("type", file.getContentType());

        return ResponseEntity.ok(response);
    }

    private boolean isValidMagicBytes(MultipartFile file, String extension) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                return false;
            }

            // JPEG: FF D8 FF
            if ((extension.equals(".jpg") || extension.equals(".jpeg"))
                    && (header[0] == (byte) 0xFF && header[1] == (byte) 0xD8 && header[2] == (byte) 0xFF)) {
                return true;
            }

            // PNG: 89 50 4E 47
            if (extension.equals(".png")
                    && (header[0] == (byte) 0x89 && header[1] == (byte) 0x50 && header[2] == (byte) 0x4E && header[3] == (byte) 0x47)) {
                return true;
            }

            // WEBP: RIFF....WEBP (requires at least 12 bytes)
            if (extension.equals(".webp") && bytesRead >= 12) {
                boolean isRiff = (header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46);
                boolean isWebp = (header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50);
                if (isRiff && isWebp) {
                    return true;
                }
            }

            return false;
        } catch (IOException e) {
            log.error("Failed to read image stream for magic byte verification: {}", e.getMessage());
            return false;
        }
    }
}
