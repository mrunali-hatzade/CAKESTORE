'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  Package,
  Store,
  Download,
  AlertCircle,
  Star,
  ShieldCheck,
  Calendar,
  Phone,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { Order } from '@/types/order';
import { ordersApi } from '@/lib/api/orders';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/common/Toast';

interface StorefrontTrackOrderTabProps {
  shop: Shop;
  onOpenReviewModal?: (order: Order, item: any) => void;
}

export const StorefrontTrackOrderTab: React.FC<StorefrontTrackOrderTabProps> = ({
  shop,
  onOpenReviewModal,
}) => {
  const toast = useToast();
  
  // State for flow
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'LIST' | 'DETAILS'>('PHONE');
  
  // State for forms
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [guestToken, setGuestToken] = useState<string | null>(null);
  
  // State for data
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // State for UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Use session storage for token persistence across refreshes (in same tab)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('cakeStoreGuestToken');
    if (savedToken) {
      setGuestToken(savedToken);
      fetchOrders(savedToken);
    }
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await ordersApi.requestTrackingOtp(phone);
      setStep('OTP');
      toast.success('OTP sent successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { token } = await ordersApi.verifyTrackingOtp(phone, otp);
      setGuestToken(token);
      sessionStorage.setItem('cakeStoreGuestToken', token);
      await fetchOrders(token);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrders = async (token: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ordersApi.getMyOrders(token, 0, 50);
      setOrders(data.content);
      setStep('LIST');
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Token expired
        sessionStorage.removeItem('cakeStoreGuestToken');
        setGuestToken(null);
        setStep('PHONE');
        setError('Your session has expired. Please request a new OTP.');
      } else {
        setError(err.message || 'Failed to fetch orders');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOrder = async (orderNumber: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch details to ensure we have the latest and to verify token works for it
      // Since getGuestOrderDetails requires the token now, we need to pass it or set it in axios.
      // Wait, our frontend `apiClient` doesn't automatically attach `guestToken`.
      // We already have the full order in the list, we can just display it!
      const order = orders.find(o => o.orderNumber === orderNumber);
      if (order) {
        setSelectedOrder(order);
        setStep('DETAILS');
      }
    } catch (err: any) {
      setError('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!selectedOrder) return;
    setIsDownloading(true);
    try {
      await ordersApi.downloadStorefrontInvoice(selectedOrder.orderNumber);
      toast.success('Tax invoice downloaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download invoice. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PLACED':
      case 'PENDING':
      case 'NEW': return 0;
      case 'PREPARING':
      case 'BAKING': return 1;
      case 'READY':
      case 'READY_FOR_PICKUP':
      case 'DISPATCHED':
      case 'OUT_FOR_DELIVERY': return 2;
      case 'DELIVERED':
      case 'COMPLETED': return 3;
      default: return 0;
    }
  };

  const stages = [
    { title: 'Order Placed', desc: 'Order received & confirmed', icon: CheckCircle2 },
    { title: 'Preparation', desc: 'Crafting your order', icon: Clock },
    { title: 'Ready/Dispatch', desc: 'Quality checked', icon: Package },
    { title: 'Completed', desc: 'Fulfilled successfully', icon: Truck },
  ];

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-xs font-semibold">
          <Truck className="w-3.5 h-3.5" />
          <span>Track My Orders</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-espresso">
          Your Order History
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
          Verify your phone number to securely access your order history and track active orders.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2 max-w-md mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PHONE STEP */}
      {step === 'PHONE' && (
        <Card className="max-w-md mx-auto p-6 border border-brand-border/80 shadow-soft">
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-espresso">Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum"
                />
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full font-bold">
              {isLoading ? 'Sending...' : 'Request OTP'}
            </Button>
          </form>
        </Card>
      )}

      {/* OTP STEP */}
      {step === 'OTP' && (
        <Card className="max-w-md mx-auto p-6 border border-brand-border/80 shadow-soft">
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-brand-espresso">Enter OTP</label>
              <p className="text-xs text-brand-muted">Sent to {phone}</p>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border text-center tracking-widest text-lg font-mono focus:outline-none focus:border-brand-plum focus:ring-1 focus:ring-brand-plum"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setStep('PHONE')} className="w-1/3">
                Back
              </Button>
              <Button type="submit" disabled={isLoading} className="w-2/3 font-bold">
                {isLoading ? 'Verifying...' : 'Verify Securely'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* LIST STEP */}
      {step === 'LIST' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-brand-espresso">Orders for {phone}</h3>
            <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem('cakeStoreGuestToken'); setStep('PHONE'); }}>
              Sign Out
            </Button>
          </div>
          
          {orders.length === 0 ? (
            <Card className="p-8 text-center border border-brand-border/80 shadow-soft">
              <Package className="w-12 h-12 text-brand-muted/50 mx-auto mb-3" />
              <p className="text-brand-muted text-sm">No orders found for this phone number.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-5 border border-brand-border/60 hover:border-brand-plum/40 transition-colors cursor-pointer group" onClick={() => handleViewOrder(order.orderNumber)}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-brand-plum uppercase tracking-wider">
                        {order.shopName || shop.businessName || 'Bakery'}
                      </span>
                      <p className="font-bold text-brand-espresso">#{order.orderNumber}</p>
                    </div>
                    <Badge variant={order.orderStatus === 'COMPLETED' || order.orderStatus === 'DELIVERED' ? 'success' : 'plum'} size="sm">
                      {order.orderStatus?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-brand-muted space-y-1 mb-4">
                    <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Placed: {new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5"/> Total: ₹{order.totalAmount} • {order.paymentMethod}</p>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-brand-border/40 pt-3">
                    <p className="text-[11px] text-brand-muted truncate max-w-[200px]">
                      {order.items?.map(i => i.productNameSnapshot).join(', ')}
                    </p>
                    <span className="text-xs font-bold text-brand-plum group-hover:underline">Track &rarr;</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILS STEP */}
      {step === 'DETAILS' && selectedOrder && (
        <div className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => setStep('LIST')} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </Button>
          
          <Card className="p-6 sm:p-8 space-y-6 border border-brand-border/80 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border/60">
              <div>
                <span className="text-[10px] font-bold text-brand-plum uppercase tracking-wider">
                  {selectedOrder.shopName || shop.businessName}
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-espresso mt-0.5">
                  Order #{selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-brand-muted mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    selectedOrder.orderStatus === 'DELIVERED' || selectedOrder.orderStatus === 'COMPLETED'
                      ? 'success'
                      : 'plum'
                  }
                  size="md"
                >
                  {selectedOrder.orderStatus?.replace(/_/g, ' ')}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadInvoice}
                  disabled={isDownloading}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading ? 'Downloading...' : 'Tax Invoice'}</span>
                </Button>
              </div>
            </div>

            {/* 4-Stage Timeline */}
            <div className="py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2 relative">
                {stages.map((stage, idx) => {
                  const currentIdx = getStageIndex(selectedOrder.orderStatus || '');
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;
                  const Icon = stage.icon;

                  return (
                    <div
                      key={stage.title}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isDone
                          ? 'bg-brand-blush/40 border-brand-plum/30'
                          : 'bg-brand-cream-light/40 border-brand-border/40 opacity-50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isDone
                              ? 'bg-brand-plum text-white shadow-xs'
                              : 'bg-brand-cream text-brand-muted'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="text-xs font-bold text-brand-espresso">{stage.title}</h3>
                        <p className="text-[11px] text-brand-muted leading-tight">{stage.desc}</p>
                      </div>
                      {isCurrent && (
                        <div className="mt-3 pt-2 border-t border-brand-plum/20">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-plum uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-plum animate-pulse" />
                            Current Stage
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ordered Items List */}
            <div className="space-y-3 pt-4 border-t border-brand-border/60">
              <h3 className="text-xs font-bold text-brand-espresso uppercase tracking-wider">
                Items ({selectedOrder.items?.length || 0})
              </h3>
              <div className="divide-y divide-brand-border/40">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-brand-espresso">
                        {item.quantity}x {item.productNameSnapshot}
                      </p>
                      {item.variantName && (
                        <p className="text-[11px] text-brand-muted">Size: {item.variantName}</p>
                      )}
                      {item.cakeMessage && (
                        <p className="text-[11px] text-brand-plum italic">
                          Message: &ldquo;{item.cakeMessage}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-brand-espresso">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery & Payment Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-brand-border/60 text-xs">
              <div className="space-y-1 text-brand-muted">
                <span className="font-bold text-brand-espresso block">Delivery Address</span>
                <p>{selectedOrder.deliveryAddress || 'Direct Doorstep Delivery'}</p>
                <p>Contact: {selectedOrder.customerPhone}</p>
              </div>
              <div className="space-y-1 text-brand-muted sm:text-right">
                <span className="font-bold text-brand-espresso block">Payment &amp; Total</span>
                <p>Method: <strong>{selectedOrder.paymentMethod || 'COD'}</strong></p>
                <p className="text-base font-serif font-bold text-brand-espresso pt-1">
                  Total: ₹{selectedOrder.totalAmount}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
