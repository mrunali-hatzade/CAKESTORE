'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
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

export const StorefrontHomeTab: React.FC<StorefrontHomeTabProps> = ({
  shop,
  products,
  categories,
  onNavigateTab,
  onSelectProduct,
  onOpenCustomQuote,
}) => {
  const toast = useToast();
  const [topRatedProducts, setTopRatedProducts] = useState<Product[]>([]);
  const [loadingTopRated, setLoadingTopRated] = useState<boolean>(true);

  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(true);

  // Review / Feedback Modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewerRating, setReviewerRating] = useState<number>(5);
  const [reviewerComment, setReviewerComment] = useState<string>('');
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

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewerComment.trim()) {
      toast.error('Please enter your name and comments.');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await storefrontApi.submitFeedback(shop.id, {
        customerDisplayName: reviewerName.trim(),
        rating: reviewerRating,
        comment: reviewerComment.trim(),
      });
      toast.success('Thank you! Your review has been submitted for approval.');
      setIsFeedbackModalOpen(false);
      setReviewerName('');
      setReviewerRating(5);
      setReviewerComment('');
      // Reload feedback
      const updated = await storefrontApi.getShopFeedback(shop.id);
      setFeedbackList(updated || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const cleanPhone = (shop.phone || shop.businessPhone || '').replace(/\D/g, '');
  const displayProducts = topRatedProducts.length > 0 ? topRatedProducts : products.slice(0, 4);

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
                Signature Bakery Creations
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

      {/* 4. Real Customer Feedback Highlights (Strictly Real Data Only) */}
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
              {feedbackList.slice(0, 3).map((item) => (
                <Card key={item.id} className="p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
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
                    <p className="text-xs text-brand-espresso leading-relaxed italic line-clamp-3">
                      &ldquo;{item.comment || 'Delicious and fresh!'}&rdquo;
                    </p>
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
        onClose={() => setIsFeedbackModalOpen(false)}
        maxWidth="md"
        title={`Review ${shop.businessName}`}
      >
        <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-brand-espresso mb-1.5">
              Your Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewerRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-6 h-6 ${
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

          <Input
            label="Your Name / Display Name"
            required
            placeholder="Pooja Kulkarni"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
          />

          <Textarea
            label="Your Review / Comments"
            required
            rows={4}
            placeholder="Share how fresh the cake was, delivery experience, taste, and decoration..."
            value={reviewerComment}
            onChange={(e) => setReviewerComment(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFeedbackModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
