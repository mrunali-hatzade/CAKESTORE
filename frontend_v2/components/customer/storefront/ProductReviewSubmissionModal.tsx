'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef, useEffect } from 'react';
import { Star, Send, ShieldCheck, CheckCircle2, AlertCircle, Camera, Video, X, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { reviewsApi } from '@/lib/api/reviews';
import { storefrontApi } from '@/lib/api/storefront';
import { useToast } from '@/components/common/Toast';

interface ProductReviewSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: number | string;
  productId: number | string;
  productName: string;
  orderNumber: string;
  customerPhone?: string;
  orderItemId: number;
  initialReview?: {
    id: number;
    rating: number;
    reviewText?: string;
    cakeImageUrl?: string;
    cakeVideoUrl?: string;
  } | null;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export const ProductReviewSubmissionModal: React.FC<ProductReviewSubmissionModalProps> = ({
  isOpen,
  onClose,
  shopId,
  productId,
  productName,
  orderNumber,
  customerPhone = '',
  orderItemId,
  initialReview,
  onSuccess,
  onDelete,
}) => {
  const toast = useToast();
  const isEditMode = Boolean(initialReview?.id);
  const [rating, setRating] = useState<number>(initialReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState<string>(initialReview?.reviewText ?? '');
  const [phone, setPhone] = useState<string>(customerPhone);
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
      setReviewText(initialReview.reviewText || '');
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
    } else {
      setRating(5);
      setReviewText('');
      setExistingCakeImageUrl(undefined);
      setExistingCakeVideoUrl(undefined);
      setFilePreviewUrl(null);
      setMediaType(null);
    }
  }, [initialReview, isOpen]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl && selectedFile) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl, selectedFile]);

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

  const handleDeleteReview = async () => {
    if (!initialReview?.id) return;
    if (!window.confirm('Are you sure you want to delete your review? This will remove your rating and feedback from the bakery.')) {
      return;
    }
    setIsDeleting(true);
    setError(null);
    try {
      await reviewsApi.deleteProductReview(
        shopId,
        productId,
        initialReview.id,
        orderNumber,
        phone || customerPhone
      );
      toast.success('Your review has been deleted.');
      if (onDelete) onDelete();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete review. Please verify your order phone number.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        setError(uploadErr.message || 'Failed to upload celebration photo/video. Please try again.');
        setIsSubmitting(false);
        setIsUploadingMedia(false);
        return;
      } finally {
        setIsUploadingMedia(false);
      }
    }

    try {
      if (isEditMode && initialReview?.id) {
        await reviewsApi.updateProductReview(shopId, productId, initialReview.id, {
          orderNumber,
          customerPhone: phone || customerPhone,
          orderItemId,
          rating,
          reviewText: reviewText.trim(),
          cakeImageUrl,
          cakeVideoUrl,
        });
        toast.success('Your celebration review has been updated!');
      } else {
        await reviewsApi.submitProductReview(shopId, productId, {
          orderNumber,
          customerPhone: phone || customerPhone,
          orderItemId,
          rating,
          reviewText: reviewText.trim(),
          cakeImageUrl,
          cakeVideoUrl,
        });
        toast.success('Thank you! Your verified review and media have been published.');
      }

      setIsSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        handleRemoveFile();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review. Please verify your order phone number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={isEditMode ? 'Edit Your Celebration Review' : 'Review Your Celebration Cake'}
      description={`Share your feedback for ${productName} on Order #${orderNumber}`}
    >
      {isSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-serif font-bold text-brand-espresso">
            {isEditMode ? 'Review Updated!' : 'Review Published!'}
          </h3>
          <p className="text-xs text-brand-muted">
            {isEditMode
              ? 'Your updated review and celebration media are now visible on the bakery storefront.'
              : 'Your verified review and celebration media are now live on the bakery storefront.'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Selector */}
          <div className="space-y-1.5 text-center py-2 bg-brand-cream-light/60 rounded-2xl border border-brand-border/60">
            <label className="text-xs font-bold text-brand-espresso uppercase tracking-wider block">
              Rate this Cake
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
                    className={`w-7 h-7 ${
                      star <= (hoverRating ?? rating)
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-brand-border fill-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-brand-plum">
              {rating === 5 && '🌟 Exceptional! (5/5)'}
              {rating === 4 && '✨ Delicious! (4/5)'}
              {rating === 3 && '👍 Good (3/5)'}
              {rating === 2 && '😐 Average (2/5)'}
              {rating === 1 && '👎 Unsatisfactory (1/5)'}
            </span>
          </div>

          {/* Review Text */}
          <Textarea
            label="Your Review & Experience (Optional)"
            rows={3}
            placeholder="Tell us about the flavor, freshness, decoration, and delivery experience..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
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

          {/* Verification Phone Number */}
          <div className="space-y-1">
            <Input
              label="Order Phone Number (for Purchase Verification)"
              required
              placeholder="e.g. 9823100000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex items-center gap-1.5 text-[11px] text-brand-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Only verified customers who received this order can submit reviews.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-brand-border/60 flex items-center justify-between gap-2.5">
            {isEditMode ? (
              <button
                type="button"
                onClick={handleDeleteReview}
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
              <Button type="submit" size="sm" disabled={isSubmitting || isDeleting || isUploadingMedia} className="font-bold shadow-sm">
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : isEditMode
                    ? 'Update Review'
                    : 'Submit Verified Review'}
                </span>
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
