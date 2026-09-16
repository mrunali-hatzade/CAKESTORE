'use client';

import React from 'react';
import { Sparkles, Heart, ArrowUpDown } from 'lucide-react';
import { Category } from '@/types/product';
import { Shop } from '@/types/shop';
import { useFavorites } from '@/context/FavoritesContext';

export type ProductSortOption = 'RECOMMENDED' | 'TOP_RATED' | 'PRICE_ASC' | 'PRICE_DESC' | 'NEWEST';

interface StickyCategoryBarProps {
  shop?: Shop;
  categories: Category[];
  selectedCategoryId: 'ALL' | 'SAVED' | number;
  onSelectCategory: (id: 'ALL' | 'SAVED' | number) => void;
  egglessOnly: boolean;
  onToggleEggless: () => void;
  sortBy?: ProductSortOption;
  onSortChange?: (sort: ProductSortOption) => void;
  onOpenCustomQuote: () => void;
}

export const StickyCategoryBar: React.FC<StickyCategoryBarProps> = ({
  shop,
  categories,
  selectedCategoryId,
  onSelectCategory,
  egglessOnly,
  onToggleEggless,
  sortBy = 'RECOMMENDED',
  onSortChange,
  onOpenCustomQuote,
}) => {
  const { totalFavorites } = useFavorites();

  const categoriesEnabled = shop?.storefrontSettings?.categoriesEnabled !== false;
  const filtersEnabled = shop?.storefrontSettings?.filtersEnabled !== false;
  const customCakesEnabled = shop?.storefrontSettings?.customCakesEnabled !== false;

  return (
    <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-brand-border/80 shadow-2xs py-3 px-4 sm:px-6 lg:px-8 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onSelectCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
              selectedCategoryId === 'ALL'
                ? 'bg-brand-plum text-white border-brand-plum shadow-xs'
                : 'bg-brand-cream-light/60 text-brand-espresso border-brand-border/80 hover:bg-brand-blush/60'
            }`}
          >
            All Items
          </button>

          {totalFavorites > 0 && (
            <button
              type="button"
              onClick={() => onSelectCategory('SAVED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                selectedCategoryId === 'SAVED'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${selectedCategoryId === 'SAVED' ? 'fill-white' : 'fill-rose-500'}`} />
              <span>Saved Cakes ({totalFavorites})</span>
            </button>
          )}

          {categoriesEnabled &&
            categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                  selectedCategoryId === cat.id
                    ? 'bg-brand-plum text-white border-brand-plum shadow-xs'
                    : 'bg-brand-cream-light/60 text-brand-espresso border-brand-border/80 hover:bg-brand-blush/60'
                }`}
              >
                {cat.name}
              </button>
            ))}
        </div>

        {/* Filters, Sorting & Custom Cake Action */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
          {filtersEnabled && (
            <>
              {/* Eggless Only Toggle */}
              <button
                type="button"
                onClick={onToggleEggless}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  egglessOnly
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${egglessOnly ? 'bg-white' : 'bg-emerald-600'}`} />
                <span>Eggless</span>
              </button>

              {/* Sort By Select */}
              {onSortChange && (
                <div className="relative inline-flex items-center">
                  <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value as ProductSortOption)}
                    aria-label="Sort cakes by"
                    className="text-xs font-semibold bg-white border border-brand-border/80 text-brand-espresso rounded-full py-1.5 pl-3 pr-7 focus:outline-none focus:border-brand-plum cursor-pointer appearance-none shadow-2xs"
                  >
                    <option value="RECOMMENDED">Recommended</option>
                    <option value="TOP_RATED">Top Rated</option>
                    <option value="PRICE_ASC">Price: Low to High</option>
                    <option value="PRICE_DESC">Price: High to Low</option>
                    <option value="NEWEST">Newest</option>
                  </select>
                  <ArrowUpDown className="w-3 h-3 text-brand-muted absolute right-2.5 pointer-events-none" />
                </div>
              )}
            </>
          )}

          {/* Request Custom Cake Button */}
          {customCakesEnabled && (
            <button
              type="button"
              onClick={onOpenCustomQuote}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-brand-plum text-brand-plum hover:bg-brand-plum hover:text-white text-xs font-bold transition-all shadow-2xs shrink-0 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Custom Cake</span>
              <span className="sm:hidden">Custom</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
