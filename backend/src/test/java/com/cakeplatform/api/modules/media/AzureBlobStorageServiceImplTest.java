package com.cakeplatform.api.modules.media;

import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.specialized.BlockBlobClient;
import com.azure.storage.blob.BlobClient;
import com.cakeplatform.api.security.CustomUserDetails;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.security.ShopContextHolder;
import com.cakeplatform.api.modules.shop.Shop;
import com.cakeplatform.api.modules.user.User;
import com.cakeplatform.api.modules.user.UserRole;
import com.cakeplatform.api.modules.user.UserStatus;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.io.InputStream;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import com.azure.storage.blob.models.UserDelegationKey;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;

@ExtendWith(MockitoExtension.class)
public class AzureBlobStorageServiceImplTest {

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @Mock
    private BlobServiceClient blobServiceClient;

    @Mock
    private BlobContainerClient publicContainerClient;

    @Mock
    private BlobContainerClient privateContainerClient;

    @Mock
    private BlobClient blobClient;

    @Mock
    private BlockBlobClient blockBlobClient;

    private AzureBlobStorageServiceImpl service;

    @BeforeEach
    void setUp() {
        // Since constructor uses builders which are hard to mock, we will instantiate it with dummy values
        // and inject mocks via reflection.
        service = new AzureBlobStorageServiceImpl("dummyaccount", "cakestore-public", "cakestore-private", null, shopAccessValidator);
        
        ReflectionTestUtils.setField(service, "blobServiceClient", blobServiceClient);
        ReflectionTestUtils.setField(service, "publicBlobContainerClient", publicContainerClient);
        ReflectionTestUtils.setField(service, "privateBlobContainerClient", privateContainerClient);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        ShopContextHolder.clear();
    }

    private void mockAuthenticatedUser(Long userId, Long shopId) {
        User user = new User();
        user.setId(userId);
        user.setEmail("owner@test.com");
        user.setRole(UserRole.SHOP_OWNER);
        user.setStatus(UserStatus.ACTIVE);
        CustomUserDetails userDetails = new CustomUserDetails(user);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        Shop shop = new Shop();
        shop.setId(shopId);
        shop.setOwner(user);
        when(shopAccessValidator.getShopByOwnerId(userId)).thenReturn(shop);
    }

    @Test
    void storeFile_Authenticated_PublicMedia() throws Exception {
        mockAuthenticatedUser(1L, 17L);

        MockMultipartFile file = new MockMultipartFile("file", "image.jpg", "image/jpeg", "content".getBytes());

        when(publicContainerClient.getBlobClient(anyString())).thenReturn(blobClient);
        when(blobClient.getBlockBlobClient()).thenReturn(blockBlobClient);
        when(blockBlobClient.getBlobUrl()).thenReturn("https://dummyaccount.blob.core.windows.net/cakestore-public/shops/17/products/uuid.jpg");

        String url = service.storeFile(file, "products");

        assertTrue(url.contains("/cakestore-public/shops/17/products/"));
        
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(publicContainerClient).getBlobClient(pathCaptor.capture());
        
        String capturedPath = pathCaptor.getValue();
        assertTrue(capturedPath.startsWith("shops/17/products/"));
        assertTrue(capturedPath.endsWith(".jpg"));
        
        verify(blockBlobClient).upload(any(InputStream.class), eq((long) file.getSize()), eq(true));
    }

    @Test
    void storeFile_Authenticated_PrivateMedia() throws Exception {
        mockAuthenticatedUser(2L, 5L);

        MockMultipartFile file = new MockMultipartFile("file", "doc.pdf", "application/pdf", "content".getBytes());

        when(privateContainerClient.getBlobClient(anyString())).thenReturn(blobClient);
        when(blobClient.getBlockBlobClient()).thenReturn(blockBlobClient);
        when(blockBlobClient.getBlobUrl()).thenReturn("https://dummyaccount.blob.core.windows.net/cakestore-private/shops/5/verifications/uuid.pdf");

        String url = service.storeFile(file, "verifications");

        assertTrue(url.contains("/cakestore-private/shops/5/verifications/"));
        
        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(privateContainerClient).getBlobClient(pathCaptor.capture());
        
        String capturedPath = pathCaptor.getValue();
        assertTrue(capturedPath.startsWith("shops/5/verifications/"));
        assertTrue(capturedPath.endsWith(".pdf"));
    }
    
