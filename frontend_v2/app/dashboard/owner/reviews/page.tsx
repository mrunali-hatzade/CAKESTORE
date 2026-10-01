'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Star,
  Search,
  MessageSquare,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Cake,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  RefreshCw,
  Globe,
  Camera,
  Video,
} from 'lucide-react';
import { reviewsApi, OwnerProductReview } from '@/lib/api/reviews';
import { ownerApi } from '@/lib/api/owner';
import { productsApi } from '@/lib/api/products';
import { notificationsApi } from '@/lib/api/notifications';
import { FeedbackRecord } from '@/types/owner';
import { Product } from '@/types/product';
import { useOwner } from '@/context/OwnerContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

const FALLBACK_CAKE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80';

export interface UnifiedReview {
  id: number;
  sourceType: 'PRODUCT_REVIEW' | 'STOREFRONT_FEEDBACK';
  backendSource: 'FEEDBACK' | 'PRODUCT_REVIEW';
  customerName: string;
  customerEmail?: string;
  rating: number;
  reviewText: string;
  productId?: number;
  productName?: string;
  productImage?: string;
  orderNumber?: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  cakeImageUrl?: string;
  cakeVideoUrl?: string;
  ownerReply?: string;
  ownerRepliedAt?: string;
  createdAt: string;
}

