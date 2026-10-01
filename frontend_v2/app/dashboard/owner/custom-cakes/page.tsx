'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Cake,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Send,
  X,
  User,
  Eye,
  ShoppingBag,
  ArrowRight,
  Truck,
  Store,
  Banknote,
  CreditCard,
  Check,
  MapPin,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { deliverySlotsApi } from '@/lib/api/deliverySlots';
import { notificationsApi } from '@/lib/api/notifications';
import { storefrontApi } from '@/lib/api/storefront';
import { CustomCakeRequest, ConvertToOrderResult } from '@/types/owner';
import { DeliverySlot } from '@/types/deliverySlot';
import { useOwner } from '@/context/OwnerContext';
import { useToast } from '@/components/common/Toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

function OwnerCustomCakesContent() {
  const searchParams = useSearchParams();
  const { shop, registerRefreshHandler, refreshSidebarCounts } = useOwner();
  const toast = useToast();

  const [customCakes, setCustomCakes] = useState<CustomCakeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected item for review/quote modal
  const [selectedCake, setSelectedCake] = useState<CustomCakeRequest | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Quote response form state
  const [responseStatus, setResponseStatus] = useState<string>('QUOTED');
  const [responseText, setResponseText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // "Convert to Order" modal & form state
  const [convertingCake, setConvertingCake] = useState<CustomCakeRequest | null>(null);
  const [ownerDeliverySlots, setOwnerDeliverySlots] = useState<DeliverySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<ConvertToOrderResult | null>(null);

  const [convertForm, setConvertForm] = useState({
    agreedPrice: '',
    deliveryCharge: '0',
    deliveryDate: '',
    fulfillmentType: 'DOORSTEP_DELIVERY' as 'DOORSTEP_DELIVERY' | 'STORE_PICKUP',
    deliveryAddress: '',
    deliverySlotId: '',
    paymentMethod: 'COD',
    notes: '',
  });

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) setLoading(true);
    setError(null);

    try {
      const data = await ownerApi.getOwnerCustomCakeRequests();
      setCustomCakes(data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load custom cake requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedCustomCakesExample = async () => {
    if (!shop?.id) return;
    setIsSeeding(true);
    try {
      await storefrontApi.submitCustomCakeRequest(shop.id, {
        customerName: 'John Smith (Example)',
        customerMobile: '8888888888',
        customerEmail: 'john@example.com',
        occasion: 'Wedding',
        requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        servings: 50,
        cakeType: 'Tiered Fondant',
        flavour: 'Vanilla and Raspberry',
        designDescription: 'A 3-tier rustic floral cake with gold leaf detailing.',
        budget: 7500,
        referenceImageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
        deliveryPreference: 'DOORSTEP_DELIVERY'
      });
      toast.success('Example custom cake request generated!');
      await fetchData();
      refreshSidebarCounts();
    } catch (err: any) {
      toast.error('Failed to generate example: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // When owner views custom cakes, clear unread custom order request badge
    notificationsApi.markTypeAsRead('CUSTOM_ORDER_REQUEST')
      .then(() => refreshSidebarCounts?.())
      .catch(() => {});
  }, [refreshSidebarCounts]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchData(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchData]);

  // Deep-linking from Global Search or external links
  useEffect(() => {
    if (!searchParams) return;
    const reqId = searchParams.get('requestId');
    const s = searchParams.get('search');
    if (s) setSearchQuery(s);
    if (reqId && customCakes.length > 0) {
      const match = customCakes.find((c) => String(c.id) === String(reqId));
      if (match) setSelectedCake(match);
    }
  }, [searchParams, customCakes]);

  // Filtered requests
  const filteredCakes = useMemo(() => {
    return customCakes.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status?.toUpperCase() === statusFilter.toUpperCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.customerEmail && item.customerEmail.toLowerCase().includes(q)) ||
        (item.customerMobile && item.customerMobile.toLowerCase().includes(q)) ||
        (item.cakeType && item.cakeType.toLowerCase().includes(q)) ||
        (item.flavour && item.flavour.toLowerCase().includes(q)) ||
        (item.occasion && item.occasion.toLowerCase().includes(q)) ||
        (item.convertedOrderNumber && item.convertedOrderNumber.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [customCakes, statusFilter, searchQuery]);

  // KPI counters
  const totalCount = customCakes.length;
  const pendingCount = customCakes.filter((c) => (c.status === 'PENDING' || c.status === 'NEW') && !c.convertedOrderId).length;
  const quotedCount = customCakes.filter((c) => c.status === 'QUOTED' && !c.convertedOrderId).length;
  const acceptedCount = customCakes.filter((c) => c.status === 'ACCEPTED' || c.status === 'FULFILLED' || !!c.convertedOrderId).length;

  // Handle Review Modal open
  const handleOpenCakeModal = (cake: CustomCakeRequest) => {
    setSelectedCake(cake);
    setResponseStatus(
      cake.status === 'PENDING' || cake.status === 'NEW' ? 'QUOTED' : cake.status || 'QUOTED'
    );
    setResponseText(cake.ownerResponse || '');
    setActionSuccess(null);
    setActionError(null);
  };

  // Submit quote/response
  const handleSubmitCakeResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCake) return;
    setSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await ownerApi.respondToCustomCakeRequest(selectedCake.id, responseStatus, responseText);
      setActionSuccess('Quote & status saved! Notification email dispatched to customer.');
      setTimeout(() => {
        setSelectedCake(null);
        fetchData(true);
      }, 1200);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  // Open "Convert to Order" modal
  const handleOpenConvertModal = (cake: CustomCakeRequest) => {
    setConvertingCake(cake);
    setConvertSuccess(null);
    setConvertError(null);

    const initialPrice = cake.budget ? String(cake.budget) : '';
    const initialDate = cake.requiredDate || '';
    const isPickup = !!(cake.deliveryPreference && cake.deliveryPreference.toLowerCase().includes('pickup'));

    // Extract quote if mentioned in previous ownerResponse
    let extractedQuote = '';
    if (cake.ownerResponse) {
      const match = cake.ownerResponse.match(/₹\s*([0-9,]+)/);
      if (match) {
        extractedQuote = match[1].replace(/,/g, '');
      }
    }

    setConvertForm({
      agreedPrice: extractedQuote || initialPrice || '',
      deliveryCharge: isPickup ? '0' : '0',
      deliveryDate: initialDate,
      fulfillmentType: isPickup ? 'STORE_PICKUP' : 'DOORSTEP_DELIVERY',
      deliveryAddress: !isPickup ? (cake.deliveryPreference || '') : '',
      deliverySlotId: '',
      paymentMethod: 'COD',
      notes: cake.designDescription || '',
    });

    if (ownerDeliverySlots.length === 0) {
      setSlotsLoading(true);
      deliverySlotsApi.getOwnerSlots()
        .then((slots) => setOwnerDeliverySlots(slots || []))
        .catch(() => {})
        .finally(() => setSlotsLoading(false));
    }
  };

  // Execute Convert to Order
  const handleExecuteConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingCake) return;

    const priceNum = parseFloat(convertForm.agreedPrice || '0');
    if (isNaN(priceNum) || priceNum < 0) {
      setConvertError('Please specify a valid agreed price for this custom cake.');
      return;
    }

    const deliveryChargeNum = parseFloat(convertForm.deliveryCharge || '0');

    setIsConverting(true);
    setConvertError(null);

    try {
      const result = await ownerApi.convertToOrder(convertingCake.id, {
        agreedPrice: priceNum,
        deliveryCharge: isNaN(deliveryChargeNum) ? 0 : deliveryChargeNum,
        deliveryDate: convertForm.deliveryDate || undefined,
        fulfillmentType: convertForm.fulfillmentType,
        deliveryAddress: convertForm.fulfillmentType === 'DOORSTEP_DELIVERY' ? convertForm.deliveryAddress : undefined,
        deliverySlotId: convertForm.deliverySlotId ? Number(convertForm.deliverySlotId) : undefined,
        paymentMethod: convertForm.paymentMethod,
        paymentStatus: convertForm.paymentMethod === 'COD' ? 'PENDING' : 'PAID',
        notes: convertForm.notes,
      });

      setConvertSuccess(result);
      toast.success(`Custom cake converted to official Order #${result.orderNumber}!`);
      fetchData(true);
      refreshSidebarCounts?.();
    } catch (err: any) {
      setConvertError(err?.message || 'Failed to convert custom cake request to order.');
    } finally {
      setIsConverting(false);
    }
  };

  const getStatusBadge = (cake: CustomCakeRequest) => {
    if (cake.convertedOrderNumber || cake.convertedOrderId) {
      return (
        <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
          <span>Order #{cake.convertedOrderNumber || cake.convertedOrderId}</span>
        </Badge>
      );
    }
    switch ((cake.status || '').toUpperCase()) {
      case 'PENDING':
      case 'NEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'QUOTED':
        return <Badge variant="plum">Quote Sent</Badge>;
      case 'REVIEWED':
        return <Badge variant="info">Reviewed</Badge>;
      case 'ACCEPTED':
      case 'FULFILLED':
        return <Badge variant="success">Accepted</Badge>;
      case 'REJECTED':
      case 'DECLINED':
        return <Badge variant="error">Declined</Badge>;
      default:
        return <Badge variant="default">{cake.status || 'PENDING'}</Badge>;
    }
  };

  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.length === 10) digits = '91' + digits;
    return digits;
  };

  const formatSlotTime = (time?: string) => {
    if (!time) return '';
    try {
      const parts = time.split(':');
      let hour = parseInt(parts[0], 10);
      const min = parts[1] || '00';
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour.toString().padStart(2, '0')}:${min} ${ampm}`;
    } catch {
      return time;
    }
  };

  const formatRelativeOrDateTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDays = Math.floor(diffHr / 24);
      if (diffDays === 1) {
        return `Yesterday, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      }
      if (diffDays < 7) {
        return `${diffDays}d ago, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      }
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString || '';
    }
  };

  const formatFullDateTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString || '';
    }
  };

  if (loading) return <LoadingState message="Loading custom cake consultation briefs..." />;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bespoke Art & Celebration Studio</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Custom Cake Orders & Quotes
          </h1>
          <p className="text-xs text-owner-muted">
            Review bespoke cake briefs, evaluate reference photos, calculate custom quotes, and convert inquiries into official kitchen orders with 1 click.
          </p>
        </div>
        <div className="flex items-center shrink-0">
          <Button onClick={handleSeedCustomCakesExample} isLoading={isSeeding} size="sm" variant="outline" className="text-brand-plum border-brand-plum/30 hover:bg-brand-cream hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Example
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <Cake className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Requests</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Pending Quotes</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{pendingCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Quotes Sent</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{quotedCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Converted / Booked</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{acceptedCount}</p>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-owner-muted uppercase tracking-wider">
            All Custom Requests ({filteredCakes.length})
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-owner-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, flavor, occasion, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-owner-border text-xs text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-owner-border text-xs font-semibold text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="QUOTED">Quote Sent</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="ACCEPTED">Accepted / Converted</option>
            <option value="REJECTED">Declined</option>
          </select>
        </div>
      </div>

      {/* Cake Request Cards Grid */}
      {filteredCakes.length === 0 ? (
        <EmptyState
          icon={<Cake className="w-6 h-6" />}
          title="No Custom Cake Requests"
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'No requests match your current search or filter.'
              : 'Customers can submit bespoke cake designs and inspiration photos directly from your storefront.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCakes.map((cake) => {
            const isConverted = !!(cake.convertedOrderNumber || cake.convertedOrderId);
            const phoneDigits = cleanPhone(cake.customerMobile);
            const quoteSnippet = cake.ownerResponse ? `\nOur Quote / Update: ${cake.ownerResponse}` : '';
            const whatsappUrl = phoneDigits
              ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                  `Hello ${cake.customerName}, regarding your custom cake request on CakeStore for ${cake.occasion || 'your celebration'}:${quoteSnippet}`
                )}`
              : null;

            return (
              <Card key={cake.id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
                <div className="space-y-3.5">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif font-bold text-base text-owner-heading">
                        {cake.occasion || 'Custom Cake Request'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-owner-muted">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-brand-plum" />
                          <span>{cake.customerName}</span>
                        </span>
                        {cake.createdAt && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-owner-muted/80 bg-brand-cream/70 px-2 py-0.5 rounded-full border border-owner-border/60"
                            title={`Requested on ${formatFullDateTime(cake.createdAt)}`}
                          >
                            <Clock className="w-2.5 h-2.5 text-brand-plum" />
                            <span>{formatRelativeOrDateTime(cake.createdAt)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(cake)}
                  </div>

                  {/* Reference Image Thumbnail */}
                  {cake.referenceImageUrl ? (
                    <div
                      onClick={() => setPreviewImage(cake.referenceImageUrl || null)}
                      className="relative h-36 w-full rounded-2xl overflow-hidden bg-brand-cream-light border border-owner-border cursor-pointer group"
                    >
                      <img
                        src={cake.referenceImageUrl}
                        alt="Design reference"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>View Full Design</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 rounded-2xl bg-brand-cream/50 border border-owner-border/70 flex items-center justify-center text-xs text-owner-muted italic">
                      No reference photo attached
                    </div>
                  )}

                  {/* Key Attributes */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-owner-canvas border border-owner-border/60">
                      <p className="text-[10px] text-owner-muted uppercase font-bold tracking-wider">Flavour</p>
                      <p className="font-semibold text-owner-heading truncate mt-0.5">{cake.flavour || 'Baker Choice'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-owner-canvas border border-owner-border/60">
                      <p className="text-[10px] text-owner-muted uppercase font-bold tracking-wider">Servings</p>
                      <p className="font-semibold text-owner-heading truncate mt-0.5">{cake.servings ? `${cake.servings} Servings` : 'Custom Size'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-owner-canvas border border-owner-border/60">
                      <p className="text-[10px] text-owner-muted uppercase font-bold tracking-wider">Event Date</p>
                      <p className="font-semibold text-owner-heading truncate mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-brand-plum" />
                        <span>{cake.requiredDate || 'Flexible'}</span>
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-owner-canvas border border-owner-border/60">
                      <p className="text-[10px] text-owner-muted uppercase font-bold tracking-wider">Budget</p>
                      <p className="font-semibold text-owner-heading truncate mt-0.5">
                        {cake.budget ? `₹${cake.budget}` : 'Flexible'}
                      </p>
                    </div>
                  </div>

                  {/* Design Description */}
                  {cake.designDescription && (
                    <div className="p-3 rounded-xl bg-brand-blush/40 border border-brand-blush-border text-xs text-brand-espresso">
                      <p className="font-semibold text-brand-plum text-[11px] mb-0.5">Customer Brief:</p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-owner-muted">{cake.designDescription}</p>
                    </div>
                  )}

                  {/* Existing Response / Conversion Info */}
                  {cake.ownerResponse && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                      <p className="font-bold text-[10px] uppercase">Your Quoted Response / Status:</p>
                      <p className="line-clamp-2 mt-0.5">{cake.ownerResponse}</p>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="pt-4 mt-4 border-t border-owner-border flex items-center gap-2">
                  {isConverted ? (
                    <>
                      <Link
                        href={`/dashboard/owner/orders?orderId=${cake.convertedOrderId}`}
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>View Order #{cake.convertedOrderNumber || cake.convertedOrderId}</span>
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleOpenCakeModal(cake)}
                        size="sm"
                        variant="ghost"
                        className="text-xs text-owner-muted hover:text-owner-heading px-2.5"
                      >
                        Brief
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* 1-Click Convert Action */}
                      <Button
                        onClick={() => handleOpenConvertModal(cake)}
                        size="sm"
                        className="flex-1 text-xs font-semibold bg-brand-plum hover:bg-brand-plum/90 text-white flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Convert to Order</span>
                      </Button>

                      {/* Review & Quote */}
                      <Button
                        onClick={() => handleOpenCakeModal(cake)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <span>{cake.ownerResponse ? 'Update Quote' : 'Quote'}</span>
                      </Button>
                    </>
                  )}

                  {/* WhatsApp Quick Action */}
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center shrink-0"
                      title="Chat on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal 1: Custom Cake Review & Quote */}
      <Modal
        isOpen={!!selectedCake}
        onClose={() => setSelectedCake(null)}
        title={`Custom Cake Request #${selectedCake?.id}`}
      >
        {selectedCake && (
          <form onSubmit={handleSubmitCakeResponse} className="space-y-4">
            {/* Direct Conversion Callout inside Review Modal */}
            {!(selectedCake.convertedOrderNumber || selectedCake.convertedOrderId) ? (
              <div className="p-3.5 rounded-2xl bg-brand-blush/60 border border-brand-blush-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-brand-plum flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ready to finalize this order?</span>
                  </p>
                  <p className="text-[11px] text-brand-espresso/80 mt-0.5">
                    Convert this consultation brief directly into an active kitchen order.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const cake = selectedCake;
                    setSelectedCake(null);
                    handleOpenConvertModal(cake);
                  }}
                  className="bg-brand-plum text-white text-xs font-semibold shrink-0 flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Convert to Order</span>
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">
                      Already Converted to Order #{selectedCake.convertedOrderNumber || selectedCake.convertedOrderId}
                    </p>
                    <p className="text-[11px] text-emerald-700">Currently active in your Orders & Fulfillment dashboard.</p>
                  </div>
                </div>
                <Link href={`/dashboard/owner/orders?orderId=${selectedCake.convertedOrderId}`}>
                  <Button type="button" size="sm" variant="outline" className="text-xs text-emerald-800 bg-white border-emerald-300 flex items-center gap-1">
                    <span>Open Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            )}

            {/* Customer Details Box */}
            <div className="p-3.5 rounded-2xl bg-owner-canvas border border-owner-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-owner-heading text-sm">{selectedCake.customerName}</span>
                <span className="text-owner-muted">{selectedCake.customerEmail}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-owner-muted text-[11px] pt-1 border-t border-owner-border/60">
                {selectedCake.createdAt && (
                  <span className="flex items-center gap-1 text-brand-plum font-semibold">
                    <Clock className="w-3 h-3" />
                    <span>Requested: {formatFullDateTime(selectedCake.createdAt)}</span>
                  </span>
                )}
                {selectedCake.customerMobile && <span>Phone: {selectedCake.customerMobile}</span>}
                {selectedCake.requiredDate && <span>Event: {selectedCake.requiredDate}</span>}
                {selectedCake.budget && <span>Budget: ₹{selectedCake.budget}</span>}
              </div>
            </div>

            {/* Design Brief */}
            {selectedCake.designDescription && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-owner-heading block">Customer Brief & Requirements</label>
                <p className="text-xs text-owner-muted p-3 rounded-xl bg-white border border-owner-border leading-relaxed">
                  {selectedCake.designDescription}
                </p>
              </div>
            )}

            {/* Dynamic Custom Form Field Values */}
            {selectedCake.fieldValues && selectedCake.fieldValues.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-owner-heading block">Custom Specifications</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCake.fieldValues.map((fv, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-owner-canvas border border-owner-border text-xs">
                      <p className="text-[10px] text-owner-muted uppercase font-bold tracking-wider">{fv.fieldLabel || fv.fieldKey}</p>
                      {fv.fieldValue && fv.fieldValue.startsWith('http') ? (
                        <div
                          className="mt-1.5 w-16 h-16 rounded-lg overflow-hidden border border-owner-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(fv.fieldValue)}
                        >
                          <img src={fv.fieldValue} alt="Attachment" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <p className="font-semibold text-owner-heading mt-0.5 whitespace-pre-wrap">{fv.fieldValue || '—'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Image Preview */}
            {selectedCake.referenceImageUrl && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-owner-heading block">Reference Design</label>
                <div className="h-44 w-full rounded-2xl overflow-hidden border border-owner-border bg-brand-cream">
                  <img
                    src={selectedCake.referenceImageUrl}
                    alt="Reference design"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Status Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-owner-heading block">Update Status</label>
              <select
                value={responseStatus}
                onChange={(e) => setResponseStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-owner-border text-xs text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20"
              >
                <option value="QUOTED">Quoted (Price Quote Sent to Customer)</option>
                <option value="REVIEWED">Reviewed (In Discussion)</option>
                <option value="ACCEPTED">Accepted (Order Confirmed)</option>
                <option value="REJECTED">Declined (Unavailable / Fully Booked)</option>
              </select>
            </div>

            {/* Response Notes / Price Quote */}
            <Textarea
              label="Baker Response / Price Quote"
              rows={3}
              placeholder="e.g. We would love to bake this! The quote for 2.5kg Belgian Chocolate with handmade fondant toppers is ₹3,800..."
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              required
            />

            {actionSuccess && (
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {actionSuccess}
              </p>
            )}

            {actionError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {actionError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCake(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Submit Response & Quote
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 2: "Convert to Order" 1-Click Action Modal */}
      <Modal
        isOpen={!!convertingCake}
        onClose={() => {
          if (!isConverting) {
            setConvertingCake(null);
            setConvertSuccess(null);
          }
        }}
        title={convertSuccess ? "Order Confirmed & Created" : `Convert Custom Cake Request #${convertingCake?.id} to Order`}
      >
        {convertingCake && (
          <div>
            {convertSuccess ? (
              /* Success Confirmation View */
              <div className="space-y-5 text-center py-2">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold font-serif text-owner-heading">
                    Order #${convertSuccess.orderNumber} Created!
                  </h3>
                  <p className="text-xs text-owner-muted max-w-sm mx-auto">
                    This custom request has been accepted and moved directly to your kitchen queue with status <strong className="text-emerald-700">CONFIRMED</strong>.
                  </p>
                </div>

                {/* Details Summary Card */}
                <div className="p-4 rounded-2xl bg-owner-canvas border border-owner-border text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between items-center py-1 border-b border-owner-border/60">
                    <span className="text-owner-muted">Customer</span>
                    <span className="font-semibold text-owner-heading">{convertingCake.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-owner-border/60">
                    <span className="text-owner-muted">Cake Concept</span>
                    <span className="font-semibold text-owner-heading">{convertingCake.occasion || 'Custom Bespoke Cake'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-owner-border/60">
                    <span className="text-owner-muted">Event / Delivery Date</span>
                    <span className="font-semibold text-owner-heading">{convertForm.deliveryDate || 'As agreed'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-owner-muted">Total Order Amount</span>
                    <span className="text-sm font-bold text-brand-plum">₹{convertSuccess.totalAmount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs text-left flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Official order confirmation email and SMS updates have been dispatched to <strong>{convertingCake.customerEmail}</strong>.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <Link
                    href={`/dashboard/owner/orders?orderId=${convertSuccess.orderId}`}
                    className="w-full sm:w-auto"
                  >
                    <Button className="w-full bg-brand-plum hover:bg-brand-plum/90 text-white text-xs font-semibold flex items-center justify-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      <span>View in Orders Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto text-xs"
                    onClick={() => {
                      setConvertingCake(null);
                      setConvertSuccess(null);
                    }}
                  >
                    Done / Return
                  </Button>
                </div>
              </div>
            ) : (
              /* Conversion Form */
              <form onSubmit={handleExecuteConvert} className="space-y-4">
                {/* Brief Summary Card */}
                <div className="p-3.5 rounded-2xl bg-brand-blush/40 border border-brand-blush-border text-xs flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-owner-heading text-sm">{convertingCake.customerName}</span>
                      <span className="text-brand-plum font-semibold">({convertingCake.occasion || 'Custom Celebration'})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-owner-muted">
                      {convertingCake.flavour && <span>Flavour: <strong>{convertingCake.flavour}</strong></span>}
                      {convertingCake.servings && <span>• Servings: <strong>{convertingCake.servings}</strong></span>}
                      {convertingCake.requiredDate && <span>• Date: <strong>{convertingCake.requiredDate}</strong></span>}
                      {convertingCake.budget && <span>• Client Budget: <strong>₹{convertingCake.budget}</strong></span>}
                    </div>
                  </div>

                  {convertingCake.referenceImageUrl && (
                    <div
                      onClick={() => setPreviewImage(convertingCake.referenceImageUrl || null)}
                      className="w-14 h-14 rounded-xl overflow-hidden border border-brand-blush-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={convertingCake.referenceImageUrl} alt="Reference" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {convertError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{convertError}</span>
                  </div>
                )}

                {/* 1. Pricing Section */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Agreed Cake Price (₹)"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 3500"
                    value={convertForm.agreedPrice}
                    onChange={(e) => setConvertForm({ ...convertForm, agreedPrice: e.target.value })}
                    required
                    helperText="Agreed bespoke cake price"
                  />

                  <Input
                    label="Delivery Charge (₹)"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={convertForm.deliveryCharge}
                    onChange={(e) => setConvertForm({ ...convertForm, deliveryCharge: e.target.value })}
                    helperText="0 for free delivery or pickup"
                  />
                </div>

                {/* 2. Fulfillment Type & Delivery Schedule */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-owner-canvas border border-owner-border">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-owner-heading block">Fulfillment Preference</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConvertForm({ ...convertForm, fulfillmentType: 'DOORSTEP_DELIVERY' })}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          convertForm.fulfillmentType === 'DOORSTEP_DELIVERY'
                            ? 'bg-brand-plum text-white border-brand-plum shadow-sm'
                            : 'bg-white text-owner-muted border-owner-border hover:bg-brand-cream/50'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Doorstep Delivery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConvertForm({ ...convertForm, fulfillmentType: 'STORE_PICKUP', deliveryCharge: '0' })}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          convertForm.fulfillmentType === 'STORE_PICKUP'
                            ? 'bg-brand-plum text-white border-brand-plum shadow-sm'
                            : 'bg-white text-owner-muted border-owner-border hover:bg-brand-cream/50'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Bakery Store Pickup</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <Input
                      label="Event / Delivery Date"
                      type="date"
                      value={convertForm.deliveryDate}
                      onChange={(e) => setConvertForm({ ...convertForm, deliveryDate: e.target.value })}
                      required
                    />

                    {/* Delivery Slot Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-brand-espresso">
                        Bakery Slot (Optional)
                      </label>
                      <select
                        value={convertForm.deliverySlotId}
                        onChange={(e) => setConvertForm({ ...convertForm, deliverySlotId: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-brand-border text-brand-espresso text-sm focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum"
                      >
                        <option value="">Any Time / Flexible Slot</option>
                        {ownerDeliverySlots
                          .filter((s) => s.isActive)
                          .map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {slot.dayOfWeek}: {formatSlotTime(slot.startTime)} – {formatSlotTime(slot.endTime)}
                            </option>
                          ))}
                      </select>
                      {slotsLoading && <p className="text-[10px] text-owner-muted">Loading available slots...</p>}
                    </div>
                  </div>

                  {convertForm.fulfillmentType === 'DOORSTEP_DELIVERY' ? (
                    <Input
                      label="Delivery Address"
                      placeholder="Street address, apartment, locality..."
                      value={convertForm.deliveryAddress}
                      onChange={(e) => setConvertForm({ ...convertForm, deliveryAddress: e.target.value })}
                      required
                    />
                  ) : (
                    <div className="p-2.5 rounded-xl bg-white border border-owner-border/70 text-xs text-owner-muted flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-plum shrink-0" />
                      <span>Client will collect cake directly from your registered bakery store counter.</span>
                    </div>
                  )}
                </div>

                {/* 3. Payment Mode */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-owner-heading block">Payment Status & Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setConvertForm({ ...convertForm, paymentMethod: 'COD' })}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        convertForm.paymentMethod === 'COD'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-owner-muted border-owner-border hover:bg-brand-cream/50'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>COD (Unpaid)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConvertForm({ ...convertForm, paymentMethod: 'ADVANCE_PAID' })}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        convertForm.paymentMethod === 'ADVANCE_PAID'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-owner-muted border-owner-border hover:bg-brand-cream/50'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Advance / Paid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConvertForm({ ...convertForm, paymentMethod: 'ONLINE_PAYMENT' })}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        convertForm.paymentMethod === 'ONLINE_PAYMENT'
                          ? 'bg-brand-plum text-white border-brand-plum'
                          : 'bg-white text-owner-muted border-owner-border hover:bg-brand-cream/50'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Online / UPI</span>
                    </button>
                  </div>
                </div>

                {/* 4. Kitchen / Baker Instructions (KOT) */}
                <Textarea
                  label="Kitchen Order Ticket (KOT) Notes"
                  rows={2}
                  placeholder="Special instructions for the baker or decorator (e.g., Happy 21st Birthday lettering, fondant roses, double chocolate ganache)..."
                  value={convertForm.notes}
                  onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })}
                />

                {/* Financial Summary & Confirmation */}
                <div className="p-3.5 rounded-2xl bg-brand-cream/80 border border-owner-border flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-owner-muted uppercase font-bold tracking-wider">Total Order Amount</p>
                    <p className="text-xl font-bold font-serif text-brand-plum">
                      ₹
                      {(
                        (parseFloat(convertForm.agreedPrice || '0') || 0) +
                        (parseFloat(convertForm.deliveryCharge || '0') || 0)
                      ).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sets Status: CONFIRMED</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isConverting}
                    onClick={() => setConvertingCake(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={isConverting}
                    className="bg-brand-plum hover:bg-brand-plum/90 text-white font-semibold"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                    Confirm & Convert to Order
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* Modal 3: Full Image Zoom Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="relative max-w-2xl max-h-[85vh] w-full rounded-3xl overflow-hidden bg-white shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Reference zoom" className="w-full h-full object-contain max-h-[85vh]" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function OwnerCustomCakesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading custom cake requests..." />}>
      <OwnerCustomCakesContent />
    </Suspense>
  );
}
