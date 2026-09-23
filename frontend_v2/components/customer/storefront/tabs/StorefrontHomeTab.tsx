'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Star,
  Cake,
  MapPin,
  Phone,
  MessageCircle,
  CheckCircle2,
  Plus,
  X,
  Upload,
  Loader2,
  Play,
  ShoppingBag,
  ThumbsUp,
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { Product, Category } from '@/types/product';
import { StorefrontTab } from '../StorefrontTabNav';
import { ProductCard } from '../ProductCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { storefrontApi } from '@/lib/api/storefront';
import { useToast } from '@/components/common/Toast';

interface StorefrontHomeTabProps {
  shop: Shop;
  products: Product[];
  categories: Category[];
  onNavigateTab: (tab: StorefrontTab) => void;
  onSelectProduct: (product: Product) => void;
  onOpenCustomQuote: () => void;
}

const CUSTOM_CAKE_VALUE = '__custom__';

/** Validate that a URL string is non-empty and not obviously invalid */
function isValidMediaUrl(url?: string | null): url is string {
  return typeof url === 'string' && url.trim().length > 4 && url.startsWith('http');
}

export const StorefrontHomeTab: React.FC<StorefrontHomeTabProps> = ({
  shop,
  products,
  categories,
  onNavigateTab,
  onSelectProduct,
  onOpenCustomQuote,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [topRatedProducts, setTopRatedProducts] = useState<Product[]>([]);
  const [loadingTopRated, setLoadingTopRated] = useState<boolean>(true);

  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(true);

  // Review / Feedback Modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewerRating, setReviewerRating] = useState<number>(5);
  const [reviewerComment, setReviewerComment] = useState<string>('');
  const [reviewerRecommendation, setReviewerRecommendation] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customCakeName, setCustomCakeName] = useState<string>('');

  // Media upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isFileVideo, setIsFileVideo] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  // Settings toggles
  const topRatedEnabled = shop.storefrontSettings?.topRatedEnabled !== false;
  const customCakesEnabled = shop.storefrontSettings?.customCakesEnabled !== false;
  const aboutStoryEnabled = shop.storefrontSettings?.aboutStoryEnabled !== false;
  const reviewsEnabled = shop.storefrontSettings?.reviewsEnabled !== false;

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (topRatedEnabled) {
        try {
          const data = await storefrontApi.getTopRatedProducts(shop.id, 8);
          if (isMounted) {
            setTopRatedProducts(data && data.length > 0 ? data : products.slice(0, 4));
          }
        } catch {
          if (isMounted) setTopRatedProducts(products.slice(0, 4));
        } finally {
          if (isMounted) setLoadingTopRated(false);
        }
      } else {
        if (isMounted) setLoadingTopRated(false);
      }

      if (reviewsEnabled) {
        try {
          const feedbackData = await storefrontApi.getShopFeedback(shop.id);
          if (isMounted) {
            setFeedbackList(feedbackData || []);
          }
        } catch {
          if (isMounted) setFeedbackList([]);
        } finally {
          if (isMounted) setLoadingFeedback(false);
        }
      } else {
        if (isMounted) setLoadingFeedback(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [shop.id, topRatedEnabled, reviewsEnabled, products]);

  // Cleanup preview object URL on unmount / file change
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clean up previous preview
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
    setIsFileVideo(file.type.startsWith('video/'));
    setUploadError(null);

    // Reset input so the same file can be reselected after removal
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setIsFileVideo(false);
    setUploadError(null);
  };

  const resetForm = () => {
    setReviewerName('');
    setReviewerRating(5);
    setReviewerComment('');
    setReviewerRecommendation('');
    setSelectedProductId('');
    setCustomCakeName('');
    handleRemoveFile();
  };

  const handleCloseModal = () => {
    setIsFeedbackModalOpen(false);
    resetForm();
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewerName.trim()) {
      toast.error('Please enter your display name.');
      return;
    }
    if (!reviewerComment.trim()) {
      toast.error('Please share how your experience was.');
      return;
    }

    // Resolve product selection
    const isCustomCake = selectedProductId === CUSTOM_CAKE_VALUE;
    const resolvedProductId = (!isCustomCake && selectedProductId)
      ? parseInt(selectedProductId, 10)
      : null;
    const resolvedProductName = isCustomCake && customCakeName.trim()
      ? customCakeName.trim()
      : undefined;

    let cakeImageUrl: string | undefined;
    let cakeVideoUrl: string | undefined;

    // Step 1: Upload media if selected
    if (selectedFile) {
      setIsUploading(true);
      setUploadError(null);
      try {
        const uploadResult = await storefrontApi.uploadReviewMedia(selectedFile);
        if (isFileVideo) {
          cakeVideoUrl = uploadResult.url;
        } else {
          cakeImageUrl = uploadResult.url;
        }
      } catch (err: any) {
        const msg = err.message || 'Media upload failed. Please try again.';
        setUploadError(msg);
        setIsUploading(false);
        toast.error(msg);
        return; // Do NOT proceed to submit
      } finally {
        setIsUploading(false);
      }
    }

    // Step 2: Submit feedback with all Phase 1 fields
    setIsSubmittingFeedback(true);
    try {
      await storefrontApi.submitFeedback(shop.id, {
        customerDisplayName: reviewerName.trim(),
        rating: reviewerRating,
        comment: reviewerComment.trim(),
        recommendationText: reviewerRecommendation.trim() || undefined,
        productId: resolvedProductId,
        productName: resolvedProductName,
        cakeImageUrl,
        cakeVideoUrl,
      });
      toast.success('Thank you! Your review has been submitted for approval.');
      handleCloseModal();
      // Refresh feedback list
      const updated = await storefrontApi.getShopFeedback(shop.id);
      setFeedbackList(updated || []);
    } catch (err: any) {
      const msg = err.message || 'Failed to submit review. Please try again.';
      toast.error(msg);
      if (selectedFile) {
        toast.error('Note: Your photo/video was uploaded but the review submission failed. Please retry.');
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const cleanPhone = (shop.phone || shop.businessPhone || '').replace(/\D/g, '');
  const displayProducts = topRatedProducts.length > 0 ? topRatedProducts : products.slice(0, 4);
  const isProcessing = isUploading || isSubmittingFeedback;

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* 1. Top Rated / Featured Signature Creations */}
      {topRatedEnabled && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-brand-border/60">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-plum uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Top Rated Cakes</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-espresso">
                Our Cake Collection
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted mt-0.5">
                Handcrafted with pure butter, couverture chocolate, and authentic fillings
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('shop')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-plum hover:text-brand-plum-hover transition-colors group self-start sm:self-auto cursor-pointer"
            >
              <span>Browse Full Menu ({products.length})</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {displayProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-brand-border/80 p-6">
              <Cake className="w-8 h-8 text-brand-muted mx-auto mb-2" />
              <p className="text-sm font-semibold text-brand-espresso">Our kitchen is preparing the fresh menu</p>
              <p className="text-xs text-brand-muted mt-1">Please check back shortly or request a custom order.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  shop={shop}
                  onSelect={onSelectProduct}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 2. Bespoke Custom Cake Consultation Banner */}
      {customCakesEnabled && (
        <section className="rounded-3xl bg-gradient-to-br from-brand-plum via-[#5c1d30] to-brand-espresso text-white p-8 sm:p-12 shadow-elevated relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bespoke Celebration Studio</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold leading-tight">
              Have a Dream Cake Design in Mind?
            </h2>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              From multi-tier wedding cakes to personalized character birthday cakes, share your reference photo and event date with {shop.businessName}&apos;s master bakers.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => onNavigateTab('custom-cakes')}
                variant="secondary"
                className="font-bold shadow-sm"
              >
                <Sparkles className="w-4 h-4 mr-2 text-brand-plum" />
                <span>Design Your Custom Cake</span>
              </Button>
              <Button
                onClick={() => onNavigateTab('gallery')}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <span>View Past Creations</span>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 3. Behind the Oven / Story Teaser */}
      {aboutStoryEnabled && (
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-border/80 shadow-soft">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Visual Bakery Thumbnail */}
            <div className="lg:col-span-4 relative group">
              <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-2xl overflow-hidden border border-brand-border/80 shadow-sm bg-brand-cream">
                <img
                  src={shop.aboutImageUrl || shop.coverImageUrl || shop.imageUrl || shop.bannerUrl || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'}
                  alt={`${shop.businessName} kitchen`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 text-white">
                  <p className="text-xs font-bold font-serif leading-tight">{shop.businessName}</p>
                  <p className="text-[10px] text-white/80">{shop.city}, {shop.state}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-plum uppercase tracking-wider">
                <span>About {shop.businessName}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-espresso">
                Baking Moments into Memories
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed line-clamp-3">
                {shop.aboutStory ||
                  shop.businessDescription ||
                  shop.description ||
                  'Welcome to our digital boutique storefront. Every celebration cake is handcrafted specifically for your event using high-grade cocoa, fresh dairy cream, and pure ingredients.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => onNavigateTab('about')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-plum hover:text-brand-plum-hover transition-colors group cursor-pointer"
                >
                  <span>Read Our Full Story &amp; Kitchen Standards</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-3 bg-brand-cream-light/70 rounded-2xl p-5 border border-brand-border/60 space-y-3">
              <h4 className="text-xs font-bold text-brand-espresso uppercase tracking-wider">
                Quick Kitchen Info
              </h4>
              <div className="space-y-2 text-xs text-brand-muted">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-plum shrink-0 mt-0.5" />
                  <span className="font-medium text-brand-espresso line-clamp-2">
                    {shop.area ? `${shop.area}, ` : ''}{shop.city}, {shop.state}
                  </span>
                </div>
                {(shop.phone || shop.businessPhone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-brand-plum shrink-0" />
                    <a href={`tel:${shop.phone || shop.businessPhone}`} className="hover:text-brand-plum transition-colors font-medium">
                      {shop.phone || shop.businessPhone}
                    </a>
                  </div>
                )}
                {cleanPhone && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=Hi%20${encodeURIComponent(shop.businessName)},%20I%20have%20an%20enquiry.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. Real Customer Feedback Highlights */}
      {reviewsEnabled && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-brand-espresso">
                Customer Experiences
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Verified feedback from celebration orders
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="text-xs font-semibold gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Share Experience</span>
            </Button>
          </div>

          {loadingFeedback ? (
            <div className="py-6 text-center text-xs text-brand-muted">Loading feedback...</div>
          ) : feedbackList.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-brand-border/80 text-center space-y-2 shadow-soft">
              <Star className="w-7 h-7 text-amber-400 mx-auto fill-amber-400/30" />
              <h4 className="text-sm font-bold font-serif text-brand-espresso">Be the First to Review</h4>
              <p className="text-xs text-brand-muted max-w-md mx-auto">
                Have you enjoyed a cake from {shop.businessName}? Share your review to help others celebrate their special moments.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="text-xs font-semibold"
                >
                  Share Your Experience
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab('track')}
                  className="text-xs font-semibold"
                >
                  Track Order
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbackList.slice(0, 6).map((item) => (
                <Card key={item.id} className="p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Rating + Date row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < (item.rating || 5)
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-brand-border fill-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-brand-muted">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    {/* Product name badge */}
                    {(item.productName) && (
                      <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-plum bg-brand-blush px-2 py-0.5 rounded-full border border-brand-blush-border">
                        <ShoppingBag className="w-2.5 h-2.5" />
                        <span>{item.productName}</span>
                      </div>
                    )}

                    {/* Review comment */}
                    <p className="text-xs text-brand-espresso leading-relaxed italic line-clamp-3">
                      &ldquo;{item.comment || 'Delicious and fresh!'}&rdquo;
                    </p>

                    {/* Recommendation text */}
                    {item.recommendationText && (
                      <div className="flex items-start gap-1.5 pt-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-brand-muted leading-relaxed line-clamp-2">
                          {item.recommendationText}
                        </p>
                      </div>
                    )}

                    {/* Cake photo */}
                    {isValidMediaUrl(item.cakeImageUrl) && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-brand-border/60 aspect-video bg-brand-cream">
                        <img
                          src={item.cakeImageUrl}
                          alt="Customer cake photo"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Cake video */}
                    {isValidMediaUrl(item.cakeVideoUrl) && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-brand-border/60 aspect-video bg-black">
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <video
                          src={item.cakeVideoUrl}
                          controls
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-brand-border/40 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-brand-espresso">
                      {item.customerDisplayName || 'Verified Customer'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Share Experience Modal */}
      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={handleCloseModal}
        maxWidth="lg"
        title={`Review ${shop.businessName}`}
        description="Share your honest experience to help future cake lovers celebrate better."
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-5 pt-1">

          {/* 1. Star Rating */}
          <div>
            <label className="block text-xs font-semibold text-brand-espresso mb-1.5">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewerRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= reviewerRating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-brand-border fill-transparent'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-semibold text-brand-espresso ml-2">
                {reviewerRating} of 5 Stars
              </span>
            </div>
          </div>

          {/* 2. Product / Cake selection */}
          <div>
            <label className="block text-xs font-semibold text-brand-espresso mb-1.5">
              Which cake did you order? <span className="text-brand-muted font-normal">(optional)</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                if (e.target.value !== CUSTOM_CAKE_VALUE) setCustomCakeName('');
              }}
              className="w-full text-sm border border-brand-border rounded-xl px-3 py-2 bg-white text-brand-espresso focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all"
            >
              <option value="">— Select a cake (optional) —</option>
              {products.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
              <option value={CUSTOM_CAKE_VALUE}>Custom Cake / Other</option>
            </select>
          </div>

          {/* Custom cake name input */}
          {selectedProductId === CUSTOM_CAKE_VALUE && (
            <Input
              label="Cake Name"
              placeholder="e.g. Mango Truffle Custom Cake"
              value={customCakeName}
              onChange={(e) => setCustomCakeName(e.target.value)}
            />
          )}

          {/* 3. Experience comment */}
          <Textarea
            label="How was your experience? *"
            required
            rows={3}
            placeholder="Share how fresh the cake was, the taste, decoration quality, and delivery experience..."
            value={reviewerComment}
            onChange={(e) => setReviewerComment(e.target.value)}
          />

          {/* 4. Recommendation */}
          <Textarea
            label="What would you recommend to someone choosing this cake?"
            rows={3}
            placeholder="Describe the taste, flavor profile, portion size, best occasion, presentation quality, or delivery experience — any tip that would help others decide!"
            value={reviewerRecommendation}
            onChange={(e) => setReviewerRecommendation(e.target.value)}
          />

          {/* 5. Media upload */}
          <div>
            <label className="block text-xs font-semibold text-brand-espresso mb-1.5">
              Cake Photo / Video <span className="text-brand-muted font-normal">(optional — images up to 5MB, videos up to 25MB)</span>
            </label>

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-brand-border rounded-2xl p-5 flex flex-col items-center gap-2 text-brand-muted hover:border-brand-plum/50 hover:text-brand-plum hover:bg-brand-blush/20 transition-all cursor-pointer"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-medium">Click to upload photo or video</span>
                <span className="text-[10px]">JPEG, PNG, WEBP or MP4, WebM</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-brand-border bg-brand-cream-light">
                {/* Preview */}
                {isFileVideo ? (
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={filePreviewUrl!}
                      controls
                      preload="metadata"
                      className="max-h-48 max-w-full"
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center overflow-hidden">
                    <img
                      src={filePreviewUrl!}
                      alt="Selected media preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* File info bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-brand-border/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isFileVideo
                      ? <Play className="w-3.5 h-3.5 text-brand-plum shrink-0" />
                      : <Upload className="w-3.5 h-3.5 text-brand-plum shrink-0" />
                    }
                    <span className="text-[11px] text-brand-espresso truncate max-w-[160px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-brand-muted shrink-0">
                      ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-brand-muted hover:text-red-500 transition-colors p-1 cursor-pointer"
                    aria-label="Remove selected file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Upload error */}
            {uploadError && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <X className="w-3.5 h-3.5 shrink-0" />
                {uploadError}
              </p>
            )}

            {/* Upload progress indicator */}
            {isUploading && (
              <div className="mt-2 flex items-center gap-2 text-xs text-brand-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-plum" />
                <span>Uploading media...</span>
              </div>
            )}
          </div>

          {/* 6. Display name */}
          <Input
            label="Your Name / Display Name *"
            required
            placeholder="e.g. Pooja Kulkarni"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseModal}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              {isUploading ? 'Uploading...' : isSubmittingFeedback ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
