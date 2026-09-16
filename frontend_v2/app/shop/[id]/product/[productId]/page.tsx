'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Clock,
  Check,
  Plus,
  Minus,
  Leaf,
  Truck,
  ChevronDown,
  Info,
  Heart,
  Share2,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  Calendar,
  Store,
  ShieldCheck,
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { Product } from '@/types/product';
import { storefrontApi } from '@/lib/api/storefront';
import { reviewsApi, ProductReviewsSummary } from '@/lib/api/reviews';
import { useCart } from '@/context/CartContext';
import { StorefrontNavbar } from '@/components/customer/storefront/StorefrontNavbar';
import { CartDrawer } from '@/components/customer/storefront/CartDrawer';
import { SavedCakesDrawer } from '@/components/customer/storefront/SavedCakesDrawer';
import { CakeReviewModal } from '@/components/customer/storefront/CakeReviewModal';
import { useFavorites } from '@/context/FavoritesContext';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/common/Toast';
import { Footer } from '@/components/common/Footer';

const FALLBACK_CAKE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80';


function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const shopId = params?.id as string;
  const productId = params?.productId as string;

  const { addItem, clearCart, currentShopName, setIsCartOpen } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();

  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [customMessage, setCustomMessage] = useState('');
  const [isEgglessPreference, setIsEgglessPreference] = useState<boolean>(true);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showConflictPrompt, setShowConflictPrompt] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    about: true,
    ingredients: true,
    delivery: false,
    reviews: false,
    more: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewsSummary | null>(null);

  const handleReviewSubmitted = (newRev: any) => {
    setReviewsSummary((prev) => {
      if (!prev) {
        return {
          productId: Number(productId),
          averageRating: newRev.rating,
          totalReviews: 1,
          ratingBreakdown: { [newRev.rating]: 1 },
          reviews: [newRev],
        };
      }
      return {
        ...prev,
        totalReviews: prev.totalReviews + 1,
        averageRating: Number(
          ((prev.averageRating * prev.totalReviews + newRev.rating) / (prev.totalReviews + 1)).toFixed(1)
        ),
        reviews: [newRev, ...prev.reviews],
      };
    });
  };

  const loadData = useCallback(async () => {
    if (!shopId || !productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [shopData, prods] = await Promise.all([
        storefrontApi.getShopById(shopId),
        storefrontApi.getStorefrontProducts(shopId),
      ]);
      setShop(shopData);

      const allProds = prods || [];
      const currentProd = allProds.find((p) => String(p.id) === String(productId)) || null;
      if (currentProd) {
        setProduct(currentProd);
        setIsEgglessPreference(currentProd.isEggless ?? true);
        if (currentProd.variants && currentProd.variants.length > 0) {
          setSelectedVariantId(currentProd.variants[0].id);
        }
      } else {
        const directProd = await storefrontApi.getProductDetails(shopId, productId);
        setProduct(directProd);
        setIsEgglessPreference(directProd.isEggless ?? true);
        if (directProd.variants && directProd.variants.length > 0) {
          setSelectedVariantId(directProd.variants[0].id);
        }
      }

      setOtherProducts(allProds.filter((p) => String(p.id) !== String(productId)).slice(0, 4));

      reviewsApi
        .getProductReviews(shopId, productId)
        .then(setReviewsSummary)
        .catch(() => setReviewsSummary(null));
    } catch (err: any) {
      setError(err.message || 'Failed to load cake details');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <LoadingState message="Loading artisan cake details..." />
      </div>
    );
  }

  if (error || !shop || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-4">
        <ErrorState
          message={error || 'Cake not found'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const rawGallery = [
    product.imageUrl,
    ...(product.images || []).map((img: any) => img.imageUrl),
  ].filter(Boolean) as string[];
  const galleryThumbnails = rawGallery.length > 0 ? rawGallery : [FALLBACK_CAKE];

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const isVariantWeight = Boolean(
    hasVariants && product.variants?.some((v) => /\b(g|kg|gm|gms|pound|lbs|serve|serves)\b/i.test(v.name))
  );
  const selectedVariant = hasVariants
    ? product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0]
    : null;

  const baseUnitPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);

  const addonsTotal = (product.addons || [])
    .filter((a) => a.id && selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0);

  const egglessDiff = Boolean(product.allowEggChoice && isEgglessPreference && product.egglessPriceDiff)
    ? Number(product.egglessPriceDiff)
    : 0;

  const unitPrice = baseUnitPrice + addonsTotal + egglessDiff;

  // Determine effective original price for discount display
  const effectiveOriginalPrice = selectedVariant
    ? (selectedVariant.originalPrice ? Number(selectedVariant.originalPrice) : null)
    : (product.originalPrice ? Number(product.originalPrice) : null);

  const discountPercent = effectiveOriginalPrice && effectiveOriginalPrice > unitPrice
    ? Math.round(((effectiveOriginalPrice - unitPrice) / effectiveOriginalPrice) * 100)
    : 0;

  const getFullItemName = () => {
    let name = product.name;
    if (selectedVariant) {
      name += ` (${selectedVariant.name})`;
    }
    const selectedAddons = (product.addons || []).filter((a) => a.id && selectedAddonIds.includes(a.id));
    if (selectedAddons.length > 0) {
      name += ` + ${selectedAddons.map((a) => a.name).join(', ')}`;
    }
    return name;
  };

  const handleAddToCart = () => {
    const result = addItem({
      productId: product.id,
      name: getFullItemName(),
      price: unitPrice,
      quantity,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || FALLBACK_CAKE,
      isEggless: isEgglessPreference,
      customMessage: customMessage.trim() || undefined,
      shopId: shop.id,
      shopName: shop.businessName,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      weight: selectedVariant ? selectedVariant.name : undefined,
      dietaryPreference: isEgglessPreference ? 'EGGLESS' : 'REGULAR',
    });

    if (result.conflict) {
      setShowConflictPrompt(true);
      return;
    }

    toast.success(`Added "${product.name}" to basket!`);
    setIsCartOpen(true);
  };

  const handleDirectCheckout = () => {
    const result = addItem({
      productId: product.id,
      name: getFullItemName(),
      price: unitPrice,
      quantity,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || FALLBACK_CAKE,
      isEggless: isEgglessPreference,
      customMessage: customMessage.trim() || undefined,
      shopId: shop.id,
      shopName: shop.businessName,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      weight: selectedVariant ? selectedVariant.name : undefined,
      dietaryPreference: isEgglessPreference ? 'EGGLESS' : 'REGULAR',
    });

    if (result.conflict) {
      setShowConflictPrompt(true);
      return;
    }

    router.push(`/shop/${shop.id}?tab=checkout`);
  };

  const handleReplaceCart = () => {
    clearCart();
    addItem({
      productId: product.id,
      name: getFullItemName(),
      price: unitPrice,
      quantity,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || FALLBACK_CAKE,
      isEggless: isEgglessPreference,
      customMessage: customMessage.trim() || undefined,
      shopId: shop.id,
      shopName: shop.businessName,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      weight: selectedVariant ? selectedVariant.name : undefined,
      dietaryPreference: isEgglessPreference ? 'EGGLESS' : 'REGULAR',
    });
    setShowConflictPrompt(false);
    toast.success(`Cart updated for "${shop.businessName}"!`);
    setIsCartOpen(true);
  };

  const totalReviews = reviewsSummary?.totalReviews ?? 0;
  const averageRating = reviewsSummary?.averageRating ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] font-sans">
      <StorefrontNavbar shop={shop} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 w-full space-y-8">
        {/* Top Breadcrumb & Share */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border/60 text-xs">
          <div className="flex items-center gap-2 text-brand-muted">
            <Link
              href={`/shop/${shop.id}?tab=shop`}
              className="inline-flex items-center gap-1.5 font-bold text-brand-espresso hover:text-[#5C1D2E] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {shop.businessName}&apos;s Menu</span>
            </Link>
            <span>/</span>
            <span className="text-[#C5A880] font-medium uppercase tracking-wider">
              {product.categoryName || product.category?.replace(/_/g, ' ') || 'Artisanal Cakes'}
            </span>
            <span>/</span>
            <span className="font-semibold text-[#2C1A1D] truncate max-w-xs">{product.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${product.name} | ${shop.businessName}`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Cake link copied to clipboard!');
                }
              }}
              className="p-2 rounded-full bg-white border border-brand-border/80 text-brand-muted hover:text-brand-espresso transition-colors shadow-2xs cursor-pointer"
              title="Share cake"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Conflict Modal Banner */}
        {showConflictPrompt && (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold">
                Your cart currently contains items from <strong>{currentShopName}</strong>. Each order must be placed with a single artisan bakery.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowConflictPrompt(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReplaceCart}>
                Clear Cart &amp; Order from {shop.businessName}
              </Button>
            </div>
          </div>
        )}

        {/* Main 2-Column Product Detail Layout (Matching UI Design Reference Panel 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN: Main Image + 3 Thumbnails + 5 Accordions       */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 w-full space-y-4">
            {/* Main Photo Card - Balanced & Prominent */}
            <div className="relative w-full h-[360px] sm:h-[400px] rounded-3xl overflow-hidden bg-white border border-brand-border/80 shadow-soft">
              <img
                src={(selectedVariant?.imageUrl && selectedImageIndex === 0 ? selectedVariant.imageUrl : galleryThumbnails[selectedImageIndex]) || FALLBACK_CAKE}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-all duration-300 hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_CAKE;
                }}
              />

              {/* Floating Wishlist Heart Icon */}
              <button
                type="button"
                onClick={() => toggleFavorite(product, shop.id, shop.businessName)}
                className="absolute top-3.5 right-3.5 p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-xs hover:bg-white transition-all cursor-pointer z-10"
                title={isFavorite(product.id) ? 'Saved to favorites' : 'Save cake'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite(product.id) ? 'fill-rose-500 text-rose-500' : 'text-brand-muted hover:text-rose-500'
                  }`}
                />
              </button>

              {/* Top Left Veg/Dietary Indicator */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-xs text-xs font-bold text-brand-espresso border border-brand-border/40">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isEgglessPreference ? 'bg-emerald-600 ring-2 ring-emerald-600/20' : 'bg-amber-600'
                    }`}
                  />
                  <span>{isEgglessPreference ? '100% Pure Veg (Eggless)' : 'Contains Egg'}</span>
                </span>
              </div>
            </div>

            {/* Gallery Thumbnails */}
            <div className="grid grid-cols-3 gap-2.5">
              {galleryThumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-18 sm:h-20 w-full rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#5C1D2E] ring-2 ring-[#5C1D2E]/20 shadow-sm scale-102'
                      : 'border-brand-border/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={thumb}
                    alt={`Angle ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_CAKE;
                    }}
                  />
                </button>
              ))}
            </div>

                        {/* Product Configuration & Purchase Panel (With Card Border Restored) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-brand-border/80 shadow-soft space-y-4">
              {/* Title & Category */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#C5A880] block">
                {product.categoryName || product.category?.replace(/_/g, ' ') || 'Artisanal Creation'}
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2C1A1D] tracking-tight mt-0.5">
                {product.name}
              </h1>
            </div>

            {/* Ratings Bar */}
            <div className="flex items-center gap-1.5 -mt-1">
              <div className="flex items-center gap-0.5 text-amber-500">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-[#2C1A1D]">
                {averageRating > 0 ? averageRating.toFixed(1) : null}
              </span>
              <span className="text-[11px] text-brand-muted font-normal">
                ({totalReviews} reviews)
              </span>
            </div>

            {/* Price & Discount */}
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <div className="text-2xl font-serif font-extrabold text-[#2C1A1D]">
                ₹{unitPrice}
              </div>
              {effectiveOriginalPrice && discountPercent >= 1 ? (
                <>
                  <span className="text-sm text-brand-muted line-through">
                    ₹{effectiveOriginalPrice}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {discountPercent}% OFF
                  </span>
                </>
              ) : null}
            </div>

            {/* Short Description */}
            {product.description && (
              <p className="text-xs text-brand-muted leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Real Variants from Database (Only if configured by owner) */}
            {hasVariants && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#2C1A1D] w-24 shrink-0">
                  {isVariantWeight ? 'Weight:' : 'Option:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants!.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedVariantId === v.id
                          ? 'bg-[#5C1D2E] text-white shadow-xs'
                          : 'bg-white text-brand-espresso border border-brand-border hover:bg-brand-cream/40'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Eggless Option - Inline Row (only when owner enabled allowEggChoice) */}
            {product.allowEggChoice ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#2C1A1D] w-24 shrink-0">Dietary:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEgglessPreference(true)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isEgglessPreference
                        ? 'bg-[#5C1D2E] text-white shadow-xs'
                        : 'bg-white text-brand-espresso border border-brand-border hover:bg-brand-cream/40'
                    }`}
                  >
                    100% Eggless
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEgglessPreference(false)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isEgglessPreference
                        ? 'bg-[#5C1D2E] text-white shadow-xs'
                        : 'bg-white text-brand-espresso border border-brand-border hover:bg-brand-cream/40'
                    }`}
                  >
                    Contains Egg
                  </button>
                </div>
              </div>
            ) : null}

            {/* Addons if configured */}
            {product.addons && product.addons.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#2C1A1D] block">Celebration Add-ons</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.addons.map((addon) => {
                    const isChecked = Boolean(addon.id && selectedAddonIds.includes(addon.id));
                    return (
                      <button
                        key={addon.id ?? addon.name}
                        type="button"
                        onClick={() => {
                          if (!addon.id) return;
                          if (isChecked) {
                            setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                          } else {
                            setSelectedAddonIds([...selectedAddonIds, addon.id]);
                          }
                        }}
                        className={`p-2 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-brand-blush border-brand-plum text-brand-espresso shadow-2xs'
                            : 'bg-white border-brand-border hover:bg-brand-cream/40 text-brand-espresso'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isChecked ? 'bg-brand-plum border-brand-plum text-white' : 'border-brand-border bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs font-medium">{addon.name}</span>
                        </div>
                        <span className="text-xs font-bold text-brand-plum">+₹{addon.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cake Personalization & Delivery Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Cake Message */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#2C1A1D]">Cake Message</label>
                  <span className="text-[10px] text-brand-muted">Optional</span>
                </div>
                <input
                  type="text"
                  maxLength={45}
                  placeholder="E.g., Happy Birthday Emily!"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border border-brand-border bg-white text-xs text-brand-espresso placeholder:text-brand-muted/70 focus:outline-none focus:border-[#5C1D2E] focus:ring-1 focus:ring-[#5C1D2E] shadow-2xs transition-all"
                />
              </div>

              {/* Delivery Date */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#2C1A1D]">Delivery Date</label>
                  <span className="text-[10px] text-brand-muted">Required</span>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-10 px-3.5 pl-10 rounded-xl border border-brand-border bg-white text-xs text-brand-espresso focus:outline-none focus:border-[#5C1D2E] focus:ring-1 focus:ring-[#5C1D2E] shadow-2xs transition-all cursor-pointer"
                  />
                  <Calendar className="w-4 h-4 text-brand-muted absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Quantity Stepper & Add to Cart */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-brand-border/60">
              <div className="flex items-center gap-1.5 border border-brand-border rounded-xl px-2.5 py-1.5 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 rounded-full text-brand-espresso hover:bg-brand-cream/40 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-serif font-bold text-sm text-brand-espresso w-5 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1 rounded-full text-brand-espresso hover:bg-brand-cream/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                size="md"
                className="flex-1 font-bold h-11 rounded-xl bg-[#5C1D2E] hover:bg-[#4a1525] shadow-xs text-xs sm:text-sm text-white cursor-pointer"
              >
                <span>Add to Cart • ₹{unitPrice * quantity}</span>
              </Button>
            </div>

            {/* Direct Order & WhatsApp Consultation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <Button
                onClick={handleDirectCheckout}
                variant="outline"
                size="sm"
                className="w-full font-bold h-10 rounded-xl border-[#5C1D2E] text-[#5C1D2E] hover:bg-brand-blush/40 text-xs cursor-pointer"
              >
                <span>Direct Order &amp; Delivery</span>
              </Button>

              {shop.phone && (
                <a
                  href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hi ${shop.businessName}, I'm interested in ordering "${product.name}" (₹${unitPrice * quantity}) on CakeStore. Could you please assist me with customization and delivery?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ask on WhatsApp</span>
                </a>
              )}
            </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Information Accordions & Details Group         */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 w-full space-y-4">
            {/* Information Accordions Group (Matching UI Design Panel 4 Left Column) */}
            <div className="border border-brand-border/80 rounded-2xl overflow-hidden bg-white divide-y divide-brand-border/60 shadow-2xs">
              
              {/* 1. About this cake */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('about')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm text-[#2C1A1D] block">About this cake</span>
                      <span className="text-[10px] text-brand-muted">Crafted by {shop.businessName}&apos;s bakery</span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.about ? 'rotate-180 text-brand-plum' : ''
                    }`}
                  />
                </button>
                {openAccordions.about && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <p className="whitespace-pre-line">
                      {product.description?.trim() ? product.description.trim() : <span className="text-brand-muted italic">No description provided for this cake.</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-white p-3 rounded-xl border border-brand-border/40">
                        <span className="font-bold text-brand-espresso block text-[11px]">Notice Window</span>
                        <span className="text-brand-muted text-[11px]">
                          {product.preparationTimeHours
                            ? `${product.preparationTimeHours} hrs advance notice`
                            : 'Standard preparation'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-brand-border/40">
                        <span className="font-bold text-brand-espresso block text-[11px]">Kitchen Standard</span>
                        <span className="text-brand-muted text-[11px]">100% Baked Fresh to Order</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Ingredients & Dietary Safety (Always Visible) */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('ingredients')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm text-[#2C1A1D] block">Ingredients &amp; Dietary Safety</span>
                      <span className="text-[10px] text-brand-muted">Fresh &amp; natural ingredients disclosure</span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.ingredients ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {openAccordions.ingredients && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div>
                      <strong className="text-brand-espresso font-semibold block text-[11px] uppercase tracking-wider">
                        Ingredients:
                      </strong>
                      {product.ingredients?.trim() ? (
                        <p className="mt-1 text-xs leading-relaxed text-brand-espresso/80 whitespace-pre-line">
                          {product.ingredients.trim()}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-brand-muted italic">
                          Ingredients not specified by the bakery.
                        </p>
                      )}
                    </div>

                    {product.allergens?.trim() && (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
                        <strong className="text-amber-900 font-semibold block text-[11px]">Allergen Notice:</strong>
                        <p className="text-amber-900/90 mt-1 text-[11px] leading-relaxed whitespace-pre-line">
                          {product.allergens.trim()}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        {isEgglessPreference ? '🌱 100% Pure Veg (Eggless)' : 'Contains Egg'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Delivery information */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('delivery')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="font-serif font-bold text-sm text-[#2C1A1D]">Delivery information</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.delivery ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {openAccordions.delivery && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div>
                      <strong className="text-brand-espresso font-semibold block text-[11px] uppercase tracking-wider">
                        Delivery Coverage:
                      </strong>
                      <p className="mt-0.5 text-xs text-brand-espresso/85">
                        Direct doorstep delivery from <strong>{shop.businessName}</strong> across {shop.city || 'the local area'}.
                      </p>
                    </div>

                    {shop.deliveryConfig && (
                      <div className="p-3 bg-white rounded-xl border border-brand-border/40 text-[11px] text-brand-espresso">
                        <strong className="font-bold text-brand-espresso block text-[11px]">Delivery Fee:</strong>
                        <p className="mt-0.5 text-brand-muted">
                          {shop.deliveryConfig.deliveryChargeType === 'FREE'
                            ? 'Complimentary Free Delivery on all orders.'
                            : `Fixed ₹${shop.deliveryConfig.fixedChargeAmount} delivery fee${
                                shop.deliveryConfig.minOrderForFreeDelivery
                                  ? ` (Free delivery for orders above ₹${shop.deliveryConfig.minOrderForFreeDelivery})`
                                  : ''
                              }.`}
                        </p>
                      </div>
                    )}

                    <div>
                      <strong className="text-brand-espresso font-semibold block text-[11px] uppercase tracking-wider">
                        Packaging &amp; Handling:
                      </strong>
                      {shop.deliveryConfig?.deliveryNotes?.trim() ? (
                        <p className="mt-0.5 text-xs text-brand-espresso/85 whitespace-pre-line">
                          {shop.deliveryConfig.deliveryNotes.trim()}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-brand-muted italic">
                          Special packaging notes not specified by the bakery.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Customer Reviews */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('reviews')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-amber-500" />
                    </div>
                    <span className="font-serif font-bold text-sm text-[#2C1A1D]">
                      Customer Reviews ({totalReviews})
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.reviews ? 'rotate-180 text-amber-500' : ''
                    }`}
                  />
                </button>
                {openAccordions.reviews && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-brand-border/40">
                      <div>
                        <span className="font-serif font-bold text-base text-brand-espresso">
                          {averageRating > 0 ? (averageRating.toFixed(1) + '★') : null}
                        </span>
                        <span className="text-[11px] text-brand-muted ml-2">
                          ({totalReviews} customer ratings)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsReviewModalOpen(true)}
                        className="text-xs font-bold text-brand-plum hover:underline cursor-pointer"
                      >
                        Post Review
                      </button>
                    </div>
                    {reviewsSummary && reviewsSummary.reviews && reviewsSummary.reviews.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {reviewsSummary.reviews.slice(0, 3).map((r) => (
                          <div key={r.id} className="p-3 bg-white rounded-xl border border-brand-border/40 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{r.customerDisplayName}</span>
                              <span className="text-amber-500 font-bold">{r.rating}★</span>
                            </div>
                            {r.reviewText && (
                              <p className="text-[11px] text-brand-muted italic">&ldquo;{r.reviewText}&rdquo;</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-brand-muted italic">Be the first to review this artisanal creation!</p>
                    )}
                  </div>
                )}
              </div>

              {/* 5. More from this bakery */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('more')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <span className="font-serif font-bold text-sm text-[#2C1A1D]">More from this bakery</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.more ? 'rotate-180 text-brand-plum' : ''
                    }`}
                  />
                </button>
                {openAccordions.more && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="block font-serif font-bold text-xs text-brand-espresso">
                          {shop.businessName}
                        </strong>
                        <span className="text-[10px] text-brand-muted">{shop.address || 'Verified Artisan Bakery'}</span>
                      </div>
                      <Link
                        href={`/shop/${shop.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#5C1D2E] text-white font-bold text-[11px] hover:bg-[#4a1525] transition-colors"
                      >
                        View Storefront
                      </Link>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* FSSAI Certified Kitchens Trust Badge */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-brand-border/60 text-xs text-brand-espresso shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-brand-blush/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-brand-plum" />
              </div>
              <div>
                <p className="font-bold text-[11px] text-[#2C1A1D]">FSSAI Certified Kitchens</p>
                <p className="text-[10px] text-brand-muted">Food safety &amp; hygiene compliance verified</p>
              </div>
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* RECOMMENDED SHELF: More Handcrafted Cakes from this Bakery    */}
        {/* ============================================================ */}
        {otherProducts.length > 0 && (
          <div className="pt-12 border-t border-brand-border/60 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2C1A1D]">
                  More from {shop.businessName}
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">Explore more artisanal creations from this bakery</p>
              </div>
              <Link
                href={`/shop/${shop.id}?tab=shop`}
                className="text-xs font-bold text-[#5C1D2E] hover:underline flex items-center gap-1"
              >
                <span>View Full Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {otherProducts.map((op) => (
                <Link
                  key={op.id}
                  href={`/shop/${shop.id}/product/${op.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-brand-border/70 hover:shadow-soft transition-all p-3 space-y-3"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#FAF7F2]">
                    <img
                      src={op.imageUrl || FALLBACK_CAKE}
                      alt={op.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#2C1A1D] line-clamp-1 group-hover:text-[#5C1D2E] transition-colors">
                      {op.name}
                    </h3>
                    <p className="text-xs font-bold text-brand-plum mt-1">₹{op.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Review / Feedback Modal */}
      <CakeReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        shopId={shop.id}
        productId={product.id}
        productName={product.name}
        shopName={shop.businessName}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <CartDrawer />
      <SavedCakesDrawer />
      <Footer />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
          <LoadingState message="Loading cake page..." />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}
