'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  MessageSquareQuote,
  Cake,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Phone,
  Mail,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Send,
  X,
  DollarSign,
  Eye,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { CustomCakeRequest, GeneralEnquiry } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function OwnerEnquiriesPage() {
  const { registerRefreshHandler } = useOwner();
  const [activeTab, setActiveTab] = useState<'custom-cakes' | 'general'>('custom-cakes');
  const [customCakes, setCustomCakes] = useState<CustomCakeRequest[]>([]);
  const [generalEnquiries, setGeneralEnquiries] = useState<GeneralEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected item for modal
  const [selectedCake, setSelectedCake] = useState<CustomCakeRequest | null>(null);
  const [selectedGeneral, setSelectedGeneral] = useState<GeneralEnquiry | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Response form state
  const [responseStatus, setResponseStatus] = useState<string>('REVIEWED');
  const [responseText, setResponseText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [cakesRes, generalRes] = await Promise.allSettled([
        ownerApi.getOwnerCustomCakeRequests(),
        ownerApi.getOwnerEnquiries(),
      ]);

      if (cakesRes.status === 'fulfilled') {
        setCustomCakes(cakesRes.value || []);
      }
      if (generalRes.status === 'fulfilled') {
        setGeneralEnquiries(generalRes.value || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to enquiries API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchData(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchData]);

  // Filtered lists
  const filteredCakes = useMemo(() => {
    return customCakes.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter.toUpperCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.customerEmail && item.customerEmail.toLowerCase().includes(q)) ||
        (item.cakeType && item.cakeType.toLowerCase().includes(q)) ||
        (item.flavour && item.flavour.toLowerCase().includes(q)) ||
        (item.occasion && item.occasion.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [customCakes, statusFilter, searchQuery]);

  const filteredGeneral = useMemo(() => {
    return generalEnquiries.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter.toUpperCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.customerEmail && item.customerEmail.toLowerCase().includes(q)) ||
        (item.enquiryType && item.enquiryType.toLowerCase().includes(q)) ||
        (item.message && item.message.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [generalEnquiries, statusFilter, searchQuery]);

  // Counts for KPIs
  const cakePendingCount = customCakes.filter(
    (c) => c.status === 'PENDING' || c.status === 'NEW'
  ).length;
  const generalNewCount = generalEnquiries.filter((g) => g.status === 'NEW').length;
  const acceptedCount = customCakes.filter(
    (c) => c.status === 'ACCEPTED' || c.status === 'FULFILLED'
  ).length;

  const handleOpenCakeModal = (cake: CustomCakeRequest) => {
    setSelectedCake(cake);
    setResponseStatus(cake.status || 'REVIEWED');
    setResponseText(cake.ownerResponse || '');
    setActionSuccess(null);
    setActionError(null);
  };

  const handleOpenGeneralModal = (gen: GeneralEnquiry) => {
    setSelectedGeneral(gen);
    setResponseText(gen.ownerReply || '');
    setActionSuccess(null);
    setActionError(null);
  };

  const handleSubmitCakeResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCake) return;
    setSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await ownerApi.respondToCustomCakeRequest(selectedCake.id, responseStatus, responseText);
      setActionSuccess('Quote / response submitted successfully!');
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

  const handleSubmitGeneralReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGeneral) return;
    setSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await ownerApi.replyToGeneralEnquiry(selectedGeneral.id, responseText);
      setActionSuccess('Reply recorded successfully!');
      setTimeout(() => {
        setSelectedGeneral(null);
        fetchData(true);
      }, 1200);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
      case 'NEW':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'REVIEWED':
        return <Badge variant="info">Reviewed</Badge>;
      case 'ACCEPTED':
      case 'FULFILLED':
        return <Badge variant="success">Accepted</Badge>;
      case 'REJECTED':
      case 'DECLINED':
        return <Badge variant="error">Declined</Badge>;
      case 'REPLIED':
        return <Badge variant="success">Replied</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  if (loading) return <LoadingState message="Loading enquiries and custom cake requests..." />;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customer Inquiries & Custom Art Requests</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Enquiries & Custom Cakes
          </h1>
          <p className="text-xs text-owner-muted">
            Manage custom celebration cake design briefs, reference photos, price quotes, and general storefront questions
          </p>
        </div>

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-owner-canvas hover:bg-brand-cream border border-owner-border text-xs font-semibold text-owner-heading transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-plum ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
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
            <p className="text-xs font-semibold text-owner-muted">Custom Cake Requests</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{customCakes.length}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Pending Cake Quotes</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{cakePendingCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Accepted Requests</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{acceptedCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">New General Inquiries</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{generalNewCount}</p>
          </div>
        </Card>
      </div>

      {/* Dual Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="inline-flex p-1 rounded-2xl bg-white border border-owner-border shadow-soft">
          <button
            onClick={() => {
              setActiveTab('custom-cakes');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'custom-cakes'
                ? 'bg-brand-plum text-white shadow-soft'
                : 'text-owner-muted hover:text-owner-heading'
            }`}
          >
            <Cake className="w-3.5 h-3.5" />
            <span>Custom Cake Requests</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'custom-cakes' ? 'bg-white/20 text-white' : 'bg-brand-cream text-owner-muted'
              }`}
            >
              {customCakes.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('general');
              setStatusFilter('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-brand-plum text-white shadow-soft'
                : 'text-owner-muted hover:text-owner-heading'
            }`}
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>General Store Inquiries</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'general' ? 'bg-white/20 text-white' : 'bg-brand-cream text-owner-muted'
              }`}
            >
              {generalEnquiries.length}
            </span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-owner-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, flavor, occasion..."
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
            {activeTab === 'custom-cakes' ? (
              <>
                <option value="PENDING">Pending Review</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Declined</option>
              </>
            ) : (
              <>
                <option value="NEW">New</option>
                <option value="REPLIED">Replied</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Tab 1: Custom Cake Requests */}
      {activeTab === 'custom-cakes' && (
        <div>
          {filteredCakes.length === 0 ? (
            <EmptyState
              icon={<Cake className="w-6 h-6" />}
              title="No Custom Cake Requests"
              description={
                searchQuery || statusFilter !== 'ALL'
                  ? 'No requests match your search criteria.'
                  : 'Customers can request custom celebration cakes from your public bakery storefront.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCakes.map((cake) => {
                const phoneDigits = cleanPhone(cake.customerMobile);
                const whatsappUrl = phoneDigits
                  ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                      `Hello ${cake.customerName}, regarding your custom cake request on CakeStore for ${cake.occasion || 'your celebration'}:`
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
                          <p className="text-[11px] text-owner-muted flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-brand-plum" />
                            <span>{cake.customerName}</span>
                          </p>
                        </div>
                        {getStatusBadge(cake.status)}
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

                      {/* Existing Response */}
                      {cake.ownerResponse && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                          <p className="font-bold text-[10px] uppercase">Your Quoted Response:</p>
                          <p className="line-clamp-2 mt-0.5">{cake.ownerResponse}</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 mt-4 border-t border-owner-border flex items-center gap-2">
                      <Button
                        onClick={() => handleOpenCakeModal(cake)}
                        size="sm"
                        className="flex-1 text-xs"
                      >
                        <span>{cake.ownerResponse ? 'Update Quote' : 'Review & Quote'}</span>
                      </Button>

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
        </div>
      )}

      {/* Tab 2: General Storefront Inquiries */}
      {activeTab === 'general' && (
        <div>
          {filteredGeneral.length === 0 ? (
            <EmptyState
              icon={<MessageSquareQuote className="w-6 h-6" />}
              title="No Storefront Inquiries"
              description={
                searchQuery || statusFilter !== 'ALL'
                  ? 'No inquiries match your search filter.'
                  : 'Customer messages submitted via your storefront contact box will appear here.'
              }
            />
          ) : (
            <div className="space-y-3.5">
              {filteredGeneral.map((gen) => {
                const phoneDigits = cleanPhone(gen.customerMobile);
                const whatsappUrl = phoneDigits
                  ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                      `Hello ${gen.customerName}, replying to your question on CakeStore:`
                    )}`
                  : null;

                return (
                  <Card key={gen.id} className="p-5 hover:shadow-card transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-owner-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center font-serif font-bold text-base shrink-0">
                          {gen.customerName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-owner-heading">{gen.customerName}</h3>
                            <span className="px-2 py-0.5 rounded-full bg-brand-cream text-owner-muted text-[10px] font-bold">
                              {gen.enquiryType || 'General'}
                            </span>
                          </div>
                          <p className="text-xs text-owner-muted flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-brand-plum" />
                              {gen.customerEmail}
                            </span>
                            {gen.customerMobile && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {gen.customerMobile}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {getStatusBadge(gen.status)}
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <Button
                          onClick={() => handleOpenGeneralModal(gen)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          {gen.ownerReply ? 'Edit Reply' : 'Reply'}
                        </Button>
                      </div>
                    </div>

                    <div className="pt-3 space-y-2">
                      <p className="text-xs text-owner-heading leading-relaxed font-medium">
                        &ldquo;{gen.message}&rdquo;
                      </p>

                      {gen.ownerReply && (
                        <div className="p-3 rounded-xl bg-brand-cream-light border border-owner-border/70 text-xs">
                          <p className="font-bold text-brand-plum text-[10px] uppercase">Your Reply:</p>
                          <p className="text-owner-muted mt-0.5 leading-relaxed">{gen.ownerReply}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Custom Cake Review & Quote */}
      <Modal
        isOpen={!!selectedCake}
        onClose={() => setSelectedCake(null)}
        title={`Custom Cake Request #${selectedCake?.id}`}
      >
        {selectedCake && (
          <form onSubmit={handleSubmitCakeResponse} className="space-y-4">
            {/* Customer Details Box */}
            <div className="p-3.5 rounded-2xl bg-owner-canvas border border-owner-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-owner-heading text-sm">{selectedCake.customerName}</span>
                <span className="text-owner-muted">{selectedCake.customerEmail}</span>
              </div>
              <div className="flex items-center gap-4 text-owner-muted text-[11px]">
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
                      <p className="font-semibold text-owner-heading mt-0.5">{fv.fieldValue || '—'}</p>
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

      {/* Modal: General Storefront Reply */}
      <Modal
        isOpen={!!selectedGeneral}
        onClose={() => setSelectedGeneral(null)}
        title={`Reply to ${selectedGeneral?.customerName}`}
      >
        {selectedGeneral && (
          <form onSubmit={handleSubmitGeneralReply} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-owner-canvas border border-owner-border text-xs space-y-1">
              <p className="font-semibold text-owner-heading">Customer Inquiry:</p>
              <p className="text-owner-muted leading-relaxed italic">&ldquo;{selectedGeneral.message}&rdquo;</p>
            </div>

            <Textarea
              label="Your Reply"
              rows={4}
              placeholder="Type your response to the customer..."
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
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedGeneral(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Send Reply
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Full Image Zoom Modal */}
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
