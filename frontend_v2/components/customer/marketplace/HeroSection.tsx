'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, ShieldCheck, Heart, Clock } from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { CategoryPills, CategoryOption } from './CategoryPills';
import { storefrontApi } from '@/lib/api/storefront';
import { PopularCity } from '@/types/shop';

interface HeroSectionProps {
  onSearch: (params: {
    search: string;
    location: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }) => void;
  activeCategory: string;
  onSelectCategory: (category: CategoryOption) => void;
  selectedLocation: string;
  onSelectLocation: (location: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearch,
  activeCategory,
  onSelectCategory,
  selectedLocation,
  onSelectLocation,
}) => {
  const [popularCities, setPopularCities] = useState<PopularCity[]>([]);

  useEffect(() => {
    let isMounted = true;
    storefrontApi
      .getPopularCities(8)
      .then((cities) => {
        if (isMounted && Array.isArray(cities) && cities.length > 0) {
          setPopularCities(cities);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-brand-cream-light pt-6 sm:pt-8 pb-12 sm:pb-14 px-4 sm:px-6 lg:px-8 border-b border-brand-border/60">
      {/* Background Bakers & Cake Kitchen Artwork on the Right */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/marketplace-hero-bakers.jpg"
          alt="Artisanal bakers preparing custom celebration cakes in Indian bakery kitchens"
          fill
          priority
          className="object-cover object-right sm:object-center opacity-75"
        />
        {/* Soft Warm Cream Gradient Overlay for crisp text legibility without muddy blur */}
        <div className="absolute inset-0 bg-gradient-to-r from-brand-cream-light via-brand-cream-light/95 sm:via-brand-cream-light/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-cream-light/50 via-transparent to-brand-cream-light" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blush/90 border border-brand-blush-border text-brand-plum text-xs font-semibold tracking-wide shadow-2xs mb-4 backdrop-blur-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-plum" />
          <span>India&apos;s Curated Artisanal Bakery Marketplace</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-brand-espresso leading-[1.12] max-w-4xl mx-auto">
          Celebrations Begin with <br className="hidden sm:inline" />
          <span className="text-brand-plum italic">Exceptional Cakes</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-sm sm:text-base lg:text-lg text-brand-muted max-w-2xl mx-auto font-normal leading-relaxed">
          Order handcrafted celebration cakes, cupcakes, and confections directly from certified independent home bakers and boutique studios in your neighborhood.
        </p>

        {/* Central Search Bar */}
        <div className="mt-8 max-w-2xl mx-auto">
          <SearchBar
            initialLocation={selectedLocation}
            onSearch={onSearch}
            className="shadow-elevated"
          />
        </div>

        {/* Dynamic Quick City Selector Bar from Phase 2.2 Endpoint */}
        {popularCities.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs text-brand-muted animate-in fade-in">
            <span className="font-semibold text-brand-espresso/80 mr-1 text-[11px] uppercase tracking-wider">
              Popular Cities:
            </span>
            {popularCities.map((pc) => (
              <button
                key={pc.cityName}
                type="button"
                onClick={() => {
                  onSelectLocation(pc.cityName);
                  onSearch({ search: '', location: pc.cityName });
                }}
                className={`px-2.5 py-1 rounded-full text-xs transition-all border ${
                  selectedLocation === pc.cityName
                    ? 'bg-brand-plum text-white border-brand-plum font-semibold shadow-2xs'
                    : 'bg-white/80 hover:bg-brand-blush/70 text-brand-espresso border-brand-border/60 hover:border-brand-plum/30'
                }`}
              >
                <span>{pc.cityName}</span>
                <span className="opacity-70 text-[10px] ml-1">({pc.activeBakeryCount})</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Category Filter Pills */}
        <div className="mt-6 flex justify-center">
          <CategoryPills
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
          />
        </div>

        {/* Trust Badges under Hero */}
        <div className="mt-10 pt-6 border-t border-brand-border/60 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-brand-muted font-medium">
          <span className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-full border border-brand-border/40 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-brand-espresso">FSSAI Certified</span>
          </span>
          <span className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-full border border-brand-border/40 shadow-2xs">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span className="font-semibold text-brand-espresso">100% Handcrafted</span>
          </span>
          <span className="flex items-center gap-2 bg-white/70 px-3 py-1.5 rounded-full border border-brand-border/40 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-brand-espresso">Direct Kitchen Fulfillment</span>
          </span>
        </div>
      </div>
    </section>
  );
};
