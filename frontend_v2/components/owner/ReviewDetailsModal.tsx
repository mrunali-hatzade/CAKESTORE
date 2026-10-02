import React, { useState, useEffect } from 'react';
import { Star, Send } from 'lucide-react';
import { reviewsApi } from '@/lib/api/reviews';
import { ownerApi } from '@/lib/api/owner';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { UnifiedReview } from '@/app/dashboard/owner/reviews/page';

interface ReviewDetailsModalProps {
  isOpen: boolean;
  review: UnifiedReview | null;
  onClose: () => void;
  onReplySuccess: (updatedReview: any, backendSource: 'PRODUCT_REVIEW' | 'FEEDBACK') => void;
  isAdminWithoutShop: boolean;
}

export function ReviewDetailsModal({
  isOpen,
  review,
  onClose,
  onReplySuccess,
  isAdminWithoutShop,
}: ReviewDetailsModalProps) {
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && review) {
      setReplyText(review.ownerReply || '');
      setReplySuccess(null);
      setReplyError(null);
    }
  }, [isOpen, review]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review || !replyText.trim() || isAdminWithoutShop) return;

    setSubmittingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      if (review.backendSource === 'PRODUCT_REVIEW') {
        const updated = await reviewsApi.replyToProductReview(review.id, replyText.trim());
        onReplySuccess(updated, 'PRODUCT_REVIEW');
      } else {
        const updated = await ownerApi.replyToReview(review.id, replyText.trim());
        onReplySuccess(updated, 'FEEDBACK');
      }

      setReplySuccess('Bakery response published successfully!');
      setTimeout(() => {
        onClose();
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Reply to ${review?.customerName}`}
    >
      {review && (
        <form onSubmit={handleSubmitReply} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-owner-canvas border border-owner-border text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-owner-heading">{review.customerName}</span>
                <span className="text-owner-muted ml-1.5 font-normal">
                  on {review.productName || 'Bakery Experience'}
                </span>
                <span
                  className="text-owner-muted ml-1.5 font-normal text-[11px]"
                  title={`Submitted on ${formatFullDateTime(review.createdAt)}`}
                >
                  • {formatReviewDateTime(review.createdAt)}
                </span>
              </div>
              {renderStars(review.rating)}
            </div>
            <p className="text-owner-muted leading-relaxed italic">
              “{review.reviewText || `${review.rating}-Star rating`}”
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
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
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
  );
}
