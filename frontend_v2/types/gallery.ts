export interface GalleryItem {
  id: number;
  shopId: number;
  title: string;
  caption?: string;
  imageUrl: string;
  categoryName: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateGalleryItemRequest {
  title: string;
  caption?: string;
  imageUrl: string;
  categoryName?: string;
  displayOrder?: number;
  isActive?: boolean;
}