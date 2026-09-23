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
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".webp");
    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = Set.of(".mp4", ".webm");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final long MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
    private static final String SUBDIRECTORY = "custom-cake-references";
    private static final String SUBDIRECTORY_REVIEW_MEDIA = "review-media";

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

    @PostMapping("/upload-review-media")
    public ResponseEntity<Map<String, String>> uploadReviewMedia(@RequestParam("file") MultipartFile file) {

        // 1. Validate file presence
        if (file == null || file.isEmpty() || file.getSize() == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must not be empty"));
        }

        // 2. Validate filename & extension
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Filename must include a valid media extension"));
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        boolean isImage = ALLOWED_IMAGE_EXTENSIONS.contains(extension);
        boolean isVideo = ALLOWED_VIDEO_EXTENSIONS.contains(extension);

        if (!isImage && !isVideo) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file type. Supported types: images (.jpg, .jpeg, .png, .webp) up to 5MB, or videos (.mp4, .webm) up to 25MB."));
        }

        // 3. Validate size per media type
        if (isImage && file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image size exceeds 5MB limit"));
        }
        if (isVideo && file.getSize() > MAX_VIDEO_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "Video size exceeds 25MB limit"));
        }

        // 4. Validate MIME type
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Media content type header is missing"));
        }
        String cleanMime = contentType.trim().toLowerCase();
        if (isImage && !(cleanMime.equals("image/jpeg") || cleanMime.equals("image/jpg") || cleanMime.equals("image/png") || cleanMime.equals("image/webp"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "MIME type does not match image extension. Detected: " + contentType));
        }
        if (isVideo && !(cleanMime.equals("video/mp4") || cleanMime.equals("video/webm"))) {
            return ResponseEntity.badRequest().body(Map.of("error", "MIME type does not match video extension. Detected: " + contentType));
        }

        // 5. Validate Magic Bytes (actual binary content)
        if (!isValidMagicBytes(file, extension)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid or corrupt media content. Magic bytes verification failed."));
        }

        // 6. Store file under controlled subdirectory
        String fileDownloadUri = storageService.storeFile(file, SUBDIRECTORY_REVIEW_MEDIA);

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

            // MP4: bytes 4-7 are 'ftyp' (ISO Base Media)
            if (extension.equals(".mp4") && bytesRead >= 8) {
                if (header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) {
                    return true;
                }
            }

            // WEBM: bytes 0-3 are 1A 45 DF A3 (EBML ID)
            if (extension.equals(".webm") && bytesRead >= 4) {
                if (header[0] == (byte) 0x1A && header[1] == (byte) 0x45 && header[2] == (byte) 0xDF && header[3] == (byte) 0xA3) {
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
