package com.cakeplatform.api.modules.media;

import com.azure.core.credential.TokenCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.models.UserDelegationKey;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import com.azure.storage.common.sas.SasProtocol;
import com.azure.storage.blob.specialized.BlockBlobClient;
import com.cakeplatform.api.security.CustomUserDetails;
import com.cakeplatform.api.modules.security.ShopContextHolder;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.Shop;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.UUID;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "azure_blob")
public class AzureBlobStorageServiceImpl implements StorageService {

    private final BlobContainerClient publicBlobContainerClient;
    private final BlobContainerClient privateBlobContainerClient;
    private final BlobServiceClient blobServiceClient;
    private final ShopAccessValidator shopAccessValidator;
    private final String publicContainerName;
    private final String privateContainerName;

    public AzureBlobStorageServiceImpl(
            @Value("${azure.storage.account-name}") String accountName,
            @Value("${azure.storage.public-container-name}") String publicContainerName,
            @Value("${azure.storage.private-container-name}") String privateContainerName,
            @Value("${azure.client-id:}") String clientId,
            ShopAccessValidator shopAccessValidator) {
        
        this.shopAccessValidator = shopAccessValidator;
        this.publicContainerName = publicContainerName;
        this.privateContainerName = privateContainerName;

        String endpoint = String.format("https://%s.blob.core.windows.net", accountName);
        
        DefaultAzureCredentialBuilder credBuilder = new DefaultAzureCredentialBuilder();
        if (clientId != null && !clientId.isBlank()) {
            credBuilder.managedIdentityClientId(clientId);
        }
        
        TokenCredential credential = credBuilder.build();
        
        this.blobServiceClient = new BlobServiceClientBuilder()
                .endpoint(endpoint)
                .credential(credential)
                .buildClient();
                
        this.publicBlobContainerClient = blobServiceClient.getBlobContainerClient(publicContainerName);
        this.privateBlobContainerClient = blobServiceClient.getBlobContainerClient(privateContainerName);
    }

    private Long getCurrentShopId() {
        Long contextShopId = ShopContextHolder.getShopId();
        if (contextShopId != null) {
            return contextShopId;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
            try {
                Shop shop = shopAccessValidator.getShopByOwnerId(userDetails.getId());
                return shop.getId();
            } catch (Exception e) {
                log.warn("Could not determine shop for user {}: {}", userDetails.getId(), e.getMessage());
            }
        }
        return null;
    }
    
    private boolean isPrivate(String subDirectory) {
        if (subDirectory == null) return false;
        return "documents".equalsIgnoreCase(subDirectory) || "verifications".equalsIgnoreCase(subDirectory);
    }

    @Override
    public String storeFile(MultipartFile file, String subDirectory) {
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "");
        String extension = "";
        int dotIndex = originalFileName.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = originalFileName.substring(dotIndex);
        }
        String fileName = UUID.randomUUID().toString() + extension;

        Long shopId = getCurrentShopId();
        
        String blobPath;
        if (shopId != null) {
            blobPath = "shops/" + shopId + "/" + (subDirectory != null && !subDirectory.isEmpty() ? subDirectory + "/" : "") + fileName;
        } else {
            blobPath = "unassigned/" + (subDirectory != null && !subDirectory.isEmpty() ? subDirectory + "/" : "") + fileName;
        }

        try {
            boolean isPrivate = isPrivate(subDirectory);
            BlobContainerClient containerClient = isPrivate ? privateBlobContainerClient : publicBlobContainerClient;
            BlockBlobClient blockBlobClient = containerClient.getBlobClient(blobPath).getBlockBlobClient();
            
            BlobHttpHeaders headers = new BlobHttpHeaders().setContentType(file.getContentType());
            
            if (isPrivate) {
                headers.setCacheControl("no-cache, no-store, must-revalidate");
            }
            
            blockBlobClient.upload(file.getInputStream(), file.getSize(), true);
            blockBlobClient.setHttpHeaders(headers);

            return blockBlobClient.getBlobUrl();
        } catch (IOException e) {
            throw new RuntimeException("Could not store file to Azure Blob Storage. Please try again!", e);
        }
    }

    @Override
    public Resource loadFileAsResource(String fileName, String subDirectory) {
        throw new UnsupportedOperationException("loadFileAsResource is not supported in Azure Blob mode.");
    }

    @Override
    public boolean deleteFileByUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains(".blob.core.windows.net/")) {
            return false;
        }
        try {
            String publicPathMarker = "/" + publicContainerName + "/";
            String privatePathMarker = "/" + privateContainerName + "/";
            
            BlobContainerClient containerClient;
            String pathMarker;
            
            if (fileUrl.contains(publicPathMarker)) {
                containerClient = publicBlobContainerClient;
                pathMarker = publicPathMarker;
            } else if (fileUrl.contains(privatePathMarker)) {
                containerClient = privateBlobContainerClient;
                pathMarker = privatePathMarker;
            } else {
                return false;
            }
            
            int idx = fileUrl.indexOf(pathMarker);
            if (idx == -1) return false;
            
            String blobPath = fileUrl.substring(idx + pathMarker.length());
            
            if (blobPath.contains("?")) {
                blobPath = blobPath.substring(0, blobPath.indexOf("?"));
            }
            
            containerClient.getBlobClient(blobPath).deleteIfExists();
            return true;
        } catch (Exception e) {
            log.error("Failed to delete blob {}: {}", fileUrl, e.getMessage());
            return false;
        }
    }

    @Override
    public String generateSignedUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains(".blob.core.windows.net/")) {
            return fileUrl;
        }
        
        String privatePathMarker = "/" + privateContainerName + "/";
        
        // Only generate SAS for private documents/verifications inside the private container
        if (!fileUrl.contains(privatePathMarker)) {
            return fileUrl; // Public URLs don't need a signature
        }
        
        try {
            int idx = fileUrl.indexOf(privatePathMarker);
            if (idx == -1) return fileUrl;
            
            String blobPath = fileUrl.substring(idx + privatePathMarker.length());
            if (blobPath.contains("?")) {
                blobPath = blobPath.substring(0, blobPath.indexOf("?"));
            }
            
            OffsetDateTime keyStart = OffsetDateTime.now().minusMinutes(5);
            OffsetDateTime keyExpiry = OffsetDateTime.now().plusMinutes(15); // Short lived (15 mins)
            
            UserDelegationKey userDelegationKey = blobServiceClient.getUserDelegationKey(keyStart, keyExpiry);
            
            BlobSasPermission sasPermission = new BlobSasPermission().setReadPermission(true);
            
            BlobServiceSasSignatureValues sasValues = new BlobServiceSasSignatureValues(keyExpiry, sasPermission)
                    .setProtocol(SasProtocol.HTTPS_ONLY); // Enforce HTTPS
            
            BlockBlobClient blobClient = privateBlobContainerClient.getBlobClient(blobPath).getBlockBlobClient();
            String sasToken = blobClient.generateUserDelegationSas(sasValues, userDelegationKey);
            
            return blobClient.getBlobUrl() + "?" + sasToken;
        } catch (Exception e) {
            log.error("Failed to generate SAS for blob {}: {}", fileUrl, e.getMessage());
            return fileUrl;
        }
    }
}
