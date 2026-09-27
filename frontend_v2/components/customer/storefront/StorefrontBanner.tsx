'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  Star,
  Truck,
  Leaf,
  Palette,
  ChevronRight,
  ChevronLeft,
  Phone,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { StatusBadge } from '@/components/common/StatusBadge';

import { getSafeImageUrl, isDummyOrInvalidImageUrl, FALLBACK_BAKERY_COVER } from '@/lib/utils/image';

interface StorefrontBannerProps {
  shop: Shop;
}

export const StorefrontBanner: React.FC<StorefrontBannerProps> = ({ shop }) => {
  const activeBanners = (shop.banners || []).filter((b) => b.isActive);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Auto-advance multi-banner slideshow every 6 seconds
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const [logoSrc, setLogoSrc] = useState<string | null>(
    !isDummyOrInvalidImageUrl(shop.logoUrl) ? shop.logoUrl! : null
  );

  const addressParts = [shop.area, shop.city, shop.state].filter(Boolean);
  const displayAddress =
    addressParts.length > 0 ? addressParts.join(', ') : `${shop.city || 'Pune'}, ${shop.state || 'Maharashtra'}`;

  const rawPhone = shop.whatsappNumber || shop.phone || shop.businessPhone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const heroBannerEnabled = shop.storefrontSettings?.heroBannerEnabled !== false;
  const whatsappEnabled = shop.storefrontSettings?.whatsappEnabled !== false;
  const ratingsEnabled = shop.storefrontSettings?.ratingsEnabled !== false;

  const currentBanner = activeBanners.length > 0 ? activeBanners[currentBannerIndex] : null;
  const bannerImg = getSafeImageUrl(
    currentBanner?.imageUrl || shop.coverImageUrl,
    FALLBACK_BAKERY_COVER
  );

  const [effectiveBannerImg, setEffectiveBannerImg] = useState(bannerImg);

  useEffect(() => {
    setEffectiveBannerImg(bannerImg);
  }, [bannerImg]);

  return (
    <section className="bg-[#FAF7F2] border-b border-brand-border/60 pb-8 sm:pb-12">
      {/* Luxury Hero Banner (Respects heroBannerEnabled) */}
      {heroBannerEnabled && (
        <div className="h-[340px] sm:h-[420px] w-full relative overflow-hidden bg-[#2C1A1D]">
          <Image
            src={effectiveBannerImg}
            alt={currentBanner?.title || shop.businessName}
            fill
            priority
            className="object-cover object-center opacity-65 transition-all duration-700 ease-in-out"
            onError={() => setEffectiveBannerImg(FALLBACK_BAKERY_COVER)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#140a0c] via-[#2C1A1D]/40 to-black/30" />

          {/* Centered Hero Content */}
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <div className="max-w-3xl flex flex-col items-center">
              <span className="text-[#C5A880] font-semibold tracking-[0.2em] uppercase text-xs sm:text-sm mb-3 drop-shadow-md">
                Welcome to {shop.businessName}
              </span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-white leading-tight mb-4 drop-shadow-xl">
                {currentBanner?.title || "Handcrafted Cakes for Life's Sweetest Moments"}
              </h2>
              <p className="text-xs sm:text-base text-[#FAF7F2]/90 font-light mb-6 max-w-xl drop-shadow-md">
                {currentBanner?.subtitle ||
                  'Premium cakes • Custom designs • Freshly baked • Made with love'}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <Link
                  href={currentBanner?.buttonUrl || '?tab=shop'}
                  className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-[#5C1D2E] text-white text-xs sm:text-sm font-semibold shadow-lg hover:bg-[#4a1525] hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>{currentBanner?.buttonText || 'Explore Cakes'}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                {shop.storefrontSettings?.customCakesEnabled !== false && (
                  <Link
                    href="?tab=custom-cakes"
                    className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-black/40 border border-[#C5A880] text-[#C5A880] text-xs sm:text-sm font-semibold hover:bg-[#C5A880]/20 transition-all flex items-center gap-2 backdrop-blur-md"
                  >
                    <Palette className="w-4 h-4" />
                    <span>Order Custom Cake</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Multi-banner Navigation Controls */}
          {activeBanners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setCurrentBannerIndex(
                    (prev) => (prev - 1 + activeBanners.length) % activeBanners.length
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                aria-label="Previous banner"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
                aria-label="Next banner"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentBannerIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentBannerIndex
                        ? 'w-6 bg-[#C5A880]'
                        : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                    aria-label={`Go to banner ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 4-Pillar Trust Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5 mt-6 pt-2">
            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white shadow-soft border border-brand-border/60 hover:border-[#C5A880]/60 transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] flex items-center justify-center mb-2.5 border border-brand-border/40">
                <Leaf className="w-5 h-5 text-[#5C1D2E]" />
              </div>
              <h4 className="font-bold text-[#2C1A1D] text-xs sm:text-sm">Fresh Ingredients</h4>
              <p className="text-[11px] text-brand-muted mt-0.5">Always Trusted</p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white shadow-soft border border-brand-border/60 hover:border-[#C5A880]/60 transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] flex items-center justify-center mb-2.5 border border-brand-border/40">
                <Palette className="w-5 h-5 text-[#5C1D2E]" />
              </div>
              <h4 className="font-bold text-[#2C1A1D] text-xs sm:text-sm">Custom Designs</h4>
              <p className="text-[11px] text-brand-muted mt-0.5">Made for You</p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white shadow-soft border border-brand-border/60 hover:border-[#C5A880]/60 transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] flex items-center justify-center mb-2.5 border border-brand-border/40">
                <Truck className="w-5 h-5 text-[#5C1D2E]" />
              </div>
              <h4 className="font-bold text-[#2C1A1D] text-xs sm:text-sm">On-Time Delivery</h4>
              <p className="text-[11px] text-brand-muted mt-0.5">Across {shop.city || 'Your City'}</p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white shadow-soft border border-brand-border/60 hover:border-[#C5A880]/60 transition-all hover:-translate-y-0.5">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] flex items-center justify-center mb-2.5 border border-brand-border/40">
                {ratingsEnabled && shop.averageRating && shop.averageRating > 0 ? (
                  <Star className="w-5 h-5 text-[#C5A880] fill-[#C5A880]" />
                ) : (
                  <Sparkles className="w-5 h-5 text-[#C5A880]" />
                )}
              </div>
              {ratingsEnabled && shop.averageRating && shop.averageRating > 0 ? (
                <>
                  <h4 className="font-bold text-[#2C1A1D] text-xs sm:text-sm">
                    {shop.averageRating.toFixed(1)}★ Rating
                  </h4>
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    {shop.totalReviews || 0} Customer Reviews
                  </p>
                </>
              ) : (
                <>
                  <h4 className="font-bold text-[#2C1A1D] text-xs sm:text-sm">Artisanal Bakes</h4>
                  <p className="text-[11px] text-brand-muted mt-0.5">Handcrafted Daily</p>
                </>
              )}
            </div>
          </div>
        </div>
    </section>
  );
};