export default function OwnerReviewsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { shop, registerRefreshHandler, refreshSidebarCounts } = useOwner();

  // Handle system administrators visiting owner reviews without an assigned bakery
  const isAdminWithoutShop = !authLoading && Boolean(
    (user?.role === 'ROLE_ADMIN' || (user?.role as string) === 'ADMIN') && !user?.shopId && !shop
  );

  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'STOREFRONT_FEEDBACK' | 'PRODUCT_REVIEW'>('ALL');
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Modal State
  const [selectedReview, setSelectedReview] = useState<UnifiedReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Moderation / Action State
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);
  const [deleteConfirmReview, setDeleteConfirmReview] = useState<UnifiedReview | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReviews = useCallback(async (isManual = false) => {
    if (authLoading) return;

    if (isAdminWithoutShop) {
      setLoading(false);
      return;
    }

    if (!isManual) setLoading(true);
    setError(null);

    try {
      const [productReviewsRes, feedbackRes, productsRes] = await Promise.allSettled([
        reviewsApi.getOwnerProductReviews(),
        ownerApi.getReviews(),
        productsApi.getOwnerProducts(),
      ]);

      const productReviews: OwnerProductReview[] =
        productReviewsRes.status === 'fulfilled' && Array.isArray(productReviewsRes.value)
          ? productReviewsRes.value
          : [];

      const feedbackList: FeedbackRecord[] =
        feedbackRes.status === 'fulfilled' && Array.isArray(feedbackRes.value)
          ? feedbackRes.value
          : [];

      const products: Product[] =
        productsRes.status === 'fulfilled' && Array.isArray(productsRes.value)
          ? productsRes.value
          : [];

      const productById = new Map<number, Product>();
      const productByName = new Map<string, Product>();
      products.forEach((p) => {
        if (p.id) productById.set(p.id, p);
        if (p.name) productByName.set(p.name.trim().toLowerCase(), p);
      });

      const unifiedProductReviews: UnifiedReview[] = productReviews.map((r) => {
        const matchedProduct = r.productId
          ? productById.get(r.productId)
          : (r.productName ? productByName.get(r.productName.trim().toLowerCase()) : undefined);

        return {
          id: r.id,
          sourceType: 'PRODUCT_REVIEW',
          backendSource: 'PRODUCT_REVIEW',
          customerName: r.customerName || 'Verified Customer',
          rating: r.rating,
          reviewText: r.reviewText || '',
          productId: r.productId || matchedProduct?.id,
          productName: r.productName || matchedProduct?.name || 'Artisanal Cake',
          productImage: r.productImage || matchedProduct?.imageUrl || matchedProduct?.images?.[0]?.imageUrl,
          orderNumber: r.orderNumber,
          isVerifiedPurchase: Boolean(r.isVerifiedPurchase),
          isApproved: true,
          cakeImageUrl: r.cakeImageUrl,
          cakeVideoUrl: r.cakeVideoUrl,
          ownerReply: r.ownerReply,
          ownerRepliedAt: r.ownerRepliedAt,
          createdAt: r.createdAt,
        };
      });

      const unifiedFeedback: UnifiedReview[] = feedbackList.map((f) => {
        const rawComment = f.comment || '';
        let cleanComment = rawComment;
        let extractedCakeName = f.productName?.trim();

        if (!extractedCakeName && rawComment.startsWith('[')) {
          const closeBracketIdx = rawComment.indexOf(']');
          if (closeBracketIdx > 1) {
            extractedCakeName = rawComment.substring(1, closeBracketIdx).trim();
            cleanComment = rawComment.substring(closeBracketIdx + 1).trim();
          }
        }

        const matchedProduct = f.productId
          ? productById.get(f.productId)
          : (extractedCakeName ? productByName.get(extractedCakeName.toLowerCase()) : undefined);

        const hasCake = Boolean(
          extractedCakeName ||
          f.productId ||
          matchedProduct ||
          (rawComment && rawComment.startsWith('['))
        );

        const cakeName = extractedCakeName || matchedProduct?.name || (hasCake ? 'Artisanal Cake' : undefined);
        const resolvedImage = matchedProduct?.imageUrl || matchedProduct?.images?.[0]?.imageUrl || f.cakeImageUrl;
        const resolvedProductId = f.productId || matchedProduct?.id;

        return {
          id: f.id,
          sourceType: hasCake ? 'PRODUCT_REVIEW' : 'STOREFRONT_FEEDBACK',
          backendSource: 'FEEDBACK',
          customerName: f.customerDisplayName || 'Storefront Visitor',
          customerEmail: f.customerEmail,
          rating: f.rating,
          reviewText: cleanComment,
          productId: resolvedProductId,
          productName: cakeName || 'Bakery Experience & Service',
          productImage: resolvedImage,
          orderNumber: f.orderReference,
          isVerifiedPurchase: Boolean(f.orderReference || hasCake),
          isApproved: f.isApproved !== false,
          cakeImageUrl: f.cakeImageUrl,
          cakeVideoUrl: f.cakeVideoUrl,
          ownerReply: f.ownerReply,
          ownerRepliedAt: f.updatedAt,
          createdAt: f.createdAt,
        };
      });

      // Deduplicate reviews by unique backend composite key
      const seenKeys = new Set<string>();
      const combined: UnifiedReview[] = [];
      for (const r of [...unifiedProductReviews, ...unifiedFeedback]) {
        const key = `${r.backendSource}-${r.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          combined.push(r);
        }
      }

      combined.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReviews(combined);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAdminWithoutShop]);

  useEffect(() => {
    if (!authLoading) {
      fetchReviews();
    }
  }, [fetchReviews, authLoading]);

  useEffect(() => {
    // When owner views reviews, clear unread review/feedback entries so badge reflects only unseen entries
    if (!isAdminWithoutShop) {
      notificationsApi
        .markTypeAsRead('NEW_FEEDBACK')
        .then(() => refreshSidebarCounts?.())
        .catch(() => {});
    }
  }, [refreshSidebarCounts, isAdminWithoutShop]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchReviews(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchReviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesSource =
        sourceFilter === 'ALL' || r.sourceType === sourceFilter;
      const matchesRating =
        ratingFilter === 'ALL' || r.rating === ratingFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        (r.reviewText && r.reviewText.toLowerCase().includes(q)) ||
        (r.orderNumber && r.orderNumber.toLowerCase().includes(q)) ||
        (r.customerEmail && r.customerEmail.toLowerCase().includes(q));
      return matchesSource && matchesRating && matchesSearch;
    });
  }, [reviews, sourceFilter, ratingFilter, searchQuery]);

  // Derived KPIs
  const totalReviewsCount = reviews.length;
  const storefrontFeedbackCount = reviews.filter((r) => r.sourceType === 'STOREFRONT_FEEDBACK').length;
  const productReviewsCount = reviews.filter((r) => r.sourceType === 'PRODUCT_REVIEW').length;
  const avgRating =
    totalReviewsCount > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviewsCount).toFixed(1)
      : '0.0';
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const respondedCount = reviews.filter((r) => !!r.ownerReply).length;
  const responseRate =
    totalReviewsCount > 0 ? Math.round((respondedCount / totalReviewsCount) * 100) : 0;

  const handleOpenReplyModal = (review: UnifiedReview) => {
    setSelectedReview(review);
    setReplyText(review.ownerReply || '');
    setReplySuccess(null);
    setReplyError(null);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim() || isAdminWithoutShop) return;

    setSubmittingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      if (selectedReview.backendSource === 'PRODUCT_REVIEW') {
        const updated = await reviewsApi.replyToProductReview(selectedReview.id, replyText.trim());
        setReviews((prev) =>
          prev.map((r) =>
            r.id === updated.id && r.backendSource === 'PRODUCT_REVIEW'
              ? {
                  ...r,
                  ownerReply: updated.ownerReply,
                  ownerRepliedAt: updated.ownerRepliedAt,
                }
              : r
          )
        );
      } else {
        const updated = await ownerApi.replyToReview(selectedReview.id, replyText.trim());
        setReviews((prev) =>
          prev.map((r) =>
            r.id === updated.id && r.backendSource === 'FEEDBACK'
              ? {
                  ...r,
                  ownerReply: updated.ownerReply,
                  ownerRepliedAt: updated.updatedAt,
                }
              : r
          )
        );
      }

      setReplySuccess('Bakery response published successfully!');
      setTimeout(() => {
        setSelectedReview(null);
      }, 1200);
    } catch (err: any) {
      setReplyError(err?.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleApproval = async (review: UnifiedReview) => {
    if (review.backendSource !== 'FEEDBACK' || isAdminWithoutShop) return;
    setActionInProgressId(review.id);

    const nextApproved = !review.isApproved;
    try {
      await ownerApi.moderateFeedback(review.id, nextApproved);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id && r.backendSource === 'FEEDBACK'
            ? { ...r, isApproved: nextApproved }
            : r
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update review visibility');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!deleteConfirmReview || isAdminWithoutShop) return;
    setIsDeleting(true);

    try {
      if (deleteConfirmReview.backendSource === 'FEEDBACK') {
        await ownerApi.deleteFeedback(deleteConfirmReview.id);
      }
      setReviews((prev) =>
        prev.filter(
          (r) => !(r.id === deleteConfirmReview.id && r.backendSource === deleteConfirmReview.backendSource)
        )
      );
      setDeleteConfirmReview(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove feedback entry');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatReviewDateTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const now = new Date();
      const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

      const timeStr = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      if (isToday) {
        return `Today at ${timeStr}`;
      }
      if (isYesterday) {
        return `Yesterday at ${timeStr}`;
      }

      const dateStr = date.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });

      return `${dateStr} at ${timeStr}`;
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
        hour12: true,
      });
    } catch {
      return dateString || '';
    }
  };

  if (loading || authLoading) {
    return <LoadingState message="Loading customer reviews and feedback..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Storefront Reputation & Ratings</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Customer Feedback & Reviews
          </h1>
          <p className="text-xs text-owner-muted">
            Track customer ratings, manage verified product reviews, and reply directly from your bakery dashboard
          </p>
        </div>

        {shop?.id && (
          <Link
            href={`/shop/${shop.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-owner-canvas border border-owner-border text-xs font-semibold text-brand-plum hover:bg-white hover:text-brand-espresso transition-all shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Globe className="w-3.5 h-3.5 text-brand-plum" />
            <span>View Public Storefront</span>
            <ExternalLink className="w-3.5 h-3.5 text-owner-muted" />
          </Link>
        )}
      </div>

      {/* Admin Context Banner */}
      {isAdminWithoutShop && (
        <div className="p-5 rounded-3xl bg-blue-50/80 border border-blue-200 text-blue-900 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-blue-950 font-serif">
                  Administrator Preview Mode
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  You are logged in with administrator credentials (<code>{user?.email}</code>). Since this account does not have a dedicated bakery storefront assigned, review records and reply moderation cannot be loaded here.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/admin/shops"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0 shadow-sm"
            >
              <span>Manage Bakeries</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Average Rating</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-bold font-serif text-owner-heading">{avgRating}</span>
              <span className="text-xs text-amber-600 font-semibold">/ 5.0</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Customer Reviews</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalReviewsCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">5-Star Testimonials</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{fiveStarCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Baker Response Rate</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{responseRate}%</p>
          </div>
        </Card>
      </div>

      {/* Source Type & Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1 rounded-2xl bg-white border border-owner-border shadow-soft">
        <button
          type="button"
          onClick={() => setSourceFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            sourceFilter === 'ALL'
              ? 'bg-brand-plum text-white shadow-soft'
              : 'text-owner-muted hover:text-owner-heading'
          }`}
        >
          All Reviews ({totalReviewsCount})
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('STOREFRONT_FEEDBACK')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            sourceFilter === 'STOREFRONT_FEEDBACK'
              ? 'bg-brand-plum text-white shadow-soft'
              : 'text-owner-muted hover:text-owner-heading'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Storefront Testimonials ({storefrontFeedbackCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setSourceFilter('PRODUCT_REVIEW')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            sourceFilter === 'PRODUCT_REVIEW'
              ? 'bg-brand-plum text-white shadow-soft'
              : 'text-owner-muted hover:text-owner-heading'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Cake Reviews ({productReviewsCount})</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Star Rating Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-owner-border shadow-soft">
          <button
            type="button"
            onClick={() => setRatingFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              ratingFilter === 'ALL'
                ? 'bg-brand-plum text-white shadow-soft'
                : 'text-owner-muted hover:text-owner-heading'
            }`}
          >
            All Ratings
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => setRatingFilter(stars)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ratingFilter === stars
                    ? 'bg-brand-plum text-white shadow-soft'
                    : 'text-owner-muted hover:text-owner-heading'
                }`}
              >
                <span>{stars}★</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-owner-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, cake, comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-owner-border text-xs text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <EmptyState
          icon={<Star className="w-6 h-6 text-amber-400 fill-amber-400" />}
          title="No Reviews Found"
          description={
            searchQuery || ratingFilter !== 'ALL' || sourceFilter !== 'ALL'
              ? 'No customer reviews match your active filter selection.'
              : 'Customer feedback from your storefront and delivered orders will appear here automatically.'
          }
          action={
            shop?.id ? (
              <Link
                href={`/shop/${shop.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-plum text-white text-xs font-bold shadow-soft hover:bg-brand-espresso transition-all mt-2"
              >
                <span>Preview Storefront Feedback Section</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={`${review.sourceType}-${review.id}`} className="p-5 sm:p-6 hover:shadow-card transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-owner-border/70">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-brand-cream border border-owner-border/80 shrink-0">
                    <img
                      src={review.productImage || FALLBACK_CAKE}
                      alt={review.productName || 'Cake'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-owner-heading truncate">
                        {review.productName || 'Artisan Bakery Experience'}
                      </h3>
                      {review.productId && shop?.id && (
                        <Link
                          href={`/shop/${shop.id}/product/${review.productId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-brand-plum hover:text-brand-espresso hover:underline font-medium"
                          title="View Cake on Storefront"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                      {renderStars(review.rating)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-owner-muted mt-1">
                      <span className="font-medium text-owner-heading">{review.customerName}</span>

                      {review.orderNumber && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-brand-cream px-2 py-0.5 rounded-md text-brand-plum">
                            <ShoppingBag className="w-3 h-3 text-brand-plum" />
                            #{review.orderNumber}
                          </span>
                        </>
                      )}

                      <span>•</span>
                      <span
                        className="flex items-center gap-1 font-medium"
                        title={`Review submitted on ${formatFullDateTime(review.createdAt)}`}
                      >
                        <Clock className="w-3 h-3 text-brand-plum" />
                        <span>{formatReviewDateTime(review.createdAt)}</span>
                      </span>

                      {/* Source & Verification Badges */}
                      {review.sourceType === 'PRODUCT_REVIEW' ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Verified Purchase</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-plum font-semibold bg-brand-blush px-2 py-0.5 rounded-md border border-brand-blush-border">
                          <Sparkles className="w-3 h-3 text-brand-plum" />
                          <span>Storefront Testimonial</span>
                        </span>
                      )}

                      {/* Storefront Visibility Status for Feedback */}
                      {review.backendSource === 'FEEDBACK' && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            review.isApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              review.isApproved ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{review.isApproved ? 'Live on Storefront' : 'Hidden from Storefront'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                  {/* Moderation Toggle for Feedback-backed Reviews */}
                  {review.backendSource === 'FEEDBACK' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={actionInProgressId === review.id || isAdminWithoutShop}
                      onClick={() => handleToggleApproval(review)}
                      className="text-xs"
                      title={review.isApproved ? 'Hide from public storefront' : 'Make visible on public storefront'}
                    >
                      {actionInProgressId === review.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : review.isApproved ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 mr-1 text-owner-muted" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          <span>Publish</span>
                        </>
                      )}
                    </Button>
                  )}

                  {/* Reply Button */}
                  <Button
                    onClick={() => handleOpenReplyModal(review)}
                    size="sm"
                    variant={review.ownerReply ? 'outline' : 'primary'}
                    className="text-xs"
                    disabled={isAdminWithoutShop}
                  >
                    {review.ownerReply ? 'Edit Bakery Reply' : 'Reply to Customer'}
                  </Button>

                  {/* Soft Delete for Feedback entries */}
                  {review.backendSource === 'FEEDBACK' && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmReview(review)}
                      disabled={isAdminWithoutShop}
                      className="p-1.5 text-owner-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove feedback entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

                {/* Review Comment */}
                <div className="pt-4 space-y-3">
                  <p className="text-xs text-owner-heading leading-relaxed font-medium">
                    {review.reviewText ? (
                      `“${review.reviewText}”`
                    ) : (
                      <span className="italic text-owner-muted">Rating submitted without text comment.</span>
                    )}
                  </p>

                  {/* Customer Uploaded Celebration Media */}
                  {(review.cakeImageUrl || review.cakeVideoUrl) && (
                    <div className="pt-1 pb-1">
                      <p className="text-[11px] font-semibold text-owner-muted mb-2 flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Customer Celebration Media
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        {review.cakeImageUrl && (
                          <a
                            href={review.cakeImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative block w-24 h-24 rounded-xl overflow-hidden border border-owner-border bg-black/5 hover:ring-2 hover:ring-brand-plum transition-all"
                            title="Click to view full photo"
                          >
                            <img
                              src={review.cakeImageUrl}
                              alt="Customer review photo"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs">
                              <Camera className="w-2.5 h-2.5" /> Photo
                            </span>
                          </a>
                        )}
                        {review.cakeVideoUrl && (
                          <div className="relative rounded-xl overflow-hidden border border-owner-border bg-black max-w-[220px]">
                            <video
                              src={review.cakeVideoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="max-h-36 w-full rounded-xl"
                            />
                            <span className="absolute top-1 right-1 bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 backdrop-blur-xs pointer-events-none">
                              <Video className="w-2.5 h-2.5" /> Video
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Owner Reply Box */}
                  {review.ownerReply && (
                  <div className="p-3.5 rounded-2xl bg-brand-blush/40 border border-brand-blush-border text-xs space-y-1">
                    <p className="font-bold text-brand-plum text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Official Bakery Response
                      {review.ownerRepliedAt && (
                        <span
                          className="font-normal normal-case text-owner-muted ml-1"
                          title={`Replied on ${formatFullDateTime(review.ownerRepliedAt)}`}
                        >
                          • {formatReviewDateTime(review.ownerRepliedAt)}
                        </span>
                      )}
                    </p>
                    <p className="text-owner-heading leading-relaxed">{review.ownerReply}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      <Modal
        isOpen={!!selectedReview}
        onClose={() => setSelectedReview(null)}
        title={`Reply to ${selectedReview?.customerName}`}
      >
        {selectedReview && (
          <form onSubmit={handleSubmitReply} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-owner-canvas border border-owner-border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-owner-heading">{selectedReview.customerName}</span>
                  <span className="text-owner-muted ml-1.5 font-normal">
                    on {selectedReview.productName || 'Bakery Experience'}
                  </span>
                  <span
                    className="text-owner-muted ml-1.5 font-normal text-[11px]"
                    title={`Submitted on ${formatFullDateTime(selectedReview.createdAt)}`}
                  >
                    • {formatReviewDateTime(selectedReview.createdAt)}
                  </span>
                </div>
                {renderStars(selectedReview.rating)}
              </div>
              <p className="text-owner-muted leading-relaxed italic">
                “{selectedReview.reviewText || `${selectedReview.rating}-Star rating`}”
              </p>
            </div>

            <div className="space-y-1">
              <Textarea
                label="Official Bakery Response (Visible on Public Storefront)"
                rows={4}
                placeholder="Thank the customer for their review and celebration..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                maxLength={500}
                required
              />
              <p className="text-[11px] text-owner-muted text-right">
                {replyText.length} / 500 characters
              </p>
            </div>

            {replySuccess && (
              <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {replySuccess}
              </p>
            )}

            {replyError && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {replyError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={submittingReply}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Publish Response
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmReview}
        onClose={() => setDeleteConfirmReview(null)}
        title={deleteConfirmReview?.sourceType === 'PRODUCT_REVIEW' ? 'Remove Cake Review?' : 'Remove Customer Testimonial?'}
        maxWidth="sm"
      >
        {deleteConfirmReview && (
          <div className="space-y-4">
            <p className="text-xs text-owner-muted leading-relaxed">
              Are you sure you want to remove the review from{' '}
              <strong className="text-owner-heading">{deleteConfirmReview.customerName}</strong>
              {deleteConfirmReview.productName ? ` for "${deleteConfirmReview.productName}"` : ''}? This entry will be removed from your storefront and dashboard.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmReview(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                onClick={handleDeleteFeedback}
                isLoading={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                {deleteConfirmReview.sourceType === 'PRODUCT_REVIEW' ? 'Remove Review' : 'Remove Testimonial'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
