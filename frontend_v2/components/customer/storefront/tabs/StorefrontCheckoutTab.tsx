'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  CheckCircle2,
  Calendar,
  MapPin,
  ArrowRight,
  Store,
  CreditCard,
  Banknote,
  Download,
  Tag,
  AlertCircle,
  ArrowLeft,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { DeliverySlot } from '@/types/deliverySlot';
import { Order } from '@/types/order';
import { useCart } from '@/context/CartContext';
import { ordersApi } from '@/lib/api/orders';
import { deliverySlotsApi } from '@/lib/api/deliverySlots';
import { storefrontApi } from '@/lib/api/storefront';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/common/Toast';
import { paymentsService } from '@/lib/services/payments';
import { ShopDeliveryConfig } from '@/types/shop';

interface StorefrontCheckoutTabProps {
  shop: Shop;
  onNavigateTab: (tab: any) => void;
}

const FALLBACK_CAKE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80';

export const StorefrontCheckoutTab: React.FC<StorefrontCheckoutTabProps> = ({
  shop,
  onNavigateTab,
}) => {
  const router = useRouter();
  const { items, totalPrice, clearCart, appliedCoupon } = useCart();
  const toast = useToast();

  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(undefined);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('COD');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  // Always fetch the latest delivery config fresh from the API when checkout loads
  const [liveDeliveryConfig, setLiveDeliveryConfig] = useState<ShopDeliveryConfig | null>(
    shop.deliveryConfig || null
  );

  useEffect(() => {
    if (shop?.id) {
      deliverySlotsApi
        .getStorefrontSlots(shop.id, deliveryDate || undefined)
        .then(setSlots)
        .catch(() => setSlots([]));
    }
  }, [shop?.id, deliveryDate]);

  // Fetch fresh delivery config every time checkout tab is shown
  useEffect(() => {
    if (shop?.id) {
      storefrontApi.getShopById(shop.id)
        .then((freshShop) => {
          if (freshShop?.deliveryConfig) {
            setLiveDeliveryConfig(freshShop.deliveryConfig);
          }
        })
        .catch(() => {/* keep existing config on error */});
    }
  }, [shop?.id]);

  // Dynamic delivery charge calculation based on live deliveryConfig
  const deliveryConfig = liveDeliveryConfig;
  let deliveryCharge = 0;
  if (items.length > 0) {
    if (deliveryConfig?.deliveryChargeType === 'FIXED') {
      const fixedAmount = Number(deliveryConfig.fixedChargeAmount) || 0;
      const minFree = deliveryConfig.minOrderForFreeDelivery;
      if (minFree && minFree > 0 && totalPrice >= minFree) {
        deliveryCharge = 0;
      } else {
        deliveryCharge = fixedAmount;
      }
    } else if (deliveryConfig?.deliveryChargeType === 'FREE') {
      deliveryCharge = 0;
    } else {
      // Default fallback if no config set
      deliveryCharge = 0;
    }
  }

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = Math.max(0, totalPrice - discountAmount + deliveryCharge);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Your store basket is empty.');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = customerPhone.trim().replace(/^0+/, '');
    if (!cleanPhone || !/^\+?[1-9]\d{9,14}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit mobile number (e.g. 9876543210).');
      return;
    }

    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!deliveryAddress.trim()) {
      setError('Please enter your delivery street address.');
      return;
    }

    if (!deliveryDate) {
      setError('Please select a delivery date.');
      return;
    }

    if (!selectedSlotId) {
      setError('Please select a delivery slot window.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const backendPaymentMethod = paymentMethod === 'ONLINE' ? 'ONLINE_PAYMENT' : 'COD';

    try {
      const order = await ordersApi.createGuestOrder(shop.id, {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: cleanPhone,
        paymentMethod: backendPaymentMethod,
        deliveryAddress: deliveryAddress.trim(),
        deliveryDate,
        deliverySlotId: selectedSlotId,
        specialInstructions: specialInstructions.trim() || undefined,
        couponCode: appliedCoupon?.code || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          customMessage: i.customMessage,
          variantId: i.variantId,
          dietaryPreference: i.dietaryPreference || (i.isEggless ? 'EGGLESS' : 'REGULAR'),
          cakeMessage: i.customMessage,
        })),
      });

      if (paymentMethod === 'ONLINE') {
        await paymentsService.initiatePayment({
          orderId: order.orderNumber,
          amount: finalTotal,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: cleanPhone,
          shopName: shop.businessName,
          onSuccess: (paymentId) => {
            clearCart();
            setConfirmedOrder(order);
            toast.success(`Payment verified (${paymentId})! Order confirmed.`);
          },
          onFailure: (_errMsg) => {
            clearCart();
            setConfirmedOrder(order);
            toast.info('Order placed! Payment can be completed upon delivery.');
          },
        });
      } else {
        clearCart();
        setConfirmedOrder(order);
        toast.success('Order placed successfully with the bakery!');
      }
    } catch (err: any) {
      const isSlotFull = err?.error === 'SLOT_FULL' || err?.message?.includes('SLOT_FULL') || err?.message?.toLowerCase().includes('fully booked');
      if (isSlotFull) {
        setError('This delivery slot is fully booked. Please select another slot.');
        if (shop?.id) {
          deliverySlotsApi.getStorefrontSlots(shop.id, deliveryDate || undefined)
            .then(setSlots)
            .catch(() => {});
        }
        setSelectedSlotId(undefined);
      } else {
        setError(err.message || 'Failed to place order. Please check details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (orderNumber: string) => {
    setIsDownloadingInvoice(true);
    try {
      await ordersApi.downloadStorefrontInvoice(orderNumber);
      toast.success('Tax invoice downloaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download tax invoice PDF');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-2xl mx-auto py-6 sm:py-10">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-brand-border shadow-soft text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Order Confirmed
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-espresso">
              Thank You, {confirmedOrder.customerName || customerName}!
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
              Your order has been directly sent to <strong>{shop.businessName}</strong>&apos;s kitchen.
            </p>
          </div>

          <div className="bg-[#FAF7F2] rounded-2xl p-5 border border-brand-border/70 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <span className="text-xs text-brand-muted font-medium">Order Number</span>
              <span className="font-serif font-bold text-base text-brand-plum">
                #{confirmedOrder.orderNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-brand-muted block text-[11px]">Delivery Date</span>
                <span className="font-semibold text-brand-espresso">{confirmedOrder.deliveryDate}</span>
              </div>
              <div>
                <span className="text-brand-muted block text-[11px]">Payment Mode</span>
                <span className="font-semibold text-brand-espresso">
                  {confirmedOrder.paymentMethod === 'ONLINE_PAYMENT' ? 'Paid Online' : 'Pay on Delivery'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs font-bold">
              <span className="text-brand-espresso">Total Amount</span>
              <span className="font-serif font-bold text-base text-brand-espresso">
                ₹{confirmedOrder.totalAmount}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => handleDownloadInvoice(confirmedOrder.orderNumber)}
              isLoading={isDownloadingInvoice}
              className="w-full sm:w-auto text-xs font-semibold gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download Invoice</span>
            </Button>

            <button
              onClick={() => onNavigateTab('track')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-brand-plum hover:bg-brand-plum-hover text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Track Order Live</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-brand-muted mx-auto border border-brand-border shadow-soft">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-brand-espresso">Your Store Basket is Empty</h2>
        <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto">
          Explore {shop.businessName}&apos;s handcrafted cakes and confections to start your order.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigateTab('shop')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-plum text-white text-xs font-bold hover:bg-brand-plum-hover transition-all shadow-sm"
          >
            <span>Browse Cake Menu</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-8">
      {/* Header with Back to Shop */}
      <div className="flex items-center justify-between pb-4 border-b border-brand-border/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (items.length === 1 && items[0].productId) {
                router.push(`/shop/${shop.id}/product/${items[0].productId}`);
              } else if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                onNavigateTab('shop');
              }
            }}
            className="p-2 -ml-2 rounded-full text-brand-muted hover:text-brand-espresso hover:bg-brand-cream transition-colors cursor-pointer"
            title="Back to product"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-espresso">
              Delivery &amp; Checkout
            </h1>
            <p className="text-xs text-brand-muted mt-0.5">
              Direct artisanal fulfillment by {shop.businessName}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Direct Bakery Order</span>
        </div>
      </div>

      {error && (
        <ErrorState
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Delivery & Contact Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Details */}
          <div className="bg-white rounded-3xl p-6 border border-brand-border/80 shadow-soft space-y-4">
            <h2 className="text-base font-serif font-bold text-brand-espresso pb-2 border-b border-brand-border/40">
              1. Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Your Full Name"
                required
                placeholder="e.g. Priya Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Mobile Number (10 digits)"
                required
                placeholder="9876543210"
                value={customerPhone}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/^0+/, '');
                  setCustomerPhone(sanitized);
                }}
              />
            </div>
            <Input
              label="Email Address (for invoice & kitchen updates)"
              type="email"
              required
              placeholder="priya@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          {/* Delivery Details */}
          <div className="bg-white rounded-3xl p-6 border border-brand-border/80 shadow-soft space-y-4">
            <h2 className="text-base font-serif font-bold text-brand-espresso pb-2 border-b border-brand-border/40">
              2. Delivery Address &amp; Schedule
            </h2>

            <Input
              label="Delivery Street Address"
              required
              placeholder="e.g. Flat 302, Green Valley Apartments, MG Road"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Delivery Date"
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
              <Select
                label="Delivery Slot Window"
                required
                options={[
                  { value: '', label: 'Select Delivery Window' },
                  ...slots.map((s) => {
                    const dayLabel = s.dayOfWeek ? s.dayOfWeek.charAt(0) + s.dayOfWeek.slice(1).toLowerCase() : 'Everyday';
                    const timeRange = `${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`;
                    let statusSuffix = '';
                    if (s.available === false) {
                      statusSuffix = ' — [Fully Booked]';
                    } else if (s.remainingCapacity !== undefined) {
                      statusSuffix = s.remainingCapacity <= 2 ? ` — [Only ${s.remainingCapacity} left]` : ` — [${s.remainingCapacity} available]`;
                    }
                    return {
                      value: s.id,
                      label: `${dayLabel} (${timeRange})${statusSuffix}`,
                      disabled: s.available === false,
                    };
                  }),
                ]}
                value={selectedSlotId || ''}
                onChange={(e) => setSelectedSlotId(e.target.value ? Number(e.target.value) : undefined)}
                helperText={slots.length === 0 ? 'No delivery slots found for this bakery' : undefined}
              />
            </div>

            <Textarea
              label="Special Delivery Instructions (Optional)"
              placeholder="e.g. Ring bell twice or call on arrival"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
            />
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-3xl p-6 border border-brand-border/80 shadow-soft space-y-4">
            <h2 className="text-base font-serif font-bold text-brand-espresso pb-2 border-b border-brand-border/40">
              3. Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                  paymentMethod === 'COD'
                    ? 'bg-brand-blush/80 border-brand-plum text-brand-espresso shadow-xs'
                    : 'bg-white border-brand-border hover:bg-brand-cream/40 text-brand-espresso'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentMethod === 'COD' ? 'bg-brand-plum text-white' : 'bg-brand-cream text-brand-plum'
                }`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">Pay on Delivery</p>
                  <p className="text-[11px] text-brand-muted mt-0.5">Cash or UPI upon delivery</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ONLINE')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                  paymentMethod === 'ONLINE'
                    ? 'bg-brand-blush/80 border-brand-plum text-brand-espresso shadow-xs'
                    : 'bg-white border-brand-border hover:bg-brand-cream/40 text-brand-espresso'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  paymentMethod === 'ONLINE' ? 'bg-brand-plum text-white' : 'bg-brand-cream text-brand-plum'
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">Pay Online</p>
                  <p className="text-[11px] text-brand-muted mt-0.5">Instant UPI, Cards & Netbanking</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Order Summary & Place Order CTA */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-brand-border/80 shadow-soft space-y-5 sticky top-28">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
              <h2 className="text-base font-serif font-bold text-brand-espresso">
                Order Summary
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-brand-border/40 space-y-3 pr-1 text-xs">
              {items.map((i) => (
                <div key={i.productId} className="pt-2.5 first:pt-0 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-brand-cream shrink-0 border border-brand-border/60">
                      <img
                        src={i.imageUrl || FALLBACK_CAKE}
                        alt={i.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_CAKE;
                        }}
                      />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-brand-espresso block truncate">
                        {i.name} &times; {i.quantity}
                      </span>
                      <span className="text-[11px] text-brand-muted block">
                        {i.isEggless ? '🌱 Eggless' : 'Contains Egg'}
                      </span>
                      {i.customMessage && (
                        <span className="block text-[11px] text-brand-plum italic truncate">
                          Plaque: &quot;{i.customMessage}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-serif font-bold text-brand-espresso shrink-0">
                    ₹{i.price * i.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-brand-border/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-brand-muted">
                <span>Subtotal:</span>
                <span className="font-medium text-brand-espresso">₹{totalPrice}</span>
              </div>

              {appliedCoupon && (
                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span>Coupon ({appliedCoupon.code}):</span>
                  <span>-₹{appliedCoupon.discountAmount}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-brand-muted">
                <span>Delivery Charge:</span>
                <span className="font-medium text-brand-espresso">
                  {deliveryCharge === 0 ? (
                    <span className="text-emerald-700 font-semibold">FREE</span>
                  ) : (
                    `₹${deliveryCharge}`
                  )}
                </span>
              </div>

              <div className="pt-2.5 border-t border-brand-border/60 flex items-baseline justify-between font-bold text-sm">
                <span className="text-brand-espresso">Total Payable:</span>
                <span className="font-serif font-bold text-2xl text-brand-plum">
                  ₹{finalTotal}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              isLoading={isSubmitting}
              className="w-full font-bold h-12 rounded-2xl shadow-sm text-sm bg-[#5C1D2E] hover:bg-[#4a1525]"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span>{paymentMethod === 'ONLINE' ? 'Pay Online with Razorpay' : 'Place Bakery Order (COD)'}</span>
            </Button>

            <p className="text-[11px] text-brand-muted text-center leading-relaxed">
              Your order is prepared fresh on the morning of delivery by {shop.businessName}.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
