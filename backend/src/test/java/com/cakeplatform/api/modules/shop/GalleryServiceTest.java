package com.cakeplatform.api.modules.shop;

import com.cakeplatform.api.exception.ResourceNotFoundException;
import com.cakeplatform.api.modules.security.ShopAccessValidator;
import com.cakeplatform.api.modules.shop.dto.GalleryItemRequest;
import com.cakeplatform.api.modules.shop.dto.GalleryItemResponse;
import com.cakeplatform.api.modules.shop.service.GalleryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class GalleryServiceTest {

    @Mock
    private ShopGalleryItemRepository galleryItemRepository;

    @Mock
    private ShopAccessValidator shopAccessValidator;

    @InjectMocks
    private GalleryService galleryService;

    private Shop mockShop;
    private ShopGalleryItem mockItem;

    @BeforeEach
    void setUp() {
        mockShop = new Shop();
        mockShop.setId(10L);
        mockShop.setBusinessName("Sweet Delights");
        mockShop.setStatus(ShopStatus.ACTIVE);

        mockItem = new ShopGalleryItem();
        mockItem.setId(100L);
        mockItem.setShop(mockShop);
        mockItem.setTitle("Grand Wedding Cake");
        mockItem.setCaption("5-Tier Belgian Truffle");
        mockItem.setImageUrl("https://example.com/cake.jpg");
        mockItem.setCategoryName("Wedding");
        mockItem.setDisplayOrder(1);
        mockItem.setIsActive(true);
    }

    @Test
    void testGetOwnerGalleryItems() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(mockShop);
        when(galleryItemRepository.findByShopIdOrderByDisplayOrderAscCreatedAtDesc(10L))
                .thenReturn(List.of(mockItem));

        List<GalleryItemResponse> results = galleryService.getOwnerGalleryItems(1L);
        assertEquals(1, results.size());
        assertEquals("Grand Wedding Cake", results.get(0).getTitle());
        assertEquals("Wedding", results.get(0).getCategoryName());
    }

    @Test
    void testCreateGalleryItem() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(mockShop);
        when(galleryItemRepository.save(any(ShopGalleryItem.class))).thenAnswer(inv -> {
            ShopGalleryItem saved = inv.getArgument(0);
            saved.setId(101L);
            return saved;
        });

        GalleryItemRequest req = new GalleryItemRequest();
        req.setTitle("Floral Birthday Tier");
        req.setCaption("Artisan handcrafted");
        req.setImageUrl("https://example.com/floral.jpg");
        req.setCategoryName("Birthday");
        req.setDisplayOrder(2);
        req.setIsActive(true);

        GalleryItemResponse resp = galleryService.createGalleryItem(1L, req);
        assertNotNull(resp);
        assertEquals("Floral Birthday Tier", resp.getTitle());
        assertEquals("Birthday", resp.getCategoryName());
        verify(galleryItemRepository, times(1)).save(any(ShopGalleryItem.class));
    }

    @Test
    void testUpdateGalleryItem() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(mockShop);
        when(galleryItemRepository.findByIdAndShopId(100L, 10L)).thenReturn(Optional.of(mockItem));
        when(galleryItemRepository.save(any(ShopGalleryItem.class))).thenReturn(mockItem);

        GalleryItemRequest updateReq = new GalleryItemRequest();
        updateReq.setTitle("Updated Title");
        updateReq.setCategoryName("Anniversary");

        GalleryItemResponse resp = galleryService.updateGalleryItem(100L, 1L, updateReq);
        assertEquals("Updated Title", resp.getTitle());
        assertEquals("Anniversary", resp.getCategoryName());
    }

    @Test
    void testDeleteGalleryItem() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(mockShop);
        when(galleryItemRepository.findByIdAndShopId(100L, 10L)).thenReturn(Optional.of(mockItem));

        galleryService.deleteGalleryItem(100L, 1L);
        verify(galleryItemRepository, times(1)).delete(mockItem);
    }

    @Test
    void testDeleteGalleryItem_NotFound() {
        when(shopAccessValidator.getValidShopForOwner(1L)).thenReturn(mockShop);
        when(galleryItemRepository.findByIdAndShopId(999L, 10L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> galleryService.deleteGalleryItem(999L, 1L));
    }

    @Test
    void testGetPublicShopGallery() {
        when(galleryItemRepository.findByShopIdAndIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc(10L))
                .thenReturn(List.of(mockItem));

        List<GalleryItemResponse> results = galleryService.getPublicShopGallery(10L);
        assertEquals(1, results.size());
        assertEquals("Grand Wedding Cake", results.get(0).getTitle());
    }
}
