'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef, useEffect } from 'react';
import { Star, Send, ShieldCheck, CheckCircle2, AlertCircle, Camera, Video, X, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { storefrontApi } from '@/lib/api/storefront';
import { reviewsApi } from '@/lib/api/reviews';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/common/Toast';
import { reviewStorage } from '@/lib/utils/reviewStorage';

interface CakeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: number | string;
  productId: number | string;
  productName: string;
  shopName: string;
  initialReview?: {
    id: number;
    customerDisplayName?: string;
    rating: number;
    reviewText: string;
    cakeImageUrl?: string;
    cakeVideoUrl?: string;
    orderReference?: string;
    source?: 'PRODUCT_REVIEW' | 'FEEDBACK';
    editToken?: string;
  } | null;
  onDelete?: () => void;
  onReviewSubmitted?: (newReview: {
    id: number;
    customerDisplayName: string;
    rating: number;
    reviewText: string;
    cakeImageUrl?: string;
    cakeVideoUrl?: string;
    createdAt: string;
    isVerifiedPurchase?: boolean;
    source?: 'PRODUCT_REVIEW' | 'FEEDBACK';
    editToken?: string;
  }) => void;
}

export const CakeReviewModal: React.FC<CakeReviewModalProps> = ({
  isOpen,
  onClose,
  shopId,
  productId,
  productName,
  shopName,
  initialReview,
  onDelete,
  onReviewSubmitted,
}) => {
  const toast = useToast();
  const isEditMode = Boolean(initialReview?.id);
  const [rating, setRating] = useState<number>(initialReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>(initialReview?.customerDisplayName ?? '');
  const [comment, setComment] = useState<string>(initialReview?.reviewText ?? '');
  const [orderReference, setOrderReference] = useState<string>(initialReview?.orderReference ?? '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Existing media retained from initial review
  const [existingCakeImageUrl, setExistingCakeImageUrl] = useState<string | undefined>(initialReview?.cakeImageUrl);
  const [existingCakeVideoUrl, setExistingCakeVideoUrl] = useState<string | undefined>(initialReview?.cakeVideoUrl);

  // Photo & Video Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(
    initialReview?.cakeVideoUrl || initialReview?.cakeImageUrl || null
  );
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(
    initialReview?.cakeVideoUrl ? 'video' : initialReview?.cakeImageUrl ? 'image' : null
  );
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialReview) {
      setRating(initialReview.rating || 5);
      setComment(initialReview.reviewText || '');
      setCustomerName(initialReview.customerDisplayName || '');
      setOrderReference(initialReview.orderReference || '');
      setExistingCakeImageUrl(initialReview.cakeImageUrl);
      setExistingCakeVideoUrl(initialReview.cakeVideoUrl);
      if (initialReview.cakeVideoUrl) {
        setFilePreviewUrl(initialReview.cakeVideoUrl);
        setMediaType('video');
      } else if (initialReview.cakeImageUrl) {
        setFilePreviewUrl(initialReview.cakeImageUrl);
        setMediaType('image');
      } else {
        setFilePreviewUrl(null);
        setMediaType(null);
      }
    }
  }, [initialReview, isOpen]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) return;

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      setFileError('Please select a valid image (JPG, PNG, WEBP) or video (MP4, WEBM).');
      return;
    }

    if (isImg && file.size > 5 * 1024 * 1024) {
      setFileError('Image file size must be under 5MB.');
      return;
    }

    if (isVid && file.size > 25 * 1024 * 1024) {
      setFileError('Video file size must be under 25MB.');
      return;
    }

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreviewUrl(preview);
    setMediaType(isVid ? 'video' : 'image');
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl && selectedFile) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setMediaType(null);
    setExistingCakeImageUrl(undefined);
    setExistingCakeVideoUrl(undefined);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFeedback = async () => {
    if (!initialReview?.id) return;
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    setIsDeleting(true);
    setError(null);
    try {
      const token = initialReview.editToken || reviewStorage.getStoredReviewToken(initialReview.id, initialReview.source);
      const name = initialReview.customerDisplayName || customerName || reviewStorage.getStoredCustomerName();
      if (initialReview.source === 'PRODUCT_REVIEW') {
        const phone = reviewStorage.getStoredCustomerPhone();
        const orderNumber = initialReview.orderReference || '';
        try {
          await reviewsApi.deleteProductReview(shopId, productId, initialReview.id, orderNumber, phone, token);
        } catch {
          await storefrontApi.deleteFeedback(shopId, initialReview.id, token, name);
        }
      } else {
        await storefrontApi.deleteFeedback(shopId, initialReview.id, token, name);
      }
      reviewStorage.removeStoredReview(initialReview.id, initialReview.source);
      toast.success('Your review has been deleted.');
      if (onDelete) onDelete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete review.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please share a few words about your experience with this cake.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let cakeImageUrl: string | undefined = existingCakeImageUrl;
    let cakeVideoUrl: string | undefined = existingCakeVideoUrl;

    // 1. Upload photo or video if new file selected
    if (selectedFile) {
      setIsUploadingMedia(true);
      try {
        const uploadRes = await storefrontApi.uploadReviewMedia(selectedFile);
        if (mediaType === 'video') {
          cakeVideoUrl = uploadRes.url;
          cakeImageUrl = undefined;
        } else {
          cakeImageUrl = uploadRes.url;
          cakeVideoUrl = undefined;
        }
      } catch (uploadErr: any) {
        setError(uploadErr.message || 'Failed to upload photo/video. Please try a smaller file or submit without media.');
        setIsSubmitting(false);
        setIsUploadingMedia(false);
        return;
      } finally {
        setIsUploadingMedia(false);
      }
    }

    try {
      let savedReviewId = initialReview?.id;
      const effectiveSource = (initialReview?.source || 'FEEDBACK') as 'PRODUCT_REVIEW' | 'FEEDBACK';
      const existingToken = initialReview?.editToken || (initialReview?.id ? reviewStorage.getStoredReviewToken(initialReview.id, initialReview.source) : undefined);
      let capturedEditToken = existingToken;

      if (isEditMode && initialReview?.id) {
        if (initialReview.source === 'PRODUCT_REVIEW') {
          const phone = reviewStorage.getStoredCustomerPhone();
          const orderNumber = initialReview.orderReference || '';
          try {
            const updRes = await reviewsApi.updateProductReview(shopId, productId, initialReview.id, {
              orderNumber,
              customerPhone: phone,
              orderItemId: 0,
              rating,
              reviewText: comment.trim(),
              cakeImageUrl,
              cakeVideoUrl,
            }, existingToken);
            if (updRes?.editToken) capturedEditToken = updRes.editToken;
          } catch {
            const updRes = await storefrontApi.updateFeedback(shopId, initialReview.id, {
              rating,
              comment: `[${productName}] ${comment.trim()}`,
              customerDisplayName: customerName.trim() || undefined,
              orderReference: orderReference.trim() || undefined,
              cakeImageUrl,
              cakeVideoUrl,
            }, existingToken);
            if (updRes?.editToken) capturedEditToken = updRes.editToken;
          }
        } else {
          const updRes = await storefrontApi.updateFeedback(shopId, initialReview.id, {
            rating,
            comment: `[${productName}] ${comment.trim()}`,
            customerDisplayName: customerName.trim() || undefined,
            orderReference: orderReference.trim() || undefined,
            cakeImageUrl,
            cakeVideoUrl,
          }, existingToken);
          if (updRes?.editToken) capturedEditToken = updRes.editToken;
        }
        toast.success('Your celebration review has been updated!');
      } else {
        const res = await storefrontApi.submitFeedback(shopId, {
          customerDisplayName: customerName.trim() || 'Valued Customer',
          rating,
          comment: `[${productName}] ${comment.trim()}`,
          orderReference: orderReference.trim() || undefined,
          productId: typeof productId === 'number' ? productId : Number(productId) || null,
          productName: productName,
          cakeImageUrl,
          cakeVideoUrl,
        });
        savedReviewId = res?.id || Date.now();
        if (res?.editToken) {
          capturedEditToken = res.editToken;
        }
        toast.success('Thank you! Your feedback and celebration media have been shared with the baker.');
      }

      const newReview = {
        id: savedReviewId || Date.now(),
        customerDisplayName: customerName.trim() || 'Valued Customer',
        rating,
        reviewText: comment.trim(),
        cakeImageUrl,
        cakeVideoUrl,
        createdAt: new Date().toISOString(),
        isVerifiedPurchase: Boolean(orderReference.trim()),
        source: effectiveSource,
        editToken: capturedEditToken,
      };

      reviewStorage.saveStoredReview({
        id: newReview.id,
        source: effectiveSource,
        shopId,
        productId: typeof productId === 'number' ? productId : Number(productId) || null,
        productName,
        customerDisplayName: newReview.customerDisplayName,
        rating: newReview.rating,
        reviewText: newReview.reviewText,
        orderReference: orderReference.trim() || undefined,
        cakeImageUrl,
        cakeVideoUrl,
        editToken: capturedEditToken,
        createdAt: newReview.createdAt,
      });

      if (customerName.trim()) {
        reviewStorage.setStoredCustomerName(customerName.trim());
      }

      setIsSuccess(true);
      if (onReviewSubmitted) {
        onReviewSubmitted(newReview);
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Unable to connect to the server. The backend has reconnected — please click Update again.');
      } else {
        setError(err.message || 'Failed to submit feedback. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={isEditMode ? 'Edit Your Cake Review' : 'Share Your Cake Experience'}
      description={`Leave a review for ${productName} by ${shopName}`}
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-bold text-brand-espresso">
              {isEditMode ? 'Review Updated!' : 'Review Published!'}
            </h3>
            <p className="text-xs text-brand-muted max-w-sm mx-auto">
              Your celebration review and media have been shared with {shopName}.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSuccess(false)}
              className="text-xs font-semibold gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Review</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="text-xs font-semibold bg-[#5C1D2E] hover:bg-[#4a1525] text-white"
            >
              <span>Done</span>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Selector */}
          <div className="space-y-1.5 text-center py-3 bg-[#FAF7F2] rounded-2xl border border-brand-border/60">
            <label className="text-xs font-bold text-brand-espresso uppercase tracking-wider block">
              How was your cake experience?
            </label>
            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      star <= (hoverRating ?? rating)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-brand-border fill-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-[#5C1D2E] block pt-0.5">
              {rating === 5 && '🌟 Exceptional! (5/5 Stars)'}
              {rating === 4 && '✨ Delicious & Beautiful! (4/5 Stars)'}
              {rating === 3 && '👍 Good Taste (3/5 Stars)'}
              {rating === 2 && '😐 Average Experience (2/5 Stars)'}
              {rating === 1 && '👎 Needs Improvement (1/5 Stars)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Your Name"
              placeholder="e.g. Priya Sharma"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <Input
              label="Order Number (Optional)"
              placeholder="e.g. ORD-1024 or receipt #"
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
            />
          </div>

          {/* Review Comments */}
          <Textarea
            label="Your Review / Feedback"
            required
            rows={3}
            placeholder="Tell us about the flavor, sponge texture, sweetness balance, and decoration..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {/* Photo or Video Upload Option */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-espresso block">
              Add Photo or Video of the Cake <span className="font-normal text-brand-muted">(Optional)</span>
            </label>

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-border/80 hover:border-brand-plum/60 rounded-2xl p-4 transition-all bg-white hover:bg-brand-cream/20 text-center cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-blush/60 text-brand-plum flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-brand-espresso">
                    Click to attach a cake photo or video
                  </p>
                  <p className="text-[11px] text-brand-muted">
                    Supports JPG, PNG, WEBP (up to 5MB) or MP4, WEBM (up to 25MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative p-3 rounded-2xl border border-brand-border/80 bg-white flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/5 shrink-0 flex items-center justify-center border border-brand-border/60">
                  {mediaType === 'image' && filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="Cake preview"
                      className="w-full h-full object-cover"
                    />
                  ) : mediaType === 'video' && filePreviewUrl ? (
                    <video
                      src={filePreviewUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Video className="w-6 h-6 text-brand-plum" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-espresso truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-brand-muted">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {mediaType === 'video' ? 'Video clip' : 'Photo'}
                  </p>
                  {isUploadingMedia && (
                    <p className="text-[11px] text-brand-plum font-semibold flex items-center gap-1 mt-0.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Uploading media...</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg text-brand-muted hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {fileError && (
              <p className="text-xs text-rose-600 font-medium">{fileError}</p>
            )}
          </div>

          <div className="p-3 rounded-xl bg-brand-cream/50 border border-brand-border/60 flex items-center gap-2 text-[11px] text-brand-muted">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Reviews help artisan bakers improve and guide other customers in choosing celebration cakes.</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between gap-2.5">
            {isEditMode ? (
              <button
                type="button"
                onClick={handleDeleteFeedback}
                disabled={isSubmitting || isDeleting}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Review'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || isDeleting || isUploadingMedia}
                className="font-bold shadow-sm bg-[#5C1D2E] hover:bg-[#4a1525] text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>{isSubmitting ? 'Saving...' : isEditMode ? 'Update Review' : 'Post Review & Feedback'}</span>
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
