'use client';

import React, { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquareQuote,
  Search,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Send,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { notificationsApi } from '@/lib/api/notifications';
import { GeneralEnquiry } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

function OwnerStoreInquiriesContent() {
  const searchParams = useSearchParams();
  const { registerRefreshHandler, refreshSidebarCounts } = useOwner();
  const [generalEnquiries, setGeneralEnquiries] = useState<GeneralEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Selected item for reply modal
  const [selectedGeneral, setSelectedGeneral] = useState<GeneralEnquiry | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (!isManualRefresh) setLoading(true);
    setError(null);

    try {
      const data = await ownerApi.getOwnerEnquiries();
      setGeneralEnquiries(data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load storefront inquiries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // When owner views inquiries, clear unread enquiry entries
    notificationsApi.markTypeAsRead('NEW_ENQUIRY')
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
    const inqId = searchParams.get('inquiryId');
    const s = searchParams.get('search');
    if (s) setSearchQuery(s);
    if (inqId && generalEnquiries.length > 0) {
      const match = generalEnquiries.find((e) => String(e.id) === String(inqId));
      if (match) setSelectedGeneral(match);
    }
  }, [searchParams, generalEnquiries]);

  const formatCategoryLabel = (type?: string) => {
    if (!type) return 'Storefront Inquiry';
    const norm = type.trim();
    const upper = norm.toUpperCase();

    switch (upper) {
      case 'GENERAL_INQUIRY':
      case 'GENERAL':
        return 'General Question';
      case 'BULK_ORDER':
        return 'Bulk & Corporate';
      case 'DIETARY_QUESTION':
        return 'Dietary / Allergies';
      case 'DELIVERY_QUERY':
        return 'Delivery Timings';
      case 'WEDDING_CAKE':
        return 'Wedding Cake';
      case 'BIRTHDAY':
        return 'Birthday Celebration';
      case 'OTHER':
        return 'Other';
      default:
        if (norm.includes('_') || norm.includes('-')) {
          return norm
            .split(/[-_]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        }
        return norm;
    }
  };

  // Dynamically compute available categories from data + baseline categories
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    const baseline = [
      { key: 'GENERAL_INQUIRY', label: 'General Questions' },
      { key: 'BULK_ORDER', label: 'Bulk & Corporate' },
      { key: 'DIETARY_QUESTION', label: 'Dietary & Allergies' },
      { key: 'DELIVERY_QUERY', label: 'Delivery Timings' },
      { key: 'OTHER', label: 'Other' },
    ];
    baseline.forEach((b) => map.set(b.key, b.label));

    // Inspect actual records in generalEnquiries to discover custom/past categories
    generalEnquiries.forEach((item) => {
      if (item.enquiryType) {
        const upper = item.enquiryType.trim().toUpperCase();
        if (!map.has(upper)) {
          map.set(upper, formatCategoryLabel(item.enquiryType));
        }
      }
    });

    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [generalEnquiries]);

  // Filtered inquiries
  const filteredGeneral = useMemo(() => {
    return generalEnquiries.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status?.toUpperCase() === statusFilter.toUpperCase();

      const matchesCategory =
        categoryFilter === 'ALL' ||
        (item.enquiryType && item.enquiryType.trim().toUpperCase() === categoryFilter.trim().toUpperCase());

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.customerEmail && item.customerEmail.toLowerCase().includes(q)) ||
        (item.customerMobile && item.customerMobile.toLowerCase().includes(q)) ||
        (item.enquiryType && item.enquiryType.toLowerCase().includes(q)) ||
        (item.message && item.message.toLowerCase().includes(q));

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [generalEnquiries, statusFilter, categoryFilter, searchQuery]);

  // KPIs
  const totalCount = generalEnquiries.length;
  const newCount = generalEnquiries.filter((g) => g.status === 'NEW').length;
  const repliedCount = generalEnquiries.filter((g) => g.status === 'REPLIED').length;
  const responseRate = totalCount > 0 ? Math.round((repliedCount / totalCount) * 100) : 100;

  const handleOpenGeneralModal = (gen: GeneralEnquiry) => {
    setSelectedGeneral(gen);
    setResponseText(gen.ownerReply || '');
    setActionSuccess(null);
    setActionError(null);
  };

  const handleSubmitGeneralReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGeneral) return;
    setSubmitting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await ownerApi.replyToGeneralEnquiry(selectedGeneral.id, responseText);
      setActionSuccess('Reply recorded and transactional email sent to customer!');
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

  const getStatusBadge = (status?: string) => {
    switch ((status || '').toUpperCase()) {
      case 'NEW':
        return <Badge variant="warning">New Message</Badge>;
      case 'REPLIED':
        return <Badge variant="success">Replied</Badge>;
      default:
        return <Badge variant="default">{status || 'NEW'}</Badge>;
    }
  };

  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = digits.substring(1);
    if (digits.length === 10) digits = '91' + digits;
    return digits;
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

  if (loading) return <LoadingState message="Loading storefront customer inquiries..." />;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Inbox className="w-3.5 h-3.5" />
            <span>Storefront Customer Support Inbox</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Store Inquiries & Messages
          </h1>
          <p className="text-xs text-owner-muted">
            Customer questions submitted from your public storefront contact form regarding menu items, bulk catering, dietary guidelines, and delivery timings
          </p>
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
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Inquiries</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Awaiting Reply</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{newCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Replied Messages</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{repliedCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Response Rate</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{responseRate}%</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-owner-muted uppercase tracking-wider">
            All Messages ({filteredGeneral.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-owner-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-owner-border text-xs text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 w-64"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-owner-border text-xs font-semibold text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 cursor-pointer"
          >
            <option value="ALL">All Subjects</option>
            {availableCategories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-owner-border text-xs font-semibold text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="REPLIED">Replied</option>
          </select>
        </div>
      </div>

      {/* Inquiries List */}
      {filteredGeneral.length === 0 ? (
        <EmptyState
          icon={<MessageSquareQuote className="w-6 h-6" />}
          title="No Storefront Inquiries"
          description={
            searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'No inquiries match your current search or filters.'
              : 'When customers submit questions from your storefront contact form, they will appear here.'
          }
        />
      ) : (
        <div className="space-y-3.5">
          {filteredGeneral.map((gen) => {
            const phoneDigits = cleanPhone(gen.customerMobile);
            const replySnippet = gen.ownerReply ? `\nOur Reply: ${gen.ownerReply}` : '';
            const whatsappUrl = phoneDigits
              ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                  `Hello ${gen.customerName}, replying to your question on CakeStore:${replySnippet}`
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
                          {formatCategoryLabel(gen.enquiryType)}
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
                    {gen.createdAt && (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-cream/80 border border-owner-border/80 text-[11px] font-medium text-owner-muted shadow-2xs"
                        title={`Sent on ${formatFullDateTime(gen.createdAt)}`}
                      >
                        <Clock className="w-3 h-3 text-brand-plum" />
                        <span>{formatRelativeOrDateTime(gen.createdAt)}</span>
                      </span>
                    )}
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
                    <div className="p-3 rounded-xl bg-brand-cream-light border border-owner-border/70 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <p className="font-bold text-brand-plum uppercase">Your Reply:</p>
                        {gen.updatedAt && (
                          <span
                            className="text-owner-muted flex items-center gap-1 font-medium"
                            title={`Replied on ${formatFullDateTime(gen.updatedAt)}`}
                          >
                            <Clock className="w-2.5 h-2.5 text-brand-plum" />
                            <span>Replied {formatRelativeOrDateTime(gen.updatedAt)}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-owner-muted leading-relaxed">{gen.ownerReply}</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Reply to General Enquiry */}
      <Modal
        isOpen={!!selectedGeneral}
        onClose={() => setSelectedGeneral(null)}
        title={`Reply to ${selectedGeneral?.customerName}`}
      >
        {selectedGeneral && (() => {
          const modalPhoneDigits = cleanPhone(selectedGeneral.customerMobile);
          const modalWhatsappUrl = modalPhoneDigits
            ? `https://wa.me/${modalPhoneDigits}?text=${encodeURIComponent(
                `Hello ${selectedGeneral.customerName}, replying to your question on CakeStore:`
              )}`
            : null;

          return (
            <form onSubmit={handleSubmitGeneralReply} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-owner-canvas border border-owner-border text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-owner-muted border-b border-owner-border/60 pb-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-owner-heading">{selectedGeneral.customerName}</span>
                    <span className="text-owner-muted">({selectedGeneral.customerEmail})</span>
                    {selectedGeneral.customerMobile && (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                        <Phone className="w-2.5 h-2.5" />
                        {selectedGeneral.customerMobile}
                      </span>
                    )}
                  </div>
                  {selectedGeneral.createdAt && (
                    <span className="flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded-md border border-owner-border/70 text-[10px]">
                      <Clock className="w-3 h-3 text-brand-plum" />
                      <span>Sent: {formatFullDateTime(selectedGeneral.createdAt)}</span>
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-owner-heading text-[11px]">Customer Inquiry:</p>
                  <p className="text-owner-muted leading-relaxed italic mt-0.5">&ldquo;{selectedGeneral.message}&rdquo;</p>
                </div>
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

              <div className="flex items-center justify-between gap-2.5 pt-2">
                {modalWhatsappUrl ? (
                  <a
                    href={modalWhatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat on WhatsApp</span>
                  </a>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedGeneral(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={submitting}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
}

export default function OwnerStoreInquiriesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading storefront inquiries..." />}>
      <OwnerStoreInquiriesContent />
    </Suspense>
  );
}
