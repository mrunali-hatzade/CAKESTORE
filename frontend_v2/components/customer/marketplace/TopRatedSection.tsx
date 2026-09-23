'use client';

import React from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { Shop } from '@/types/shop';
import { BakeryCard } from './BakeryCard';
import { Card } from '@/components/ui/Card';

interface TopRatedSectionProps {
  shops: Shop[];
  isLoading: boolean;
  error: string | null;
  title?: string;
  subtitle?: string;
}

const TopRatedSkeleton = () => (
  <Card className="h-full flex flex-col overflow-hidden border border-brand-border/70 bg-white p-0 rounded-3xl animate-pulse shadow-sm min-h-[320px]">
    <div className="aspect-[16/9] w-full bg-brand-cream/80 relative"></div>
    <div className="pt-6 p-5 sm:p-6 flex flex-col flex-1 space-y-3">
      <div className="h-5 bg-brand-cream/80 rounded-lg w-3/4" />
      <div className="h-3.5 bg-brand-cream/60 rounded-md w-1/2" />
    </div>
  </Card>
);

export const TopRatedSection: React.FC<TopRatedSectionProps> = ({
  shops,
  isLoading,
  error,
  title = 'Top Rated Bakeries',
  subtitle,
}) => {
  if (error) {
    return null; // Fail gracefully without breaking the layout
  }

  if (!isLoading && shops.length === 0) {
    return null; // Do not show section if no top rated bakeries exist for this filter
  }

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-espresso tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-brand-muted mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <TopRatedSkeleton key={idx} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {shops.map((shop) => (
            <BakeryCard key={shop.id} shop={shop} />
          ))}
        </div>
      )}
    </section>
  );
};