    @Test
    void storeFile_Unassigned_WhenNoShopOrUser() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "ref.jpg", "image/jpeg", "content".getBytes());

        when(publicContainerClient.getBlobClient(anyString())).thenReturn(blobClient);
        when(blobClient.getBlockBlobClient()).thenReturn(blockBlobClient);
        when(blockBlobClient.getBlobUrl()).thenReturn("https://dummy.blob.core/public/unassigned/custom-cake-references/uuid.jpg");

        String url = service.storeFile(file, "custom-cake-references");

        ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
        verify(publicContainerClient).getBlobClient(pathCaptor.capture());
        
        assertTrue(pathCaptor.getValue().startsWith("unassigned/custom-cake-references/"));
    }

    @Test
    void storeFile_WithShopContextHolder_RegistrationFlow() throws Exception {
        ShopContextHolder.setShopId(99L);
        try {
            MockMultipartFile file = new MockMultipartFile("file", "fssai.pdf", "application/pdf", "content".getBytes());

            when(privateContainerClient.getBlobClient(anyString())).thenReturn(blobClient);
            when(blobClient.getBlockBlobClient()).thenReturn(blockBlobClient);
            when(blockBlobClient.getBlobUrl()).thenReturn("https://dummy.blob.core/private/shops/99/verifications/uuid.pdf");

            String url = service.storeFile(file, "verifications");

            ArgumentCaptor<String> pathCaptor = ArgumentCaptor.forClass(String.class);
            verify(privateContainerClient).getBlobClient(pathCaptor.capture());
            assertTrue(pathCaptor.getValue().startsWith("shops/99/verifications/"));
        } finally {
            ShopContextHolder.clear();
        }
    }

    @Test
    void deleteFileByUrl_PublicBlob() {
        String url = "https://dummyaccount.blob.core.windows.net/cakestore-public/shops/17/products/image.jpg";
        when(publicContainerClient.getBlobClient("shops/17/products/image.jpg")).thenReturn(blobClient);

        boolean result = service.deleteFileByUrl(url);

        assertTrue(result);
        verify(blobClient).deleteIfExists();
        verifyNoInteractions(privateContainerClient);
    }
    
    @Test
    void deleteFileByUrl_PrivateBlob() {
        String url = "https://dummyaccount.blob.core.windows.net/cakestore-private/shops/17/verifications/doc.pdf";
        when(privateContainerClient.getBlobClient("shops/17/verifications/doc.pdf")).thenReturn(blobClient);

        boolean result = service.deleteFileByUrl(url);

        assertTrue(result);
        verify(blobClient).deleteIfExists();
        verifyNoInteractions(publicContainerClient);
    }

    @Test
    void generateSignedUrl_PrivateBlob() {
        String url = "https://dummyaccount.blob.core.windows.net/cakestore-private/shops/17/verifications/doc.pdf";
        
        UserDelegationKey dummyKey = new UserDelegationKey();
        ReflectionTestUtils.setField(dummyKey, "signedObjectId", "dummy_id");
        
        when(blobServiceClient.getUserDelegationKey(any(OffsetDateTime.class), any(OffsetDateTime.class))).thenReturn(dummyKey);
        when(privateContainerClient.getBlobClient("shops/17/verifications/doc.pdf")).thenReturn(blobClient);
        when(blobClient.getBlockBlobClient()).thenReturn(blockBlobClient);
        when(blockBlobClient.generateUserDelegationSas(any(BlobServiceSasSignatureValues.class), eq(dummyKey))).thenReturn("sig=dummy_signature");
        when(blockBlobClient.getBlobUrl()).thenReturn(url);

        String signedUrl = service.generateSignedUrl(url);

        assertTrue(signedUrl.contains("sig=dummy_signature"));
        
        ArgumentCaptor<BlobServiceSasSignatureValues> sasCaptor = ArgumentCaptor.forClass(BlobServiceSasSignatureValues.class);
        verify(blockBlobClient).generateUserDelegationSas(sasCaptor.capture(), eq(dummyKey));
        
        BlobServiceSasSignatureValues sas = sasCaptor.getValue();
        assertEquals("https", sas.getProtocol().toString());
        assertEquals("r", sas.getPermissions()); // read-only
    }
    
    @Test
    void generateSignedUrl_PublicBlob_ReturnsOriginal() {
        String url = "https://dummyaccount.blob.core.windows.net/cakestore-public/shops/17/products/image.jpg";
        String signedUrl = service.generateSignedUrl(url);
        
        assertEquals(url, signedUrl);
        verifyNoInteractions(blobServiceClient);
    }
}
