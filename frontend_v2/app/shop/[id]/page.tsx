'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { storefrontApi } from '@/lib/api/storefront';
import { Shop } from '@/types/shop';
import { Product, Category } from '@/types/product';
import { useCart } from '@/context/CartContext';
import { StorefrontNavbar } from '@/components/customer/storefront/StorefrontNavbar';
import { StorefrontBanner } from '@/components/customer/storefront/StorefrontBanner';
import { StorefrontTabNav, StorefrontTab } from '@/components/customer/storefront/StorefrontTabNav';
import { StorefrontHomeTab } from '@/components/customer/storefront/tabs/StorefrontHomeTab';
import { StorefrontShopTab } from '@/components/customer/storefront/tabs/StorefrontShopTab';
import { StorefrontAboutTab } from '@/components/customer/storefront/tabs/StorefrontAboutTab';
import { StorefrontOffersTab } from '@/components/customer/storefront/tabs/StorefrontOffersTab';
import { StorefrontCustomCakesTab } from '@/components/customer/storefront/tabs/StorefrontCustomCakesTab';
import { StorefrontGalleryTab } from '@/components/customer/storefront/tabs/StorefrontGalleryTab';
import { StorefrontContactTab } from '@/components/customer/storefront/tabs/StorefrontContactTab';
import { StorefrontTrackOrderTab } from '@/components/customer/storefront/tabs/StorefrontTrackOrderTab';
import { StorefrontCheckoutTab } from '@/components/customer/storefront/tabs/StorefrontCheckoutTab';
import { ProductDetailModal } from '@/components/customer/storefront/ProductDetailModal';
import { CustomCakeInquiryModal } from '@/components/customer/storefront/CustomCakeInquiryModal';
import { CartDrawer } from '@/components/customer/storefront/CartDrawer';
import { SavedCakesDrawer } from '@/components/customer/storefront/SavedCakesDrawer';

import { Footer } from '@/components/common/Footer';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

function StorefrontContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const shopId = params?.id as string;

  

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const tabParam = (searchParams?.get('tab') as StorefrontTab) || 'home';
  const [activeTab, setActiveTab] = useState<StorefrontTab>(tabParam);

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (newTab: StorefrontTab) => {
    setActiveTab(newTab);
    const url = new URL(window.location.href);
    if (newTab === 'home') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', newTab);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // Product Detail / Customization Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCustomInquiryOpen, setIsCustomInquiryOpen] = useState<boolean>(false);
  const [customCakeRefImage, setCustomCakeRefImage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && activeTab !== 'shop') {
      handleTabChange('shop');
    }
  };

  const loadStorefrontData = useCallback(async () => {
    if (!shopId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [shopData, productsData, categoriesData] = await Promise.all([
        storefrontApi.getShopById(shopId),
        storefrontApi.getStorefrontProducts(shopId),
        storefrontApi.getStorefrontCategories(shopId),
      ]);
      setShop(shopData);
      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load storefront');
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  // Lightweight refresh — only re-fetches shop data (not products/categories)
  // Called on tab change and window focus to keep owner dashboard changes in sync
  const refreshShopData = useCallback(async () => {
    if (!shopId) return;
    try {
      const freshShop = await storefrontApi.getShopById(shopId);
      if (freshShop) setShop(freshShop);
    } catch {
      // silently ignore — stale data is better than broken UI
    }
  }, [shopId]);

  // Full load on first mount
  useEffect(() => {
    loadStorefrontData();
  }, [loadStorefrontData]);

  // Re-fetch fresh shop data on every tab switch
  useEffect(() => {
    refreshShopData();
  }, [activeTab, refreshShopData]);

  // Re-fetch fresh shop data when the browser tab gets focus
  // (e.g. user switches from owner dashboard → storefront tab)
  useEffect(() => {
    const onFocus = () => refreshShopData();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshShopData]);

  const handleOpenProduct = (product: Product) => {
    router.push(`/shop/${shopId}/product/${product.id}`);
  };

  const handleOpenGalleryProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream-light">
        <LoadingState message="Loading bakery boutique storefront..." />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream-light p-4">
        <ErrorState
          message={error || 'Storefront not found'}
          onRetry={loadStorefrontData}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream-light">
      {/* Storefront Header with in-store basket trigger */}
      <StorefrontNavbar
        shop={shop}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
      />

      {/* Bakery Hero Banner */}
      <StorefrontBanner shop={shop} />

      {/* Bakery Mini-Website 8-Destination Tab Navigation */}
      <StorefrontTabNav
        shop={shop}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        productCount={products.length}
      />

      {/* Main Tab Content View Router */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full">
        {activeTab === 'home' && (
          <StorefrontHomeTab
            shop={shop}
            products={products}
            categories={categories}
            onNavigateTab={handleTabChange}
            onSelectProduct={handleOpenProduct}
            onOpenCustomQuote={() => handleTabChange('custom-cakes')}
          />
        )}

        {activeTab === 'shop' && (
          <StorefrontShopTab
            shop={shop}
            products={products}
            categories={categories}
            searchQuery={searchQuery}
            onSelectProduct={handleOpenProduct}
            onOpenCustomQuote={() => handleTabChange('custom-cakes')}
          />
        )}

        {activeTab === 'about' && (
          <StorefrontAboutTab
            shop={shop}
            onNavigateTab={handleTabChange}
          />
        )}

        {activeTab === 'offers' && (
          <StorefrontOffersTab
            shop={shop}
            onNavigateTab={handleTabChange}
          />
        )}

        {activeTab === 'custom-cakes' && (
          <StorefrontCustomCakesTab
            shop={shop}
            initialReferenceImage={customCakeRefImage}
          />
        )}

        {activeTab === 'gallery' && (
          <StorefrontGalleryTab
            shop={shop}
            products={products}
            categories={categories}
            onSelectProduct={handleOpenGalleryProduct}
            onNavigateTab={handleTabChange}
            onInquireCustomCake={(imageUrl: string) => {
              setCustomCakeRefImage(imageUrl);
              handleTabChange('custom-cakes');
            }}
          />
        )}

        {activeTab === 'contact' && (
          <StorefrontContactTab
            shop={shop}
          />
        )}

        {activeTab === 'track' && (
          <StorefrontTrackOrderTab
            shop={shop}
          />
        )}

        {activeTab === 'checkout' && (
          <StorefrontCheckoutTab
            shop={shop}
            onNavigateTab={handleTabChange}
          />
        )}
      </main>

      {/* In-Store Product Customization Modal */}
      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedProduct}
        shop={shop}
        onOpenCustomQuote={() => {
          setIsDetailModalOpen(false);
          handleTabChange('custom-cakes');
        }}
      />

      {/* Bespoke Custom Cake Inquiry Modal */}
      <CustomCakeInquiryModal
        isOpen={isCustomInquiryOpen}
        onClose={() => setIsCustomInquiryOpen(false)}
        shop={shop}
      />

      {/* In-Store Cart Drawer */}
      <CartDrawer />

      {/* Saved Cakes Wishlist Drawer */}
      <SavedCakesDrawer />

      <Footer />
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-cream-light">
          <LoadingState message="Loading bakery boutique storefront..." />
        </div>
      }
    >
      <StorefrontContent />
    </Suspense>
  );
}
