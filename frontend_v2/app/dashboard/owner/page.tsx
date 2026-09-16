'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Cake, ShoppingBag, TrendingUp, Clock, Plus, ArrowRight,
  Calendar, MessageSquareQuote, Settings, Globe,
  AlertCircle, Truck, CheckCircle2, Award, AlertTriangle,
  Sparkles, ExternalLink, Store,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { ordersApi } from '@/lib/api/orders';
import { deliverySlotsApi } from '@/lib/api/deliverySlots';
import { Order } from '@/types/order';
import { OwnerDashboardStats, DashboardAnalytics, CustomCakeRequest } from '@/types/owner';
import { DeliverySlot } from '@/types/deliverySlot';
import { useOwner } from '@/context/OwnerContext';
import OwnerGreeting from '@/components/OwnerGreeting';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';

export default function OwnerOverviewPage() {
  // Authoritative shop state strictly from OwnerContext
  const { registerRefreshHandler, shop } = useOwner();

  const [stats, setStats] = useState<OwnerDashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>([]);
  const [customCakeRequests, setCustomCakeRequests] = useState<CustomCakeRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [_refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setIsLoading(true);
    setError(null);

    // If shop is PENDING, operational endpoints require active subscription and will return 403
    if (shop?.status === 'PENDING') {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Parallel fetch of all operational data without duplicate shop profile calls
      const [statsRes, ordersRes, analyticsRes, slotsRes, customCakesRes] = await Promise.allSettled([
        ownerApi.getDashboardStats(),
        ordersApi.getOwnerOrders(),
        ownerApi.getAnalytics(),
        deliverySlotsApi.getOwnerSlots(),
        ownerApi.getCustomCakeRequests(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (ordersRes.status === 'fulfilled') {
        const sorted = [...(ordersRes.value || [])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setOrders(sorted);
      }
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (slotsRes.status === 'fulfilled') setDeliverySlots(slotsRes.value || []);
      if (customCakesRes.status === 'fulfilled') setCustomCakeRequests(customCakesRes.value || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [shop?.status]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Connect active page refresh to the header Refresh action
  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchDashboardData(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchDashboardData]);

  if (isLoading) return <LoadingState message="Loading bakery operational command center..." />;

  // Real KPI Metrics
  const totalProducts = stats?.totalProducts ?? 0;
  const activeProducts = stats?.activeProducts ?? 0;
  const pendingOrders = stats?.pendingOrders ?? orders.filter(o => {
    const s = String(o.orderStatus || o.status || '').toUpperCase();
    return s === 'PENDING' || s === 'CONFIRMED' || s === 'NEW';
  }).length;
  const totalOrders = stats?.totalOrders ?? orders.length;
  const totalRevenue = stats?.totalRevenue ?? 0;

  // Real Phase 6A 7-Day Sales Velocity
  const rawSales = analytics?.salesByDay || {};
  const dayEntries = Object.entries(rawSales);
  const dayValues = dayEntries.map(([, v]) => Number(v) || 0);
  const maxSale = Math.max(...dayValues, 100);

  // Real Top Selling Products from Phase 6A
  const topProductsList = Object.entries(analytics?.topSellingProducts || {}).slice(0, 5);

  // Operational Today's Deliveries Filter
  const todayDateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const todayDeliveries = orders.filter((o) => {
    const orderDeliveryDate = o.deliveryDate ? o.deliveryDate.split('T')[0] : '';
    const s = String(o.orderStatus || o.status || '').toUpperCase();
    return orderDeliveryDate === todayDateStr && s !== 'CANCELLED';
  });

  // Actionable Attention Counters
  const pendingConfirmationOrders = orders.filter(o => {
    const s = String(o.orderStatus || o.status || '').toUpperCase();
    return s === 'NEW' || s === 'PENDING';
  }).length;
  const unscheduledTodayDeliveries = todayDeliveries.filter(o => !o.deliverySlotId).length;
  const pendingCustomEnquiries = customCakeRequests.filter(r => r.status === 'PENDING').length;
  const inactiveCatalogCakes = Math.max(0, totalProducts - activeProducts);
  const totalActionItems = pendingConfirmationOrders + unscheduledTodayDeliveries + pendingCustomEnquiries + inactiveCatalogCakes;

  // Status Badge Helper
  const renderStatusBadge = (statusStr?: string) => {
    const s = (statusStr || 'PENDING').toUpperCase();
    if (s === 'COMPLETED' || s === 'DELIVERED') return <Badge variant="success" size="sm">{s}</Badge>;
    if (s === 'CANCELLED') return <Badge variant="error" size="sm">{s}</Badge>;
    if (s === 'PREPARING' || s === 'READY' || s === 'OUT_FOR_DELIVERY') return <Badge variant="default" size="sm">{s.replace(/_/g, ' ')}</Badge>;
    return <Badge variant="warning" size="sm">{s}</Badge>;
  };

  const isPending = shop?.status === 'PENDING';
  const isExpired = shop?.status === 'EXPIRED';

  const checklistItems = [
    {
      title: 'Bakery Profile & Location Details',
      description: 'Business name, contact phone, city address, and FSSAI registration number',
      completed: Boolean(shop?.businessName && shop?.addressLine1 && (shop?.phone || shop?.city)),
      href: '/dashboard/owner/settings',
      badge: 'Step 1',
    },
    {
      title: 'Storefront Branding & Visual Identity',
      description: 'Upload bakery logo, brand cover banner, and custom about story',
      completed: Boolean(shop?.logoUrl || shop?.coverImageUrl),
      href: '/dashboard/owner/website',
      badge: 'Step 2',
    },
    {
      title: 'Delivery Windows & Preparation Lead Times',
      description: 'Define available delivery intervals, cutoff times, and order slot capacity',
      completed: deliverySlots.length > 0,
      href: '/dashboard/owner/delivery-slots',
      badge: 'Step 3',
    },
    {
      title: 'First Signature Cake in Catalog',
      description: 'Add your first cake product with flavor variants and eggless pricing',
      completed: totalProducts > 0,
      href: '/dashboard/owner/products',
      badge: 'Step 4',
    },
    {
      title: 'Preview Digital Storefront',
      description: 'Review your live storefront presentation before sharing with customers',
      completed: false,
      href: `/shop/${shop?.id || ''}`,
      external: true,
      badge: 'Step 5',
    },
  ];

  const completedSteps = checklistItems.filter((i) => i.completed).length;
  const totalSteps = checklistItems.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {/* 1. Greeting Section — Time-based greeting with live date/time badge */}
      <OwnerGreeting businessName={shop?.businessName} />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Onboarding Activation Hero Card (PENDING status) */}
      {isPending && (
        <div className="bg-gradient-to-r from-brand-espresso via-brand-plum to-brand-burgundy rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-blush text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Registration Complete &bull; Activation Required</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif leading-tight">
              Activate Your Digital Bakery Storefront
            </h2>
            <p className="text-xs sm:text-sm text-brand-cream/85 leading-relaxed">
              Your bakery registration is complete! Complete your platform subscription to activate your live storefront, start receiving customer orders, and unlock full access to orders, catalog, and kitchen management.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link href="/dashboard/owner/subscription">
                <Button size="lg" className="bg-brand-gold hover:bg-brand-gold/90 text-brand-espresso font-bold gap-2 shadow-lg">
                  <span>Activate Bakery</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <span className="text-xs text-brand-cream/70">
                0% sales commission &bull; Instant activation
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Expired Subscription Hero Card */}
      {isExpired && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-brand-espresso rounded-3xl p-6 sm:p-8 text-white shadow-card relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 text-xs font-semibold backdrop-blur-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>License Expired</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif leading-tight">
              Renew Your Bakery SaaS License
            </h2>
            <p className="text-xs sm:text-sm text-rose-100/85 leading-relaxed">
              Your monthly CakeStore license has expired. Your storefront remains accessible to customers via direct URL, but management tools and order processing require an active subscription.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link href="/dashboard/owner/subscription">
                <Button size="lg" className="bg-white hover:bg-rose-50 text-rose-900 font-bold gap-2 shadow-lg">
                  <span>Renew Subscription</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <span className="text-xs text-rose-200/70">
                Instant license extension &bull; 0% commission
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bakery Setup Checklist Section */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-owner-border">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-lg text-owner-heading">Bakery Setup Checklist</h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum">
                {completedSteps} of {totalSteps} Completed
              </span>
            </div>
            <p className="text-xs text-owner-muted mt-0.5">
              Essential steps to configure your commercial bakery and start delighting customers
            </p>
          </div>

          <div className="w-full sm:w-48">
            <div className="flex items-center justify-between text-[11px] font-medium text-owner-muted mb-1.5">
              <span>Setup Readiness</span>
              <span className="font-bold text-brand-plum">{progressPercent}%</span>
            </div>
            <div className="w-full bg-owner-canvas rounded-full h-2 overflow-hidden border border-owner-border/50">
              <div
                className="bg-brand-plum h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-owner-border/60 pt-2">
          {checklistItems.map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-owner-border flex items-center justify-center text-[10px] font-bold text-owner-muted">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-semibold ${item.completed ? 'text-owner-muted line-through' : 'text-owner-heading'}`}>
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-medium text-owner-muted bg-owner-canvas px-1.5 py-0.2 rounded border border-owner-border">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-owner-muted truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.external ? (
                <Link
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-plum hover:text-brand-espresso transition-colors"
                >
                  <span>Preview</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  href={item.href}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-brand-plum hover:text-brand-espresso transition-colors"
                >
                  <span>Configure</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Operational Dashboard: Only rendered when NOT pending and NOT expired */}
      {!isPending && !isExpired && (
        <>
          {/* 2. Primary KPI Row — Realized Revenue, Orders, Catalog, Pending */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-owner-muted">Active Cakes</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-brand-plum flex items-center justify-center">
              <Cake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-owner-heading mt-2">{activeProducts}</p>
          <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center mt-1">
            {totalProducts} listed in catalog
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-owner-muted">Pending Action</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-owner-heading mt-2">{pendingOrders}</p>
          <span className="text-[11px] text-amber-600 font-medium inline-flex items-center mt-1">
            Orders requiring kitchen action
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-owner-muted">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-owner-heading mt-2">{totalOrders}</p>
          <span className="text-[11px] text-blue-600 font-medium inline-flex items-center mt-1">
            Lifetime customer orders
          </span>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-owner-muted">Realized Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-owner-heading mt-2">
            ₹{Number(totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center mt-1">
            Net realized revenue
          </span>
        </Card>
      </div>

      {/* 3. Quick Actions Bar — 6 operational shortcuts (No duplicate View Store) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          href="/dashboard/owner/products"
          className="p-3.5 bg-white rounded-2xl border border-owner-border hover:border-brand-plum/40 hover:shadow-soft transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center group-hover:bg-brand-plum group-hover:text-white transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-owner-heading truncate">Add New Cake</span>
        </Link>

        <Link
          href="/dashboard/owner/orders"
          className="p-3.5 bg-white rounded-2xl border border-owner-border hover:border-brand-plum/40 hover:shadow-soft transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-owner-heading truncate">Manage Orders</span>
        </Link>

        <Link
          href="/dashboard/owner/delivery-slots"
          className="p-3.5 bg-white rounded-2xl border border-owner-border hover:border-brand-plum/40 hover:shadow-soft transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-700 group-hover:text-white transition-colors shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-owner-heading truncate">Delivery Slots</span>
        </Link>

        <Link
          href="/dashboard/owner/enquiries"
          className="p-3.5 bg-white rounded-2xl border border-owner-border hover:border-brand-plum/40 hover:shadow-soft transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-700 group-hover:text-white transition-colors shrink-0">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-owner-heading truncate">Custom Enquiries</span>
        </Link>

        <Link
          href="/dashboard/owner/website"
          className="p-3.5 bg-white rounded-2xl border border-owner-border hover:border-brand-plum/40 hover:shadow-soft transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-owner-heading truncate">Storefront Branding</span>
        </Link>

        <Link
          href="/dashboard/owner/settings"
          className="p-3.5 bg-white rounded-2xl border border-owner-border hover:border-brand-plum/40 hover:shadow-soft transition-all flex items-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition-colors shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-owner-heading truncate">Bank & Settings</span>
        </Link>
      </div>

      {/* 4. Main Section — Recent Orders & Real Weekly Sales Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Recent Orders Table */}
        <Card className="lg:col-span-7 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-owner-border mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-owner-heading">Recent Orders</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-blush text-brand-plum rounded-full border border-brand-blush-border">
                  {orders.length}
                </span>
              </div>
              <Link href="/dashboard/owner/orders">
                <Button variant="ghost" size="sm">
                  View All Orders <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-owner-canvas flex items-center justify-center mx-auto text-owner-muted border border-owner-border">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-owner-heading">No orders yet</p>
                  <p className="text-[11px] text-owner-muted max-w-xs mx-auto">
                    Orders placed on your public storefront will appear here in real-time.
                  </p>
                </div>
                <Link href="/dashboard/owner/products" className="inline-block pt-1">
                  <Button size="sm" variant="outline">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add your first cake
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-owner-border text-owner-muted bg-owner-canvas/40">
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Delivery Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-owner-border">
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-owner-canvas/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-owner-heading">
                          <Link href="/dashboard/owner/orders" className="hover:text-brand-plum underline">
                            #{ord.orderNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-medium text-owner-heading">
                          {ord.customerName || 'Guest Customer'}
                        </td>
                        <td className="py-3 px-3 text-owner-muted whitespace-nowrap">
                          {ord.deliveryDate || new Date(ord.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 font-bold text-owner-heading">
                          ₹{Number(ord.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            (ord.paymentStatus || '').toUpperCase() === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {ord.paymentStatus || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {renderStatusBadge(ord.orderStatus || ord.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-owner-border mt-3 flex justify-end">
            <Link
              href="/dashboard/owner/orders"
              className="text-[11px] font-bold text-owner-muted hover:text-brand-plum transition-colors"
            >
              Go to order fulfillment &rarr;
            </Link>
          </div>
        </Card>

        {/* Right Column (5 cols): Real Weekly Sales Velocity & Top Products */}
        <Card className="lg:col-span-5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-owner-border mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-owner-heading">Weekly Sales Velocity</h3>
                <p className="text-xs text-owner-muted">7-day realized sales distribution</p>
              </div>
              <Link href="/dashboard/owner/analytics">
                <Button variant="ghost" size="sm">
                  Deep Analytics <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {/* 7-Day Real Chart */}
            <div className="grid grid-cols-7 gap-2 sm:gap-3 h-36 items-end pt-3 pb-2 px-1">
              {dayEntries.map(([dayName, val], idx) => {
                const numVal = Number(val) || 0;
                const heightPercent = numVal > 0 ? Math.max(12, Math.round((numVal / maxSale) * 100)) : 8;
                const isLastDay = idx === dayEntries.length - 1; // today

                return (
                  <div key={dayName} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-bold text-owner-heading bg-white px-1 py-0.5 rounded shadow-2xs border border-owner-border opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ₹{numVal.toLocaleString('en-IN')}
                    </span>
                    <div className="w-full bg-owner-canvas rounded-xl h-full flex items-end p-1 overflow-hidden border border-owner-border/40">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-lg transition-all duration-500 ${
                          numVal > 0
                            ? isLastDay
                              ? 'bg-gradient-to-t from-brand-plum to-brand-plum-hover shadow-2xs'
                              : 'bg-gradient-to-t from-brand-plum/60 to-brand-plum/80'
                            : 'bg-slate-200'
                        }`}
                      />
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${isLastDay ? 'text-brand-plum font-bold' : 'text-owner-muted'}`}>
                      {dayName.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Top Selling Products Sub-Section */}
            <div className="mt-6 pt-4 border-t border-owner-border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif font-bold text-xs text-owner-heading flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Top Selling Cakes
                </h4>
                <span className="text-[10px] text-owner-muted font-medium">By units sold</span>
              </div>

              {topProductsList.length === 0 ? (
                <p className="text-[11px] text-owner-muted italic py-2 text-center">
                  No sales recorded for specific cakes yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {topProductsList.map(([cakeName, units], i) => (
                    <div key={cakeName} className="flex items-center justify-between text-xs py-1 px-2 rounded-xl hover:bg-owner-canvas transition-colors">
                      <span className="font-medium text-owner-heading truncate pr-2 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-brand-blush text-brand-plum text-[10px] font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="truncate">{cakeName}</span>
                      </span>
                      <span className="font-bold text-owner-heading shrink-0 text-[11px]">
                        {units} {units === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 5. Secondary Section — Today's Deliveries & Attention Required */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Today's Deliveries Operational Card */}
        <Card className="lg:col-span-7 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-owner-border mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-owner-heading">Today&apos;s Deliveries</h3>
                  <p className="text-xs text-owner-muted">Orders scheduled for today ({todayDateStr})</p>
                </div>
              </div>
              <Link href="/dashboard/owner/delivery-slots">
                <Button variant="ghost" size="sm">
                  Delivery Windows <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>

            {todayDeliveries.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="w-11 h-11 rounded-2xl bg-owner-canvas flex items-center justify-center mx-auto text-owner-muted border border-owner-border">
                  <Truck className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-owner-heading">No deliveries scheduled for today.</p>
                <p className="text-[11px] text-owner-muted max-w-sm mx-auto">
                  Upcoming delivery orders for tomorrow and subsequent dates can be planned in the Delivery Slots workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayDeliveries.map((ord) => {
                  const slot = deliverySlots.find(s => s.id === ord.deliverySlotId);
                  const slotTimeStr = slot 
                    ? `${slot.startTime.slice(0, 5)} – ${slot.endTime.slice(0, 5)}`
                    : 'Unscheduled / Anytime Today';
                  const cakeNote = ord.items?.[0]?.cakeMessage;

                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl border border-owner-border bg-owner-canvas/30 hover:bg-owner-canvas transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-owner-heading">
                            #{ord.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-owner-border text-[10px] font-bold text-brand-plum">
                            {slotTimeStr}
                          </span>
                          {renderStatusBadge(ord.orderStatus || ord.status)}
                        </div>
                        <p className="font-semibold text-owner-heading truncate">
                          {ord.customerName || 'Guest Customer'}
                          {ord.customerPhone ? ` · ${ord.customerPhone}` : ''}
                        </p>
                        {cakeNote && (
                          <p className="text-[11px] text-owner-muted italic truncate">
                            &quot;{cakeNote}&quot;
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="font-bold text-sm text-owner-heading">
                          ₹{Number(ord.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <Link href="/dashboard/owner/orders">
                          <Button size="sm" variant="outline" className="text-xs">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-owner-border mt-3 flex justify-end">
            <Link
              href="/dashboard/owner/delivery-slots"
              className="text-[11px] font-bold text-owner-muted hover:text-brand-plum transition-colors"
            >
              Configure bakery delivery windows &rarr;
            </Link>
          </div>
        </Card>

        {/* Right Column (5 cols): Attention Required Operational Card */}
        <Card className="lg:col-span-5 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-owner-border mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-owner-heading">Attention Required</h3>
                  <p className="text-xs text-owner-muted">Actionable kitchen & catalog alerts</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                totalActionItems > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {totalActionItems > 0 ? `${totalActionItems} items` : 'All Clear'}
              </span>
            </div>

            {totalActionItems === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-owner-heading">You&apos;re all caught up.</p>
                <p className="text-[11px] text-owner-muted max-w-xs mx-auto">
                  No pending kitchen actions, unscheduled deliveries, or unreviewed custom requests.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingConfirmationOrders > 0 && (
                  <Link
                    href="/dashboard/owner/orders"
                    className="p-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="font-semibold text-owner-heading">
                        {pendingConfirmationOrders} {pendingConfirmationOrders === 1 ? 'order' : 'orders'} awaiting action
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform">
                      Review &rarr;
                    </span>
                  </Link>
                )}

                {unscheduledTodayDeliveries > 0 && (
                  <Link
                    href="/dashboard/owner/orders"
                    className="p-3 rounded-2xl border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-rose-700 shrink-0" />
                      <span className="font-semibold text-owner-heading">
                        {unscheduledTodayDeliveries} today&apos;s {unscheduledTodayDeliveries === 1 ? 'delivery' : 'deliveries'} without slot
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-rose-800 group-hover:translate-x-0.5 transition-transform">
                      Assign &rarr;
                    </span>
                  </Link>
                )}

                {pendingCustomEnquiries > 0 && (
                  <Link
                    href="/dashboard/owner/enquiries"
                    className="p-3 rounded-2xl border border-purple-200/80 bg-purple-50/50 hover:bg-purple-50 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <MessageSquareQuote className="w-4 h-4 text-purple-700 shrink-0" />
                      <span className="font-semibold text-owner-heading">
                        {pendingCustomEnquiries} custom cake {pendingCustomEnquiries === 1 ? 'request' : 'requests'} pending
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-purple-800 group-hover:translate-x-0.5 transition-transform">
                      Quote &rarr;
                    </span>
                  </Link>
                )}

                {inactiveCatalogCakes > 0 && (
                  <Link
                    href="/dashboard/owner/products"
                    className="p-3 rounded-2xl border border-owner-border bg-owner-canvas/40 hover:bg-owner-canvas transition-colors flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Cake className="w-4 h-4 text-owner-muted shrink-0" />
                      <span className="font-medium text-owner-heading">
                        {inactiveCatalogCakes} {inactiveCatalogCakes === 1 ? 'cake' : 'cakes'} inactive in catalog
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-brand-plum group-hover:translate-x-0.5 transition-transform">
                      Stock &rarr;
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-owner-border mt-3 flex justify-end">
            <Link
              href="/dashboard/owner/orders"
              className="text-[11px] font-bold text-owner-muted hover:text-brand-plum transition-colors"
            >
              Order queue management &rarr;
            </Link>
          </div>
        </Card>
      </div>
        </>
      )}
    </div>
  );
}
