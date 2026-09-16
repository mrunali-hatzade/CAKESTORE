'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Eye,
  X,
  ArrowRight,
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { Product, Category } from '@/types/product';
import { GalleryItem } from '@/types/gallery';
import { galleryApi } from '@/lib/api/gallery';
import { StorefrontTab } from '../StorefrontTabNav';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface StorefrontGalleryTabProps {
  shop: Shop;
  products: Product[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onNavigateTab: (tab: StorefrontTab) => void;
  onInquireCustomCake?: (imageUrl: string, title?: string) => void;
}

type UnifiedGalleryItem =
  | {
      type: 'product';
      uid: string;
      id: number;
      title: string;
      caption?: string;
      imageUrl: string;
      categoryName: string;
      price: number;
      isEggless?: boolean;
      product: Product;
    }
  | {
      type: 'showcase';
      uid: string;
      id: number;
      title: string;
      caption?: string;
      imageUrl: string;
      categoryName: string;
      displayOrder: number;
      item: GalleryItem;
    };

export const StorefrontGalleryTab: React.FC<StorefrontGalleryTabProps> = ({
  shop,
  products,
  categories,
  onSelectProduct,
  onNavigateTab,
  onInquireCustomCake,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [ownerGalleryItems, setOwnerGalleryItems] = useState<GalleryItem[]>([]);
  const [activeLightboxItem, setActiveLightboxItem] = useState<UnifiedGalleryItem | null>(null);

  // Fetch bespoke showcase photos uploaded by the bakery owner
  useEffect(() => {
    if (!shop?.id) return;
    let isMounted = true;
    galleryApi
      .getStorefrontGallery(shop.id)
      .then((data) => {
        if (isMounted) {
          setOwnerGalleryItems(data || []);
        }
      })
      .catch((err) => {
        console.warn('Could not load owner gallery showcase photos:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [shop?.id]);

  // Merge Catalog Products and Owner Showcase Items
  const unifiedItems: UnifiedGalleryItem[] = useMemo(() => {
    // 1. Owner showcase photos
    const showcaseList: UnifiedGalleryItem[] = ownerGalleryItems
      .filter((i) => i.isActive && i.imageUrl && !i.imageUrl.includes('placeholder'))
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((item) => ({
        type: 'showcase',
        uid: `showcase-${item.id}`,
        id: item.id,
        title: item.title,
        caption: item.caption,
        imageUrl: item.imageUrl,
        categoryName: item.categoryName || 'Bespoke',
        displayOrder: item.displayOrder ?? 0,
        item,
      }));

    // 2. Active catalog products
    const productList: UnifiedGalleryItem[] = products
      .filter((p) => p.imageUrl && !p.imageUrl.includes('placeholder'))
      .map((p) => {
        const catObj = categories.find((c) => c.id === p.categoryId);
        const catName = p.categoryName || catObj?.name || 'Cakes';
        return {
          type: 'product',
          uid: `product-${p.id}`,
          id: p.id,
          title: p.name,
          caption: p.description,
          imageUrl: p.imageUrl!,
          categoryName: catName,
          price: p.price,
          isEggless: p.isEggless,
          product: p,
        };
      });

    // Showcase custom creations first, then catalog cakes
    return [...showcaseList, ...productList];
  }, [ownerGalleryItems, products, categories]);

  // Extract all distinct category names
  const categoryNames = useMemo(() => {
    const set = new Set<string>();
    unifiedItems.forEach((item) => {
      if (item.categoryName) {
        set.add(item.categoryName.trim());
      }
    });

    categories.forEach((cat) => {
      if (cat.name) set.add(cat.name.trim());
    });

    return Array.from(set);
  }, [unifiedItems, categories]);

  // Filter items by category
  const displayItems = useMemo(() => {
    if (selectedTag === 'ALL') {
      return unifiedItems;
    }
    return unifiedItems.filter(
      (item) => item.categoryName.toLowerCase() === selectedTag.toLowerCase()
    );
  }, [unifiedItems, selectedTag]);

  const handleInquire = (imageUrl: string, title?: string) => {
    setActiveLightboxItem(null);
    if (onInquireCustomCake) {
      onInquireCustomCake(imageUrl, title);
    } else {
      onNavigateTab('custom-cakes');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real Bakery Portfolio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-espresso">
          Pastry &amp; Celebration Cake Gallery
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-xl mx-auto leading-relaxed">
          Authentic creations handcrafted by {shop.businessName}. Browse signature designs from our menu and custom showcase portfolio.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedTag('ALL')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            selectedTag === 'ALL'
              ? 'bg-brand-plum text-white shadow-xs'
              : 'bg-white text-brand-espresso border border-brand-border/60 hover:bg-brand-blush/40'
          }`}
        >
          All Creations ({unifiedItems.length})
        </button>

        {categoryNames.map((name) => {
          const count = unifiedItems.filter(
            (i) => i.categoryName.toLowerCase() === name.toLowerCase()
          ).length;
          return (
            <button
              key={name}
              onClick={() => setSelectedTag(name)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedTag.toLowerCase() === name.toLowerCase()
                  ? 'bg-brand-plum text-white shadow-xs'
                  : 'bg-white text-brand-espresso border border-brand-border/60 hover:bg-brand-blush/40'
              }`}
            >
              {name} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      {displayItems.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-cream flex items-center justify-center text-brand-plum mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-serif font-bold text-brand-espresso">
            No Gallery Photos Found
          </h2>
          <p className="text-xs text-brand-muted max-w-md mx-auto">
            {selectedTag === 'ALL'
              ? `${shop.businessName} is uploading their latest portfolio creations. In the meantime, explore our live cake menu or request a bespoke quote.`
              : `No creations found under "${selectedTag}". Try viewing all creations.`}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {selectedTag !== 'ALL' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTag('ALL')}
                className="text-xs font-semibold"
              >
                Show All Creations
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onNavigateTab('shop')}
              className="text-xs font-bold"
            >
              Browse Live Menu
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayItems.map((item) => (
            <div
              key={item.uid}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-brand-border/80 shadow-soft hover:shadow-elevated transition-all duration-300 flex flex-col justify-between"
            >
              {/* Photo Area */}
              <div
                className="aspect-square w-full relative overflow-hidden bg-brand-cream cursor-pointer"
                onClick={() => setActiveLightboxItem(item)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-brand-espresso shadow-xs backdrop-blur-xs">
                    {item.categoryName}
                  </span>
                  {item.type === 'showcase' && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-brand-plum/90 text-white shadow-xs backdrop-blur-xs flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Custom Design</span>
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-black/40 backdrop-blur-xs px-3 py-1 rounded-full border border-white/20">
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </span>
                </div>
              </div>

              {/* Info & Actions */}
              <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-brand-espresso line-clamp-1 group-hover:text-brand-plum transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-brand-muted line-clamp-1 mt-0.5">
                    {item.caption || (item.type === 'product' ? 'Artisanal cake on live menu' : 'Custom boutique creation')}
                  </p>
                </div>

                <div className="pt-2 border-t border-brand-border/40 flex items-center justify-between">
                  {item.type === 'product' ? (
                    <>
                      <span className="text-xs font-bold text-brand-espresso">
                        ?{item.price}
                      </span>
                      <button
                        onClick={() => onSelectProduct(item.product)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-plum hover:underline cursor-pointer"
                      >
                        <span>Order</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold text-brand-muted">
                        Bespoke Portfolio
                      </span>
                      <button
                        onClick={() => handleInquire(item.imageUrl, item.title)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-plum hover:underline cursor-pointer"
                      >
                        <span>Inquire</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unified Lightbox Modal */}
      {activeLightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveLightboxItem(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full shadow-elevated border border-brand-border animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video sm:aspect-[16/10] w-full bg-brand-espresso overflow-hidden">
              <img
                src={activeLightboxItem.imageUrl}
                alt={activeLightboxItem.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setActiveLightboxItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 left-3">
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-xs border border-white/20">
                  {activeLightboxItem.categoryName}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-brand-espresso">
                    {activeLightboxItem.title}
                  </h2>
                  <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                    {activeLightboxItem.caption ||
                      (activeLightboxItem.type === 'product'
                        ? `Handcrafted fresh to order by ${shop.businessName}`
                        : `Bespoke artisanal design crafted by ${shop.businessName}. Request a custom quote to tailor this theme for your event.`)}
                  </p>
                </div>

                {activeLightboxItem.type === 'product' && (
                  <div className="text-right shrink-0">
                    <div className="text-xl font-serif font-bold text-brand-espresso">
                      ?{activeLightboxItem.price}
                    </div>
                    {activeLightboxItem.isEggless && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ?? Eggless
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-brand-border/60 flex flex-wrap items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveLightboxItem(null)}
                  className="text-xs font-semibold"
                >
                  Close
                </Button>

                {activeLightboxItem.type === 'product' ? (
                  <Button
                    onClick={() => {
                      const prod = activeLightboxItem.product;
                      setActiveLightboxItem(null);
                      onSelectProduct(prod);
                    }}
                    className="text-xs font-bold"
                  >
                    Customize &amp; Order
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleInquire(activeLightboxItem.imageUrl, activeLightboxItem.title)}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Inquire About This Design</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
