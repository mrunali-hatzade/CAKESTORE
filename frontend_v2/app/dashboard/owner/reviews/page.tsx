'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Star,
  Search,
  RefreshCw,
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
  Cake,
} from 'lucide-react';
import { reviewsApi, OwnerProductReview } from '@/lib/api/reviews';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

const FALLBACK_CAKE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80';

export default function OwnerReviewsPage() {
  const { registerRefreshHandler } = useOwner();
  const [reviews, setReviews] = useState<OwnerProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reply Modal State
  const [selectedReview, setSelectedReview] = useState<OwnerProductReview | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await reviewsApi.getOwnerProductReviews();
      setReviews(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchReviews(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchReviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchesRating = ratingFilter === 'ALL' || r.rating === ratingFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.productName && r.productName.toLowerCase().includes(q)) ||
        (r.reviewText && r.reviewText.toLowerCase().includes(q)) ||
        (r.orderNumber && r.orderNumber.toLowerCase().includes(q));
      return matchesRating && matchesSearch;
    });
  }, [reviews, ratingFilter, searchQuery]);

  // Derived KPIs
  const totalReviewsCount = reviews.length;
  const avgRating =
    totalReviewsCount > 0
      ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviewsCount).toFixed(1)
      : '0.0';
  const fiveStarCount = reviews.filter((r) => r.rating === 5).length;
  const respondedCount = reviews.filter((r) => !!r.ownerReply).length;
  const responseRate =
    totalReviewsCount > 0 ? Math.round((respondedCount / totalReviewsCount) * 100) : 0;

  const handleOpenReplyModal = (review: OwnerProductReview) => {
    setSelectedReview(review);
    setReplyText(review.ownerReply || '');
    setReplySuccess(null);
    setReplyError(null);
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !replyText.trim()) return;

    setSubmittingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      const updated = await reviewsApi.replyToProductReview(selectedReview.id, replyText.trim());
      setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedReview(updated);
      setReplySuccess('Bakery response published on public storefront!');
      setTimeout(() => {
        setSelectedReview(null);
      }, 1200);
    } catch (err: any) {
      setReplyError(err?.message || 'Failed to post reply');
    } finally {
      setSubmittingReply(false);
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

  if (loading) return <LoadingState message="Loading customer reviews and feedback..." />;

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

        <button
          onClick={() => fetchReviews(true)}
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
            <p className="text-xs font-semibold text-owner-muted">Total Reviews</p>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Star Rating Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white border border-owner-border shadow-soft">
          <button
            onClick={() => setRatingFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              ratingFilter === 'ALL'
                ? 'bg-brand-plum text-white shadow-soft'
                : 'text-owner-muted hover:text-owner-heading'
            }`}
          >
            All Ratings ({totalReviewsCount})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            return (
              <button
                key={stars}
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
            placeholder="Search by customer, cake, order #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-xl border border-owner-border text-xs text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20 w-64"
          />
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <EmptyState
          icon={<Star className="w-6 h-6 text-amber-400 fill-amber-400" />}
          title="No Reviews Found"
          description={
            searchQuery || ratingFilter !== 'ALL'
              ? 'No customer reviews match your active filter.'
              : 'Verified customer reviews from delivered celebration orders will appear here automatically.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review.id} className="p-5 sm:p-6 hover:shadow-card transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-owner-border/70">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-brand-cream border border-owner-border/80 shrink-0">
                    <img
                      src={review.productImage || FALLBACK_CAKE}
                      alt={review.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-sm text-owner-heading">
                        {review.productName || 'Artisan Cake'}
                      </h3>
                      {renderStars(review.rating)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-owner-muted mt-1">
                      <span className="font-medium text-owner-heading">{review.customerName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px] bg-brand-cream px-2 py-0.5 rounded-md text-brand-plum">
                        <ShoppingBag className="w-3 h-3 text-brand-plum" />
                        #{review.orderNumber}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-brand-plum" />
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    onClick={() => handleOpenReplyModal(review)}
                    size="sm"
                    variant={review.ownerReply ? 'outline' : 'primary'}
                    className="text-xs"
                  >
                    {review.ownerReply ? 'Edit Bakery Reply' : 'Reply to Customer'}
                  </Button>
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

                {/* Owner Reply Box */}
                {review.ownerReply && (
                  <div className="p-3.5 rounded-2xl bg-brand-blush/40 border border-brand-blush-border text-xs space-y-1">
                    <p className="font-bold text-brand-plum text-[11px] uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Official Bakery Response {review.ownerRepliedAt ? `• ${new Date(review.ownerRepliedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : ''}
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
                  <span className="text-owner-muted ml-1.5 font-normal">on {selectedReview.productName}</span>
                </div>
                {renderStars(selectedReview.rating)}
              </div>
              <p className="text-owner-muted leading-relaxed italic">
                “{selectedReview.reviewText || `${selectedReview.rating}-Star rating`}”
              </p>
            </div>

            <Textarea
              label="Official Bakery Response (Visible on Public Storefront)"
              rows={4}
              placeholder="Thank the customer for their review and celebration..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
            />

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
    </div>
  );
}

