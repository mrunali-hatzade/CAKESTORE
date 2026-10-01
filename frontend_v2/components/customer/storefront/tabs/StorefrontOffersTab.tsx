'use client';

import React, { useEffect, useState } from 'react';
import { Tag, Copy, Check, Sparkles, Percent, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Shop } from '@/types/shop';
import { StorefrontTab } from '../StorefrontTabNav';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/common/Toast';
import { apiClient } from '@/lib/api/client';
import { storefrontApi } from '@/lib/api/storefront';
import { useCart } from '@/context/CartContext';

interface PublicCoupon {
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue?: number;
  maxDiscountCap?: number;
  expiryDate?: string;
}

interface StorefrontOffersTabProps {
  shop: Shop;
  onNavigateTab: (tab: StorefrontTab) => void;
}

export const StorefrontOffersTab: React.FC<StorefrontOffersTabProps> = ({
  shop,
  onNavigateTab,
}) => {
  const toast = useToast();
  const { items, totalPrice, appliedCoupon, setAppliedCoupon, setIsCartOpen } = useCart();
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchCoupons() {
      try {
        const data = await apiClient.get<PublicCoupon[]>(`/api/storefront/shops/${shop.id}/coupons`);
        if (isMounted) {
          setCoupons(data || []);
        }
      } catch {
        if (isMounted) setCoupons([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    fetchCoupons();
    return () => {
      isMounted = false;
    };
  }, [shop.id]);

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Coupon "${code}" copied to clipboard!`);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleApplyToCart = async (coupon: PublicCoupon) => {
    if (items.length === 0) {
      handleCopyCode(coupon.code);
      toast.info(`Code "${coupon.code}" copied! Add a cake to your cart to enjoy this offer.`);
      return;
    }

    setApplyingCode(coupon.code);
    try {
      const res = await storefrontApi.validateCoupon(shop.id, coupon.code, totalPrice);
      if (res.valid && res.code) {
        setAppliedCoupon({
          code: res.code,
          discountType: (res.discountType as 'PERCENTAGE' | 'FLAT') || coupon.discountType,
          discountValue: res.discountValue || coupon.discountValue,
          discountAmount: res.discountAmount || 0,
        });
        toast.success(`Coupon "${res.code}" applied! You save ₹${res.discountAmount}`);
        setIsCartOpen(true);
      } else {
        toast.error(res.message || 'Cannot apply coupon to current cart.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to validate coupon.');
    } finally {
      setApplyingCode(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info('Coupon removed from cart.');
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-xs font-semibold">
          <Tag className="w-3.5 h-3.5" />
          <span>Exclusive Bakery Discounts</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-espresso">
          Coupons &amp; Special Offers
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
          Apply these verified discount codes at checkout to enjoy savings on your handcrafted celebration cakes.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-brand-muted">
          Checking available offers for {shop.businessName}...
        </div>
      ) : coupons.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-cream flex items-center justify-center text-brand-plum mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-serif font-bold text-brand-espresso">No Active Promo Codes Right Now</h2>
          <p className="text-xs text-brand-muted max-w-md mx-auto">
            {shop.businessName} currently offers standard honest bakery pricing with zero markups. Check back soon for seasonal promotions!
          </p>
          <div className="pt-2">
            <Button onClick={() => onNavigateTab('shop')} className="font-bold">
              <span>Browse Cake Menu</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {coupons.map((coupon) => {
            const isApplied = appliedCoupon?.code?.toUpperCase() === coupon.code.toUpperCase();
            const isApplying = applyingCode === coupon.code;

            return (
              <Card
                key={coupon.code}
                className={`p-6 relative overflow-hidden border-2 transition-all flex flex-col justify-between group ${
                  isApplied
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-md'
                    : 'border-dashed border-brand-border hover:border-brand-plum/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-brand-plum uppercase tracking-wider">
                          Bakery Offer
                        </span>
                        {isApplied && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Applied in Cart</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-serif font-bold text-brand-espresso mt-0.5">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.discountValue}% OFF`
                          : `₹${coupon.discountValue} FLAT OFF`}
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-brand-blush flex items-center justify-center text-brand-plum shrink-0">
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-brand-muted">
                    {coupon.minOrderValue && coupon.minOrderValue > 0 ? (
                      <p>• Min order value: <strong>₹{coupon.minOrderValue}</strong></p>
                    ) : (
                      <p>• No minimum order required</p>
                    )}
                    {coupon.maxDiscountCap && coupon.maxDiscountCap > 0 && (
                      <p>• Maximum savings cap: <strong>₹{coupon.maxDiscountCap}</strong></p>
                    )}
                    {coupon.expiryDate ? (
                      <p>• Valid till: <strong>{new Date(coupon.expiryDate).toLocaleDateString()}</strong></p>
                    ) : (
                      <p>• Ongoing seasonal offer</p>
                    )}
                  </div>
                </div>

                {/* Code Box & Action */}
                <div className="mt-5 pt-4 border-t border-brand-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-3 py-1.5 rounded-xl bg-brand-cream-light font-mono text-xs font-bold text-brand-espresso border border-brand-border tracking-wider">
                      {coupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(coupon.code)}
                      className="p-1.5 text-brand-muted hover:text-brand-plum hover:bg-brand-cream rounded-lg transition-colors cursor-pointer"
                      title="Copy Code"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isApplied ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isApplying}
                      onClick={() => handleApplyToCart(coupon)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-plum text-white text-xs font-bold hover:bg-brand-plum-hover transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      <span>{isApplying ? 'Applying...' : items.length > 0 ? 'Apply to Cart' : 'Use Code'}</span>
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Terms Box */}
      <div className="p-5 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60 text-xs text-brand-muted space-y-1.5">
        <div className="flex items-center gap-1.5 text-brand-espresso font-semibold">
          <ShieldCheck className="w-4 h-4 text-brand-plum" />
          <span>How to use coupons:</span>
        </div>
        <p>1. Click &ldquo;Apply to Cart&rdquo; on any active offer above, or copy the code.</p>
        <p>2. Add your favorite handcrafted celebration cakes to your cart.</p>
        <p>3. Review your discount directly in the cart drawer and checkout tab before completing your order.</p>
      </div>
    </div>
  );
};
