package com.cakeplatform.api.modules.media;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/owner/media")
@PreAuthorize("hasRole('SHOP_OWNER')")
@RequiredArgsConstructor
public class MediaController {

    private static final Set<String> ALLOWED_SUBDIRECTORIES = Set.of("products", "covers", "logos", "documents");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".webp", ".pdf");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    private final StorageService storageService;

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file,
                                                          @RequestParam(value = "type", defaultValue = "products") String type) {

        // 1. Validate file presence
        if (file == null || file.isEmpty() || file.getSize() == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        // 2. Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size exceeds 5MB limit"));
        }

        // 3. Validate subdirectory whitelist (prevent path traversal)
        String normalizedType = (type != null) ? type.trim().toLowerCase() : "products";
        if (!ALLOWED_SUBDIRECTORIES.contains(normalizedType) || normalizedType.contains("..") || normalizedType.contains("/") || normalizedType.contains("\\")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid upload category. Allowed: products, covers, logos, documents"));
        }

        // 4. Validate filename & extension whitelist
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Filename must include a valid extension"));
        }
        String extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .webp, .pdf"));
        }

        // 5. Validate Magic Bytes (inspect actual binary content)
        if (!isValidMagicBytes(file, extension)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or corrupt file content. Magic bytes verification failed."));
        }

        String fileDownloadUri = storageService.storeFile(file, normalizedType);

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
                    && (header[0] == (byte) 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)) {
                return true;
            }

            // PDF: 25 50 44 46 (%PDF)
            if (extension.equals(".pdf")
                    && (header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46)) {
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
            return false;
        }
    }
}
