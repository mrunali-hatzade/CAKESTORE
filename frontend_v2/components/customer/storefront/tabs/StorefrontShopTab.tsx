'use client';

import React, { useState } from 'react';
import { Cake, Sparkles } from 'lucide-react';
import { Shop } from '@/types/shop';
import { Product, Category } from '@/types/product';
import { StickyCategoryBar, ProductSortOption } from '../StickyCategoryBar';
import { ProductCard } from '../ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFavorites } from '@/context/FavoritesContext';

interface StorefrontShopTabProps {
  shop: Shop;
  products: Product[];
  categories: Category[];
  searchQuery?: string;
  onSelectProduct: (product: Product) => void;
  onOpenCustomQuote: () => void;
}

export const StorefrontShopTab: React.FC<StorefrontShopTabProps> = ({
  shop,
  products,
  categories,
  searchQuery = '',
  onSelectProduct,
  onOpenCustomQuote,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<'ALL' | 'SAVED' | number>('ALL');
  const [egglessOnly, setEgglessOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<ProductSortOption>('RECOMMENDED');
  const { isFavorite } = useFavorites();

  const customCakesEnabled = shop.storefrontSettings?.customCakesEnabled !== false;

  // Enhanced search: checks name, description, category name, and category tag
  const filteredProducts = products.filter((p) => {
    let matchesCategory = true;
    if (selectedCategoryId === 'SAVED') {
      matchesCategory = isFavorite(p.id);
    } else if (selectedCategoryId !== 'ALL') {
      matchesCategory = p.categoryId === selectedCategoryId;
    }

    const q = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (q) {
      const categoryObj = categories.find((c) => c.id === p.categoryId);
      const catName = (p.categoryName || categoryObj?.name || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      matchesSearch = pName.includes(q) || pDesc.includes(q) || catName.includes(q);
    }

    const matchesEggless = !egglessOnly || p.isEggless;

    return matchesCategory && matchesSearch && matchesEggless;
  });

  // Apply sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'PRICE_ASC') return a.price - b.price;
    if (sortBy === 'PRICE_DESC') return b.price - a.price;
    if (sortBy === 'TOP_RATED') return (b.rating || 0) - (a.rating || 0);
    if (sortBy === 'NEWEST') return (b.id || 0) - (a.id || 0);
    return 0; // RECOMMENDED
  });

  return (
    <div className="space-y-6">
      {/* Sticky In-Store Category Navigation */}
      <StickyCategoryBar
        shop={shop}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        egglessOnly={egglessOnly}
        onToggleEggless={() => setEgglessOnly(!egglessOnly)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onOpenCustomQuote={onOpenCustomQuote}
      />

      {/* Catalog Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-brand-border/60">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-espresso">
            {selectedCategoryId === 'SAVED' ? 'Your Saved Cakes' : 'Artisanal Cake Catalog'}
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">
            {selectedCategoryId === 'SAVED'
              ? 'Cakes you have favorited for your upcoming celebrations'
              : 'Personalize flavors, weights, and custom messages with dedicated in-store fulfillment'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-muted">
          <span className="font-semibold text-brand-espresso">{sortedProducts.length}</span>{' '}
          {sortedProducts.length === 1 ? 'cake' : 'cakes'} available
          {selectedCategoryId === 'SAVED' && (
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200 flex items-center gap-1">
              ❤️ Wishlist
            </span>
          )}
          {typeof selectedCategoryId === 'number' && (
            <span className="px-2 py-0.5 rounded-full bg-brand-blush text-brand-plum font-bold">
              {categories.find((c) => c.id === selectedCategoryId)?.name || 'Filtered'}
            </span>
          )}
          {egglessOnly && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              🌱 Eggless
            </span>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {sortedProducts.length === 0 ? (
        <EmptyState
          icon={<Cake className="w-7 h-7" />}
          title="No Cakes Found"
          description="No items match your search or filter. Try searching for a different cake style or clearing the filter."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              shop={shop}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* Bespoke Custom Cake In-Store Banner Card (Placed Below Cakes Section if enabled) */}
      {customCakesEnabled && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-brand-blush via-white to-brand-cream border border-brand-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-soft mb-8">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-brand-plum text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm sm:text-base text-brand-espresso">
                Looking for a custom theme or photo cake?
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Share reference photos and event specifications directly with {shop.businessName}&apos;s chef.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenCustomQuote}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-brand-plum hover:bg-brand-plum-hover text-white text-xs font-bold transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Request Custom Quote</span>
          </button>
        </div>
      )}
    </div>
  );
};
