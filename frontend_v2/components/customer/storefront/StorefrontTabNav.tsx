'use client';

import React from 'react';
import {
  Home,
  ShoppingBag,
  Info,
  Tag,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

import { Shop } from '@/types/shop';

export type StorefrontTab =
  | 'home'
  | 'shop'
  | 'about'
  | 'offers'
  | 'custom-cakes'
  | 'gallery'
  | 'contact'
  | 'track'
  | 'checkout';

interface StorefrontTabNavProps {
  shop?: Shop | null;
  activeTab: StorefrontTab;
  onTabChange: (tab: StorefrontTab) => void;
  productCount?: number;
  offersCount?: number;
}

export const StorefrontTabNav: React.FC<StorefrontTabNavProps> = ({
  shop,
  activeTab,
  onTabChange,
  productCount = 0,
  offersCount = 0,
}) => {
  const customCakesEnabled = shop?.storefrontSettings?.customCakesEnabled !== false;

  const allTabs: { id: StorefrontTab; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shop', label: 'Shop Cakes', icon: ShoppingBag, badge: productCount > 0 ? productCount : undefined },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'offers', label: 'Offers & Coupons', icon: Tag, badge: offersCount > 0 ? offersCount : undefined },
    { id: 'custom-cakes', label: 'Custom Cakes', icon: Sparkles },
    { id: 'gallery', label: 'Cake Gallery', icon: ImageIcon },
    { id: 'contact', label: 'Contact Us', icon: MessageSquare },
    { id: 'track', label: 'Track Order', icon: Truck },
  ];

  const tabs = allTabs.filter((tab) => {
    if (tab.id === 'custom-cakes' && !customCakesEnabled) return false;
    return true;
  });

  return (
    <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-brand-border/60 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth"
          aria-label="Bakery Mini-Website Tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 select-none cursor-pointer',
                  isActive
                    ? 'bg-brand-plum text-white shadow-xs'
                    : 'bg-brand-cream-light/60 text-brand-espresso hover:bg-brand-blush/60 hover:text-brand-plum border border-brand-border/40'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-white' : 'text-brand-plum')} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-cream text-brand-espresso'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
