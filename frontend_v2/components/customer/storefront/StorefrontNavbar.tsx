'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Search, Phone, Heart, X } from 'lucide-react';
import { Shop } from '@/types/shop';
import { useCart } from '@/context/CartContext';
import { useFavorites } from '@/context/FavoritesContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { isDummyOrInvalidImageUrl } from '@/lib/utils/image';

interface StorefrontNavbarProps {
  shop: Shop;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const StorefrontNavbar: React.FC<StorefrontNavbarProps> = ({
  shop,
  searchQuery = '',
  onSearchChange,
}) => {
  const { totalItems, totalPrice, setIsCartOpen } = useCart();
  const { totalFavorites, setIsFavoritesOpen } = useFavorites();
  const [internalQuery, setInternalQuery] = useState('');

  const currentQuery = onSearchChange !== undefined ? searchQuery : internalQuery;
  const handleQueryChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalQuery(val);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-brand-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        {/* Bakery Brand Identity */}
        <div className="flex items-center gap-3">
          <Link
            href="/explore"
            className="p-2 -ml-2 rounded-full text-brand-muted hover:text-brand-espresso hover:bg-brand-cream/60 transition-colors cursor-pointer"
            title="Back to marketplace"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-blush text-brand-plum flex items-center justify-center font-serif font-bold text-lg shadow-sm border border-brand-plum/10 overflow-hidden shrink-0">
              {!isDummyOrInvalidImageUrl(shop.logoUrl) ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                shop.businessName.charAt(0)
              )}
            </div>
            <div className="hidden sm:block">
              <h1 className="font-serif font-bold text-lg text-[#2C1A1D] leading-tight">
                {shop.businessName}
              </h1>
              <span className="text-xs font-medium text-[#C5A880]">
                {shop.businessCategory || (shop.businessType ? shop.businessType.replace(/_/g, ' ') : 'Artisanal Bakery')}
              </span>
            </div>
          </div>
        </div>

        {/* Centered Pill Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-brand-muted group-focus-within:text-brand-plum transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-9 py-2 bg-white border border-brand-border rounded-full text-sm placeholder-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all shadow-sm"
              placeholder="Search cakes, flavours, categories..."
              value={currentQuery}
              onChange={(e) => handleQueryChange(e.target.value)}
            />
            {currentQuery && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-espresso cursor-pointer p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* In-Store Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {shop.storefrontSettings?.phoneEnabled !== false && (shop.phone || shop.businessPhone) && (
            <a
              href={`tel:${shop.phone || shop.businessPhone}`}
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-brand-muted hover:text-[#5C1D2E] transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>{shop.phone || shop.businessPhone}</span>
            </a>
          )}

          {/* Saved Cakes Wishlist Button */}
          <button
            type="button"
            onClick={() => setIsFavoritesOpen(true)}
            className="relative p-2.5 rounded-full bg-white border border-brand-border text-brand-espresso hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm group cursor-pointer"
            aria-label="Open saved cakes wishlist"
            title="Saved Cakes Wishlist"
          >
            <Heart
              className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                totalFavorites > 0 ? 'text-rose-500 fill-rose-500/30' : 'text-brand-espresso'
              }`}
            />
            {totalFavorites > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-rose-500 text-white text-[10px] font-bold rounded-full border-2 border-[#FAF7F2] shadow-sm">
                {totalFavorites}
              </span>
            )}
          </button>

          {/* Floating Cart Counter */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-full bg-white border border-brand-border text-brand-espresso hover:text-[#5C1D2E] hover:border-[#5C1D2E]/30 transition-all shadow-sm group cursor-pointer"
            aria-label="Open cart"
            title="Store Basket"
          >
            <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-[#5C1D2E] text-white text-[10px] font-bold rounded-full border-2 border-[#FAF7F2] shadow-sm">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Mobile Search Bar (visible only on small screens) */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-brand-muted" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-9 py-2 bg-white border border-brand-border rounded-full text-sm placeholder-brand-muted focus:outline-none focus:ring-1 focus:ring-brand-plum shadow-sm"
            placeholder="Search cakes..."
            value={currentQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
          {currentQuery && (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-espresso cursor-pointer p-1"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
