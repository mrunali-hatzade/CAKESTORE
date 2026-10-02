'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  Clock,
  Check,
  Plus,
  Minus,
  Leaf,
  Truck,
  ChevronDown,
  Info,
  Heart,
  Share2,
  AlertTriangle,
  MessageCircle,
  ArrowRight,
  Calendar,
  Store,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Shop } from '@/types/shop';
import { Product } from '@/types/product';
import { storefrontApi } from '@/lib/api/storefront';
import { deliverySlotsApi } from '@/lib/api/deliverySlots';
import { DeliverySlot } from '@/types/deliverySlot';
import { reviewsApi, ProductReviewsSummary } from '@/lib/api/reviews';
import { apiClient } from '@/lib/api/client';
import { reviewStorage } from '@/lib/utils/reviewStorage';
import { useCart } from '@/context/CartContext';
import { StorefrontNavbar } from '@/components/customer/storefront/StorefrontNavbar';
import { CartDrawer } from '@/components/customer/storefront/CartDrawer';
import { SavedCakesDrawer } from '@/components/customer/storefront/SavedCakesDrawer';
import { CakeReviewModal } from '@/components/customer/storefront/CakeReviewModal';
import { useFavorites } from '@/context/FavoritesContext';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useToast } from '@/components/common/Toast';
import { Footer } from '@/components/common/Footer';

const FALLBACK_CAKE = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80';

const renderRatingStars = (rating: number, starSize = 'w-3.5 h-3.5') => {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillAmount = Math.max(0, Math.min(1, rating - (starIndex - 1)));
        if (fillAmount >= 0.75) {
          return <Star key={starIndex} className={`${starSize} fill-amber-400 text-amber-400 shrink-0`} />;
        } else if (fillAmount >= 0.25) {
          return (
            <div key={starIndex} className={`relative inline-block ${starSize} shrink-0`}>
              <Star className={`${starSize} text-gray-200 fill-gray-200`} />
              <div className="absolute inset-0 overflow-hidden w-[50%]">
                <Star className={`${starSize} fill-amber-400 text-amber-400`} />
              </div>
            </div>
          );
        } else {
          return <Star key={starIndex} className={`${starSize} text-gray-200 fill-gray-200 shrink-0`} />;
        }
      })}
    </div>
  );
};

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const shopId = params?.id as string;
  const productId = params?.productId as string;

  const { addItem, clearCart, currentShopName, setIsCartOpen } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();

  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [customMessage, setCustomMessage] = useState('');
  const [isEgglessPreference, setIsEgglessPreference] = useState<boolean>(true);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [dateSlotChecking, setDateSlotChecking] = useState(false);
  const [dateSlots, setDateSlots] = useState<DeliverySlot[] | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(undefined);
  const [timeSelectionMode, setTimeSelectionMode] = useState<'SLOT' | 'CUSTOM'>('SLOT');
  const [customDeliveryTime, setCustomDeliveryTime] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showConflictPrompt, setShowConflictPrompt] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    about: true,
    ingredients: true,
    delivery: false,
    reviews: false,
    more: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewsSummary | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);

  const loadReviews = useCallback(() => {
    if (!shopId || !productId) return;
    reviewsApi
      .getProductReviews(shopId, productId)
      .then(setReviewsSummary)
      .catch(() => setReviewsSummary(null));
  }, [shopId, productId]);

  const handleReviewSubmitted = () => {
    loadReviews();
  };

  const myProductReview = reviewsSummary?.reviews?.find((r) =>
    reviewStorage.isCustomerReview(r.id, r.customerDisplayName, r.source)
  );

  const openReviewsSection = () => {
    setOpenAccordions((prev) => ({ ...prev, reviews: true }));
    setTimeout(() => {
      document.getElementById('product-reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleOpenEditReview = (r: any) => {
    const token = r.editToken || reviewStorage.getStoredReviewToken(r.id, r.source);
    setEditingReview({
      id: r.id,
      customerDisplayName: r.customerDisplayName,
      rating: r.rating,
      reviewText: r.reviewText,
      cakeImageUrl: r.cakeImageUrl,
      cakeVideoUrl: r.cakeVideoUrl,
      orderReference: r.orderReference,
      source: r.source || 'FEEDBACK',
      editToken: token,
    });
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async (r: any) => {
    if (!window.confirm('Are you sure you want to delete your review?')) return;
    try {
      const token = r.editToken || reviewStorage.getStoredReviewToken(r.id, r.source);
      const customerName = r.customerDisplayName || reviewStorage.getStoredCustomerName();
      if (r.source === 'PRODUCT_REVIEW') {
        const phone = reviewStorage.getStoredCustomerPhone();
        const orderNumber = r.orderReference || '';
        try {
          await reviewsApi.deleteProductReview(shopId, productId, r.id, orderNumber, phone, token);
        } catch {
          await storefrontApi.deleteFeedback(shopId, r.id, token, customerName);
        }
      } else {
        await storefrontApi.deleteFeedback(shopId, r.id, token, customerName);
      }
      reviewStorage.removeStoredReview(r.id, r.source);
      toast.success('Your review has been removed.');
      loadReviews();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  const loadData = useCallback(async () => {
    if (!shopId || !productId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [shopData, prods] = await Promise.all([
        storefrontApi.getShopById(shopId),
        storefrontApi.getStorefrontProducts(shopId),
      ]);
      setShop(shopData);

      const allProds = prods || [];
      const currentProd = allProds.find((p) => String(p.id) === String(productId)) || null;
      if (currentProd) {
        setProduct(currentProd);
        setIsEgglessPreference(currentProd.isEggless ?? (currentProd.eggPreferenceDefault === 'EGGLESS'));
        if (currentProd.variants && currentProd.variants.length > 0) {
          setSelectedVariantId(currentProd.variants[0].id);
        }
      } else {
        const directProd = await storefrontApi.getProductDetails(shopId, productId);
        setProduct(directProd);
        setIsEgglessPreference(directProd.isEggless ?? (directProd.eggPreferenceDefault === 'EGGLESS'));
        if (directProd.variants && directProd.variants.length > 0) {
          setSelectedVariantId(directProd.variants[0].id);
        }
      }

      setOtherProducts(allProds.filter((p) => String(p.id) !== String(productId)).slice(0, 4));

      loadReviews();
    } catch (err: any) {
      setError(err.message || 'Failed to load cake details');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, productId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Delivery Schedule & Availability Checker Logic (Placed unconditionally before early returns)
  const leadTimeDays = shop?.storefrontSettings?.leadTimeDays ?? 0;

  // Earliest allowed date calculation based on bakery lead time
  const earliestDateObj = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + leadTimeDays);
    return d;
  }, [leadTimeDays]);

  const minDateStr = React.useMemo(() => {
    const year = earliestDateObj.getFullYear();
    const month = String(earliestDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(earliestDateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [earliestDateObj]);

  // Quick date chips (Earliest Available, Tomorrow, Upcoming Weekend)
  const quickDateChips = React.useMemo(() => {
    const chips: { label: string; dateStr: string; sublabel: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // 1. Earliest Available
    chips.push({
      label: 'Earliest Available',
      dateStr: toYMD(earliestDateObj),
      sublabel: earliestDateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
    });

    // 2. Tomorrow (if satisfies lead time)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow >= earliestDateObj) {
      chips.push({
        label: 'Tomorrow',
        dateStr: toYMD(tomorrow),
        sublabel: tomorrow.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      });
    }

    // 3. Upcoming Saturday
    const sat = new Date(today);
    const dayOfWeek = sat.getDay();
    const diffToSat = (6 - dayOfWeek + 7) % 7 || 7;
    sat.setDate(sat.getDate() + diffToSat);
    if (sat >= earliestDateObj && toYMD(sat) !== toYMD(earliestDateObj)) {
      chips.push({
        label: 'Upcoming Saturday',
        dateStr: toYMD(sat),
        sublabel: sat.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      });
    }

    return chips;
  }, [earliestDateObj]);

  // Fetch slot availability from backend when date changes
  useEffect(() => {
    if (!deliveryDate || !shop?.id) {
      setDateSlots(null);
      setSelectedSlotId(undefined);
      return;
    }

    let isMounted = true;
    setDateSlotChecking(true);

    deliverySlotsApi
      .getStorefrontSlots(shop.id, deliveryDate)
      .then((slots) => {
        if (isMounted) setDateSlots(slots);
      })
      .catch(() => {
        if (isMounted) setDateSlots([]);
      })
      .finally(() => {
        if (isMounted) setDateSlotChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [deliveryDate, shop?.id]);

  const formatTimeTo12Hour = (timeStr?: string): string => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hoursStr}:${minutes} ${ampm}`;
  };

  const applicableSlots = React.useMemo(() => {
    if (!dateSlots || dateSlots.length === 0 || !deliveryDate) return [];
    const [year, month, day] = deliveryDate.split('-').map(Number);
    const chosenDate = new Date(year, month - 1, day);
    const weekdayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const weekday = weekdayNames[chosenDate.getDay()];

    const matched = dateSlots.filter((s) => {
      if (!s.dayOfWeek) return true;
      const dow = s.dayOfWeek.toUpperCase();
      return dow === weekday || dow === 'EVERYDAY' || dow === 'ALL';
    });

    return matched.length > 0 ? matched : dateSlots;
  }, [dateSlots, deliveryDate]);

  const selectedSlot = React.useMemo(() => {
    if (!selectedSlotId || applicableSlots.length === 0) return null;
    return applicableSlots.find((s) => s.id === selectedSlotId) || null;
  }, [selectedSlotId, applicableSlots]);

  const resolvedSlotForCustomTime = React.useMemo(() => {
    if (!customDeliveryTime || applicableSlots.length === 0) {
      return applicableSlots.find((s) => s.available !== false) || applicableSlots[0] || null;
    }
    const [h, m] = customDeliveryTime.split(':').map(Number);
    const customMinutes = (h || 0) * 60 + (m || 0);

    const covering = applicableSlots.find((slot) => {
      if (slot.available === false) return false;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const startMin = (sh || 0) * 60 + (sm || 0);
      let endMin = (eh || 0) * 60 + (em || 0);
      if (endMin < startMin) endMin += 24 * 60;
      return customMinutes >= startMin && customMinutes <= endMin;
    });

    if (covering) return covering;
    return applicableSlots.find((s) => s.available !== false) || applicableSlots[0] || null;
  }, [customDeliveryTime, applicableSlots]);

  const effectiveSlotId = React.useMemo(() => {
    if (timeSelectionMode === 'CUSTOM') {
      return customDeliveryTime ? (resolvedSlotForCustomTime?.id || selectedSlotId) : undefined;
    }
    return selectedSlotId;
  }, [timeSelectionMode, customDeliveryTime, resolvedSlotForCustomTime, selectedSlotId]);

  const effectiveDeliveryTime = React.useMemo(() => {
    if (timeSelectionMode === 'CUSTOM' && customDeliveryTime) {
      return formatTimeTo12Hour(customDeliveryTime);
    }
    return undefined;
  }, [timeSelectionMode, customDeliveryTime]);

  useEffect(() => {
    if (selectedSlotId) {
      const exists = applicableSlots.some(
        (s) => s.id === selectedSlotId && s.available !== false && (s.remainingCapacity === undefined || s.remainingCapacity > 0)
      );
      if (!exists) {
        setSelectedSlotId(undefined);
      }
    }
  }, [applicableSlots, selectedSlotId]);

  // Evaluate chosen date against bakery operating hours & lead time
  const deliveryAvailability = React.useMemo(() => {
    if (!deliveryDate) return null;

    const [year, month, day] = deliveryDate.split('-').map(Number);
    const chosenDate = new Date(year, month - 1, day);
    chosenDate.setHours(0, 0, 0, 0);

    const minDate = new Date(earliestDateObj);
    minDate.setHours(0, 0, 0, 0);

    const readableDate = chosenDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

    // Check 1: Lead time
    if (chosenDate < minDate) {
      return {
        status: 'LEAD_TIME' as const,
        dayName: chosenDate.toLocaleDateString('en-IN', { weekday: 'long' }),
        readableDate,
        message: shop?.storefrontSettings?.leadTimeMessage || `Orders require ${leadTimeDays} day${leadTimeDays > 1 ? 's' : ''} advance notice. Earliest delivery date is ${earliestDateObj.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}.`,
        isOpen: false,
      };
    }

    // Check 2: Day of Week & Business Hours
    const weekdayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const weekday = weekdayNames[chosenDate.getDay()];
    const dayHours = (shop?.businessHours || []).find((bh) => bh.dayOfWeek?.toUpperCase() === weekday);

    if (dayHours && dayHours.isOpen === false) {
      return {
        status: 'CLOSED' as const,
        dayName: chosenDate.toLocaleDateString('en-IN', { weekday: 'long' }),
        readableDate,
        message: `${shop?.businessName || 'The bakery'} is closed every ${chosenDate.toLocaleDateString('en-IN', { weekday: 'long' })}. Please select another date.`,
        isOpen: false,
      };
    }

    const openTimeFormatted = dayHours?.openTime ? formatTimeTo12Hour(dayHours.openTime) : '09:00 AM';
    const closeTimeFormatted = dayHours?.closeTime ? formatTimeTo12Hour(dayHours.closeTime) : '09:00 PM';

    // Check 3: Slot capacity
    if (dateSlots !== null && dateSlots.length > 0) {
      const slotsToCheck = applicableSlots.length > 0 ? applicableSlots : dateSlots;
      const anySlotOpen = slotsToCheck.some(
        (s) => s.available !== false && (s.remainingCapacity === undefined || s.remainingCapacity > 0)
      );
      if (!anySlotOpen) {
        return {
          status: 'FULL' as const,
          dayName: chosenDate.toLocaleDateString('en-IN', { weekday: 'long' }),
          readableDate,
          openTime: openTimeFormatted,
          closeTime: closeTimeFormatted,
          message: `All delivery capacity for ${readableDate} is currently fully booked. Please select another date.`,
          isOpen: false,
        };
      }
    }

    return {
      status: 'OPEN' as const,
      dayName: chosenDate.toLocaleDateString('en-IN', { weekday: 'long' }),
      readableDate,
      openTime: openTimeFormatted,
      closeTime: closeTimeFormatted,
      message: `${shop?.businessName || 'Bakery'} is open & available for delivery on ${readableDate}!`,
      isOpen: true,
    };
  }, [deliveryDate, shop, earliestDateObj, leadTimeDays, dateSlots, applicableSlots]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <LoadingState message="Loading artisan cake details..." />
      </div>
    );
  }

  if (error || !shop || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2] p-4">
        <ErrorState
          message={error || 'Cake not found'}
          onRetry={loadData}
        />
      </div>
    );
  }

  const rawGallery = [
    product.imageUrl,
    ...(product.images || []).map((img: any) => img.imageUrl),
  ].filter(Boolean) as string[];
  const galleryThumbnails = rawGallery.length > 0 ? rawGallery : [FALLBACK_CAKE];

  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const isVariantWeight = Boolean(
    hasVariants && product.variants?.some((v) => /\b(g|kg|gm|gms|pound|lbs|serve|serves)\b/i.test(v.name))
  );
  const selectedVariant = hasVariants
    ? product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0]
    : null;

  const baseUnitPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);

  const addonsTotal = (product.addons || [])
    .filter((a) => a.id && selectedAddonIds.includes(a.id))
    .reduce((sum, a) => sum + Number(a.price), 0);

  const egglessDiff = Boolean(product.allowEggChoice && isEgglessPreference && product.egglessPriceDiff)
    ? Number(product.egglessPriceDiff)
    : 0;

  const unitPrice = baseUnitPrice + addonsTotal + egglessDiff;

  // Determine effective original price for discount display
  // Prioritize variant-specific originalPrice if set, otherwise fall back to product-level originalPrice
  const effectiveOriginalPrice = selectedVariant?.originalPrice
    ? Number(selectedVariant.originalPrice)
    : (product.originalPrice ? Number(product.originalPrice) : null);

  const discountPercent = effectiveOriginalPrice && effectiveOriginalPrice > unitPrice
    ? Math.round(((effectiveOriginalPrice - unitPrice) / effectiveOriginalPrice) * 100)
    : 0;

  const getFullItemName = () => {
    let name = product.name;
    if (selectedVariant) {
      name += ` (${selectedVariant.name})`;
    }
    const selectedAddons = (product.addons || []).filter((a) => a.id && selectedAddonIds.includes(a.id));
    if (selectedAddons.length > 0) {
      name += ` + ${selectedAddons.map((a) => a.name).join(', ')}`;
    }
    return name;
  };
  const getSlotName = () => {
    if (timeSelectionMode === 'CUSTOM' && customDeliveryTime) {
      return `Exact Time: ${formatTimeTo12Hour(customDeliveryTime)}`;
    }
    if (!selectedSlot) return undefined;
    const timeRange = `${formatTimeTo12Hour(selectedSlot.startTime)} - ${formatTimeTo12Hour(selectedSlot.endTime)}`;
    return selectedSlot.name ? `${selectedSlot.name} (${timeRange})` : timeRange;
  };

  const handleAddToCart = () => {
    if (deliveryDate && deliveryAvailability && !deliveryAvailability.isOpen) {
      toast.error(deliveryAvailability.message);
      return;
    }

    const result = addItem({
      productId: product.id,
      name: getFullItemName(),
      price: unitPrice,
      quantity,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || FALLBACK_CAKE,
      isEggless: isEgglessPreference,
      customMessage: customMessage.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      deliverySlotId: effectiveSlotId || undefined,
      deliverySlotName: getSlotName(),
      deliveryTime: effectiveDeliveryTime,
      deliveryTimeType: timeSelectionMode,
      shopId: shop.id,
      shopName: shop.businessName,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      weight: selectedVariant ? selectedVariant.name : undefined,
      dietaryPreference: isEgglessPreference ? 'EGGLESS' : 'REGULAR',
    });

    if (result.conflict) {
      setShowConflictPrompt(true);
      return;
    }

    if (deliveryDate && deliveryAvailability?.isOpen) {
      let timeNote = '';
      if (timeSelectionMode === 'CUSTOM' && customDeliveryTime) {
        timeNote = ` at ${formatTimeTo12Hour(customDeliveryTime)}`;
      } else if (selectedSlot) {
        timeNote = ` (${formatTimeTo12Hour(selectedSlot.startTime)} - ${formatTimeTo12Hour(selectedSlot.endTime)})`;
      }
      toast.success(`Added to basket for delivery on ${deliveryAvailability.readableDate}${timeNote}!`);
    } else {
      toast.success(`Added "${product.name}" to basket!`);
    }
    setIsCartOpen(true);
  };

  const handleDirectCheckout = () => {
    if (deliveryDate && deliveryAvailability && !deliveryAvailability.isOpen) {
      toast.error(deliveryAvailability.message);
      return;
    }

    const result = addItem({
      productId: product.id,
      name: getFullItemName(),
      price: unitPrice,
      quantity,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || FALLBACK_CAKE,
      isEggless: isEgglessPreference,
      customMessage: customMessage.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      deliverySlotId: effectiveSlotId || undefined,
      deliverySlotName: getSlotName(),
      deliveryTime: effectiveDeliveryTime,
      deliveryTimeType: timeSelectionMode,
      shopId: shop.id,
      shopName: shop.businessName,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      weight: selectedVariant ? selectedVariant.name : undefined,
      dietaryPreference: isEgglessPreference ? 'EGGLESS' : 'REGULAR',
    });

    if (result.conflict) {
      setShowConflictPrompt(true);
      return;
    }

    router.push(`/shop/${shop.id}?tab=checkout`);
  };

  const handleReplaceCart = () => {
    clearCart();
    addItem({
      productId: product.id,
      name: getFullItemName(),
      price: unitPrice,
      quantity,
      imageUrl: selectedVariant?.imageUrl || product.imageUrl || FALLBACK_CAKE,
      isEggless: isEgglessPreference,
      customMessage: customMessage.trim() || undefined,
      deliveryDate: deliveryDate || undefined,
      deliverySlotId: effectiveSlotId || undefined,
      deliverySlotName: getSlotName(),
      deliveryTime: effectiveDeliveryTime,
      deliveryTimeType: timeSelectionMode,
      shopId: shop.id,
      shopName: shop.businessName,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      weight: selectedVariant ? selectedVariant.name : undefined,
      dietaryPreference: isEgglessPreference ? 'EGGLESS' : 'REGULAR',
    });
    setShowConflictPrompt(false);
    toast.success(`Cart updated for "${shop.businessName}"!`);
    setIsCartOpen(true);
  };

  const totalReviews = reviewsSummary?.totalReviews ?? 0;
  const averageRating = reviewsSummary?.averageRating ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] font-sans">
      <StorefrontNavbar shop={shop} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 w-full space-y-8">
        {/* Top Breadcrumb & Share */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border/60 text-xs">
          <div className="flex items-center gap-2 text-brand-muted">
            <Link
              href={`/shop/${shop.id}?tab=shop`}
              className="inline-flex items-center gap-1.5 font-bold text-brand-espresso hover:text-[#5C1D2E] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {shop.businessName}&apos;s Menu</span>
            </Link>
            <span>/</span>
            <span className="text-[#C5A880] font-medium uppercase tracking-wider">
              {product.categoryName || product.category?.replace(/_/g, ' ') || 'Artisanal Cakes'}
            </span>
            <span>/</span>
            <span className="font-semibold text-[#2C1A1D] truncate max-w-xs">{product.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${product.name} | ${shop.businessName}`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Cake link copied to clipboard!');
                }
              }}
              className="p-2 rounded-full bg-white border border-brand-border/80 text-brand-muted hover:text-brand-espresso transition-colors shadow-2xs cursor-pointer"
              title="Share cake"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cart Conflict Modal Banner */}
        {showConflictPrompt && (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold">
                Your cart currently contains items from <strong>{currentShopName}</strong>. Each order must be placed with a single artisan bakery.
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowConflictPrompt(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleReplaceCart}>
                Clear Cart &amp; Order from {shop.businessName}
              </Button>
            </div>
          </div>
        )}

        {/* Main 2-Column Product Detail Layout (Matching UI Design Reference Panel 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN: Main Image + 3 Thumbnails + 5 Accordions       */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 w-full space-y-4">
            {/* Main Photo Card - Full cake visible, object-contain on cream background */}
            <div className="relative w-full rounded-3xl overflow-hidden bg-[#FDF8F3] border border-brand-border/60 shadow-md flex items-center justify-center" style={{ height: 'clamp(360px, 50vw, 540px)' }}>
              <img
                src={(selectedVariant?.imageUrl && selectedImageIndex === 0 ? selectedVariant.imageUrl : galleryThumbnails[selectedImageIndex]) || FALLBACK_CAKE}
                alt={product.name}
                className="w-full h-full object-contain object-center transition-all duration-500 hover:scale-[1.03] p-4"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_CAKE;
                }}
              />

              {/* Subtle bottom gradient for depth */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#FDF8F3]/70 to-transparent pointer-events-none" />

              {/* Floating Wishlist Heart Icon */}
              <button
                type="button"
                onClick={() => toggleFavorite(product, shop.id, shop.businessName)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 backdrop-blur-md shadow-sm hover:bg-white transition-all cursor-pointer z-10"
                title={isFavorite(product.id) ? 'Saved to favorites' : 'Save cake'}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite(product.id) ? 'fill-rose-500 text-rose-500' : 'text-brand-muted hover:text-rose-500'
                  }`}
                />
              </button>

              {/* Floating Average Customer Review Pill */}
              <button
                type="button"
                onClick={openReviewsSection}
                className="absolute top-4 right-[3.5rem] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-sm hover:bg-white transition-all border border-brand-border/40 text-xs font-bold text-[#2C1A1D] cursor-pointer z-10"
                title="Click to view customer reviews"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{totalReviews > 0 && averageRating > 0 ? averageRating.toFixed(1) : 'New'}</span>
                <span className="text-[11px] text-brand-muted font-normal">
                  ({totalReviews > 0 ? `${totalReviews} reviews` : 'Fresh'})
                </span>
              </button>

              {/* Top Left Dietary Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-sm text-xs font-bold text-brand-espresso border border-brand-border/40">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isEgglessPreference ? 'bg-emerald-600 ring-2 ring-emerald-600/20' : 'bg-amber-600'
                    }`}
                  />
                  <span>
                    {product.allowEggChoice
                      ? (isEgglessPreference ? 'Eggless Option' : 'Contains Egg')
                      : (product.isEggless ?? (product.eggPreferenceDefault === 'EGGLESS'))
                        ? (shop?.isPureVeg ? '100% Pure Veg (Eggless)' : 'Eggless')
                        : 'Contains Egg'}
                  </span>
                </span>
                {product.allowEggChoice && (
                  <span className="text-[10px] font-semibold text-brand-muted bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-brand-border/30">
                    Choice Allowed
                  </span>
                )}
              </div>
            </div>

            {/* Gallery Thumbnails */}
            <div className="grid grid-cols-3 gap-2.5">
              {galleryThumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-18 sm:h-20 w-full rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#5C1D2E] ring-2 ring-[#5C1D2E]/20 shadow-sm scale-102'
                      : 'border-brand-border/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={thumb}
                    alt={`Angle ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_CAKE;
                    }}
                  />
                </button>
              ))}
            </div>

                        {/* Product Configuration & Purchase Panel (With Card Border Restored) */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-brand-border/80 shadow-soft space-y-4">
              {/* Title & Category */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#C5A880] block">
                {product.categoryName || product.category?.replace(/_/g, ' ') || 'Artisanal Creation'}
              </span>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2C1A1D] tracking-tight mt-0.5">
                {product.name}
              </h1>
            </div>

            {/* Rating and Reviews Counter (Clean original layout with accurate fractional stars) */}
            <div className="flex items-center gap-2 pt-0.5">
              {renderRatingStars(totalReviews > 0 ? averageRating : 0, 'w-3.5 h-3.5')}
              <span className="text-xs font-bold text-brand-espresso">
                {totalReviews > 0 && averageRating > 0 ? averageRating.toFixed(1) : 'New'}
              </span>
              <button
                type="button"
                onClick={openReviewsSection}
                className="text-xs text-brand-muted hover:text-brand-plum underline decoration-brand-border cursor-pointer"
                title="Click to view all customer reviews"
              >
                ({totalReviews > 0 ? `${totalReviews} customer reviews` : 'Be the first to review'})
              </button>
            </div>

            {/* Price & Discount */}
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <div className="text-2xl font-serif font-extrabold text-[#2C1A1D]">
                ₹{unitPrice}
              </div>
              {effectiveOriginalPrice && discountPercent >= 1 ? (
                <>
                  <span className="text-sm text-brand-muted line-through">
                    ₹{effectiveOriginalPrice}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {discountPercent}% OFF
                  </span>
                </>
              ) : null}
            </div>

            {/* Short Description */}
            {product.description && (
              <p className="text-xs text-brand-muted leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}

            {/* Real Variants from Database (Only if configured by owner) */}
            {hasVariants && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#2C1A1D] w-24 shrink-0">
                  {isVariantWeight ? 'Weight:' : 'Option:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants!.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedVariantId === v.id
                          ? 'bg-[#5C1D2E] text-white shadow-xs'
                          : 'bg-white text-brand-espresso border border-brand-border hover:bg-brand-cream/40'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Eggless Option - Inline Row (only when owner enabled allowEggChoice) */}
            {product.allowEggChoice ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#2C1A1D] w-24 shrink-0">Dietary:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEgglessPreference(true)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isEgglessPreference
                        ? 'bg-[#5C1D2E] text-white shadow-xs'
                        : 'bg-white text-brand-espresso border border-brand-border hover:bg-brand-cream/40'
                    }`}
                  >
                    Eggless{product.egglessPriceDiff && Number(product.egglessPriceDiff) > 0 ? ` (+₹${product.egglessPriceDiff})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEgglessPreference(false)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isEgglessPreference
                        ? 'bg-[#5C1D2E] text-white shadow-xs'
                        : 'bg-white text-brand-espresso border border-brand-border hover:bg-brand-cream/40'
                    }`}
                  >
                    Contains Egg
                  </button>
                </div>
              </div>
            ) : null}

            {/* Addons if configured */}
            {product.addons && product.addons.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#2C1A1D] block">Celebration Add-ons</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.addons.map((addon) => {
                    const isChecked = Boolean(addon.id && selectedAddonIds.includes(addon.id));
                    return (
                      <button
                        key={addon.id ?? addon.name}
                        type="button"
                        onClick={() => {
                          if (!addon.id) return;
                          if (isChecked) {
                            setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                          } else {
                            setSelectedAddonIds([...selectedAddonIds, addon.id]);
                          }
                        }}
                        className={`p-2 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-brand-blush border-brand-plum text-brand-espresso shadow-2xs'
                            : 'bg-white border-brand-border hover:bg-brand-cream/40 text-brand-espresso'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isChecked ? 'bg-brand-plum border-brand-plum text-white' : 'border-brand-border bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs font-medium">{addon.name}</span>
                        </div>
                        <span className="text-xs font-bold text-brand-plum">+₹{addon.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cake Personalization (Message on Cake) */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#2C1A1D]">Cake Message (Piped on Plaque)</label>
                <span className="text-[10px] text-brand-muted">{customMessage.length}/45 chars • Optional</span>
              </div>
              <input
                type="text"
                maxLength={45}
                placeholder="E.g., Happy Birthday Emily!"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-brand-border bg-white text-xs text-brand-espresso placeholder:text-brand-muted/70 focus:outline-none focus:border-[#5C1D2E] focus:ring-1 focus:ring-[#5C1D2E] shadow-2xs transition-all"
              />
            </div>

            {/* Check Delivery Date & Bakery Open Status */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2]/80 border border-brand-border/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#5C1D2E]" />
                  <span className="text-xs font-bold text-[#2C1A1D]">Check Delivery on Desired Date</span>
                </div>
                {deliveryDate ? (
                  <button
                    type="button"
                    onClick={() => setDeliveryDate('')}
                    className="text-[10px] font-semibold text-brand-muted hover:text-brand-espresso underline cursor-pointer"
                  >
                    Clear Date
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-brand-muted">Optional</span>
                )}
              </div>

              {/* Date Input with Quick Presets */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="date"
                    min={minDateStr}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full h-10 px-3.5 pl-10 rounded-xl border border-brand-border bg-white text-xs font-medium text-brand-espresso focus:outline-none focus:border-[#5C1D2E] focus:ring-1 focus:ring-[#5C1D2E] shadow-2xs transition-all cursor-pointer"
                  />
                  <Calendar className="w-4 h-4 text-brand-muted absolute left-3 top-3 pointer-events-none" />
                </div>

                {/* Quick Date Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-semibold text-brand-muted mr-0.5">Quick select:</span>
                  {quickDateChips.map((chip) => {
                    const isSelected = deliveryDate === chip.dateStr;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => setDeliveryDate(chip.dateStr)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5C1D2E] text-white border-[#5C1D2E] font-bold shadow-2xs'
                            : 'bg-white text-brand-espresso border-brand-border/70 hover:bg-brand-cream/40 font-medium'
                        }`}
                      >
                        {chip.label} ({chip.sublabel})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Live Verification Status */}
              {dateSlotChecking ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-brand-border/60 text-xs text-brand-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5C1D2E]" />
                  <span>Checking bakery schedule &amp; slot capacity...</span>
                </div>
              ) : deliveryAvailability ? (
                deliveryAvailability.status === 'OPEN' ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-950 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-emerald-900">
                        Bakery is Open &amp; Available for Delivery!
                      </p>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Bakery operating hours: <strong>{deliveryAvailability.dayName}s</strong> ({deliveryAvailability.openTime} – {deliveryAvailability.closeTime}).
                        {dateSlots && dateSlots.length > 0 && (
                          <span className="block font-medium mt-0.5 text-emerald-900">
                            ✓ Delivery dispatch windows available for {deliveryAvailability.readableDate} below
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : deliveryAvailability.status === 'CLOSED' ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-950 flex items-start gap-2.5">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-rose-900">
                        Bakery Closed on this Day
                      </p>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        {deliveryAvailability.message}
                      </p>
                    </div>
                  </div>
                ) : deliveryAvailability.status === 'FULL' ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-950 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-rose-900">
                        Delivery Capacity Full
                      </p>
                      <p className="text-[11px] text-rose-800 leading-relaxed">
                        {deliveryAvailability.message}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-bold text-amber-900">
                        Advance Preparation Notice
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {deliveryAvailability.message}
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-brand-muted px-1">
                  <Clock className="w-3.5 h-3.5 text-[#5C1D2E] shrink-0" />
                  <span>
                    {leadTimeDays > 0
                      ? `Requires ${leadTimeDays} day${leadTimeDays > 1 ? 's' : ''} advance notice. Select your date to verify bakery opening hours.`
                      : 'Select your preferred date above to verify bakery opening hours & delivery capacity.'}
                  </span>
                </div>
              )}

              {/* Delivery Time Selection (Window vs Exact Custom Time) */}
              {deliveryAvailability && deliveryAvailability.isOpen && (
                <div className="pt-2.5 border-t border-brand-border/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#2C1A1D] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#5C1D2E]" />
                      <span>Delivery Time Preference</span>
                    </label>
                    {(selectedSlotId || customDeliveryTime) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSlotId(undefined);
                          setCustomDeliveryTime('');
                        }}
                        className="text-[10px] font-semibold text-brand-muted hover:text-brand-espresso underline cursor-pointer"
                      >
                        Clear Time
                      </button>
                    ) : (
                      <span className="text-[10px] text-brand-muted">Optional</span>
                    )}
                  </div>

                  {/* Mode Switch: Standard Window vs Choose Exact Time */}
                  <div className="grid grid-cols-2 p-1 bg-brand-cream/60 rounded-xl border border-brand-border/60 text-xs">
                    <button
                      type="button"
                      onClick={() => setTimeSelectionMode('SLOT')}
                      className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer ${
                        timeSelectionMode === 'SLOT'
                          ? 'bg-white text-[#5C1D2E] font-bold shadow-2xs'
                          : 'text-brand-muted hover:text-brand-espresso'
                      }`}
                    >
                      Bakery Window ({applicableSlots.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeSelectionMode('CUSTOM')}
                      className={`py-1.5 px-2 rounded-lg font-medium text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        timeSelectionMode === 'CUSTOM'
                          ? 'bg-[#5C1D2E] text-white font-bold shadow-2xs'
                          : 'text-brand-muted hover:text-brand-espresso'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Choose Exact Time</span>
                    </button>
                  </div>

                  {timeSelectionMode === 'SLOT' ? (
                    applicableSlots.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {applicableSlots.map((slot) => {
                          const isSelected = selectedSlotId === slot.id;
                          const isSlotAvailable = slot.available !== false && (slot.remainingCapacity === undefined || slot.remainingCapacity > 0);
                          const timeLabel = `${formatTimeTo12Hour(slot.startTime)} – ${formatTimeTo12Hour(slot.endTime)}`;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isSlotAvailable}
                              onClick={() => {
                                if (isSlotAvailable) {
                                  setSelectedSlotId(isSelected ? undefined : slot.id);
                                }
                              }}
                              className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-1 cursor-pointer disabled:cursor-not-allowed ${
                                isSelected
                                  ? 'bg-[#5C1D2E] border-[#5C1D2E] text-white shadow-xs ring-2 ring-[#5C1D2E]/20'
                                  : isSlotAvailable
                                  ? 'bg-white border-brand-border/80 hover:border-[#5C1D2E]/60 hover:bg-brand-cream/30 text-brand-espresso'
                                  : 'bg-gray-100/80 border-gray-200 text-gray-400 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#2C1A1D]'}`}>
                                  {slot.name ? slot.name : timeLabel}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>

                              {slot.name && (
                                <span className={`text-[10px] font-medium ${isSelected ? 'text-white/90' : 'text-brand-muted'}`}>
                                  {timeLabel}
                                </span>
                              )}

                              <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[10px]">
                                {!isSlotAvailable ? (
                                  <span className="text-red-500 font-semibold">Fully Booked</span>
                                ) : slot.remainingCapacity !== undefined && slot.remainingCapacity <= 3 ? (
                                  <span className={isSelected ? 'text-amber-200 font-semibold' : 'text-amber-700 font-semibold'}>
                                    ⚡ Only {slot.remainingCapacity} {slot.remainingCapacity === 1 ? 'slot' : 'slots'} left!
                                  </span>
                                ) : (
                                  <span className={isSelected ? 'text-white/80' : 'text-emerald-700 font-medium'}>
                                    ✓ Available ({slot.remainingCapacity ?? slot.maxOrders} left)
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white/70 border border-brand-border/60 text-center">
                        <p className="text-[11px] text-brand-muted">
                          No specific delivery time windows set for {deliveryAvailability.dayName}s. Switch to &quot;Choose Exact Time&quot; or standard store hours ({deliveryAvailability.openTime} – {deliveryAvailability.closeTime}) will apply.
                        </p>
                      </div>
                    )
                  ) : (
                    /* Custom Exact Time Picker */
                    <div className="p-3 rounded-xl bg-white border border-[#5C1D2E]/30 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#2C1A1D]">
                          Pick Your Desired Delivery Time
                        </span>
                        {customDeliveryTime && (
                          <span className="text-[11px] font-bold text-[#5C1D2E] bg-brand-blush/60 px-2 py-0.5 rounded-md">
                            🕒 {formatTimeTo12Hour(customDeliveryTime)}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="time"
                          value={customDeliveryTime}
                          onChange={(e) => setCustomDeliveryTime(e.target.value)}
                          className="w-full h-10 px-3.5 pl-10 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-espresso focus:outline-none focus:border-[#5C1D2E] focus:ring-1 focus:ring-[#5C1D2E] cursor-pointer"
                        />
                        <Clock className="w-4 h-4 text-[#5C1D2E] absolute left-3 top-3 pointer-events-none" />
                      </div>

                      {/* Quick Popular Times */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-brand-muted">Popular celebration times:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '12:00 PM', val: '12:00', desc: 'Lunch' },
                            { label: '04:30 PM', val: '16:30', desc: 'Tea Party' },
                            { label: '07:00 PM', val: '19:00', desc: 'Party' },
                            { label: '09:00 PM', val: '21:00', desc: 'Dinner' },
                          ].map((chip) => {
                            const isChipSelected = customDeliveryTime === chip.val;
                            return (
                              <button
                                key={chip.val}
                                type="button"
                                onClick={() => setCustomDeliveryTime(chip.val)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                  isChipSelected
                                    ? 'bg-[#5C1D2E] text-white border-[#5C1D2E] font-bold shadow-2xs'
                                    : 'bg-brand-cream/30 text-brand-espresso border-brand-border/70 hover:bg-brand-cream font-medium'
                                }`}
                              >
                                {chip.label} ({chip.desc})
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Operating Hours Check Notice */}
                      <div className="text-[10px] text-brand-muted flex items-center gap-1.5 pt-1 border-t border-brand-border/40">
                        <Store className="w-3 h-3 text-brand-muted shrink-0" />
                        <span>
                          Bakery hours on {deliveryAvailability.dayName}s: <strong>{deliveryAvailability.openTime} – {deliveryAvailability.closeTime}</strong>.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity Stepper & Add to Cart */}
            <div className="flex items-center gap-2.5 pt-3 border-t border-brand-border/60">
              <div className="flex items-center gap-1.5 border border-brand-border rounded-xl px-2.5 py-1.5 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-1 rounded-full text-brand-espresso hover:bg-brand-cream/40 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-serif font-bold text-sm text-brand-espresso w-5 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="p-1 rounded-full text-brand-espresso hover:bg-brand-cream/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                onClick={handleAddToCart}
                disabled={Boolean(deliveryDate && deliveryAvailability && !deliveryAvailability.isOpen)}
                size="md"
                className={`flex-1 font-bold h-11 rounded-xl shadow-xs text-xs sm:text-sm text-white transition-all ${
                  deliveryDate && deliveryAvailability && !deliveryAvailability.isOpen
                    ? 'bg-gray-400 cursor-not-allowed opacity-80'
                    : 'bg-[#5C1D2E] hover:bg-[#4a1525] cursor-pointer'
                }`}
              >
                <span>
                  {deliveryDate && deliveryAvailability && !deliveryAvailability.isOpen
                    ? 'Bakery Closed on Selected Date'
                    : `Add to Cart • ₹${unitPrice * quantity}`}
                </span>
              </Button>
            </div>

            {/* Direct Order & WhatsApp Consultation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <Button
                onClick={handleDirectCheckout}
                variant="outline"
                size="sm"
                className="w-full font-bold h-10 rounded-xl border-[#5C1D2E] text-[#5C1D2E] hover:bg-brand-blush/40 text-xs cursor-pointer"
              >
                <span>Direct Order &amp; Delivery</span>
              </Button>

              {shop.phone && (
                <a
                  href={`https://wa.me/${shop.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hi ${shop.businessName}, I'm interested in ordering "${product.name}" (₹${unitPrice * quantity}) on CakeStore. Could you please assist me with customization and delivery?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ask on WhatsApp</span>
                </a>
              )}
            </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Information Accordions & Details Group         */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 w-full space-y-4">
            {/* Information Accordions Group (Matching UI Design Panel 4 Left Column) */}
            <div className="border border-brand-border/80 rounded-2xl overflow-hidden bg-white divide-y divide-brand-border/60 shadow-2xs">
              
              {/* 1. About this cake */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('about')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm text-[#2C1A1D] block">About this cake</span>
                      <span className="text-[10px] text-brand-muted">Crafted by {shop.businessName}&apos;s bakery</span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.about ? 'rotate-180 text-brand-plum' : ''
                    }`}
                  />
                </button>
                {openAccordions.about && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <p className="whitespace-pre-line">
                      {product.description?.trim() ? product.description.trim() : <span className="text-brand-muted italic">No description provided for this cake.</span>}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="bg-white p-3 rounded-xl border border-brand-border/40">
                        <span className="font-bold text-brand-espresso block text-[11px]">Notice Window</span>
                        <span className="text-brand-muted text-[11px]">
                          {product.preparationTimeHours
                            ? `${product.preparationTimeHours} hrs advance notice`
                            : 'Standard preparation'}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-brand-border/40">
                        <span className="font-bold text-brand-espresso block text-[11px]">Kitchen Standard</span>
                        <span className="text-brand-muted text-[11px]">100% Baked Fresh to Order</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Ingredients & Dietary Safety (Always Visible) */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('ingredients')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-serif font-bold text-sm text-[#2C1A1D] block">Ingredients &amp; Dietary Safety</span>
                      <span className="text-[10px] text-brand-muted">Fresh &amp; natural ingredients disclosure</span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.ingredients ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {openAccordions.ingredients && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div>
                      <strong className="text-brand-espresso font-semibold block text-[11px] uppercase tracking-wider">
                        Ingredients:
                      </strong>
                      {product.ingredients?.trim() ? (
                        <p className="mt-1 text-xs leading-relaxed text-brand-espresso/80 whitespace-pre-line">
                          {product.ingredients.trim()}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-brand-muted italic">
                          Ingredients not specified by the bakery.
                        </p>
                      )}
                    </div>

                    {product.allergens?.trim() && (
                      <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
                        <strong className="text-amber-900 font-semibold block text-[11px]">Allergen Notice:</strong>
                        <p className="text-amber-900/90 mt-1 text-[11px] leading-relaxed whitespace-pre-line">
                          {product.allergens.trim()}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isEgglessPreference
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {product.allowEggChoice
                          ? (isEgglessPreference ? '🌱 Eggless Option Selected' : 'Contains Egg Selected')
                          : (product.isEggless ?? (product.eggPreferenceDefault === 'EGGLESS'))
                            ? (shop?.isPureVeg ? '🌱 100% Pure Veg (Eggless)' : '🌱 Eggless')
                            : 'Contains Egg'}
                      </span>
                      {product.allowEggChoice && (
                        <span className="text-[10px] text-brand-muted bg-brand-cream/40 px-2 py-0.5 rounded-full border border-brand-border/40">
                          Choice Allowed (Default: {product.eggPreferenceDefault || 'EGGLESS'})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Delivery information */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('delivery')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span className="font-serif font-bold text-sm text-[#2C1A1D]">Delivery information</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.delivery ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {openAccordions.delivery && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div>
                      <strong className="text-brand-espresso font-semibold block text-[11px] uppercase tracking-wider">
                        Delivery Coverage:
                      </strong>
                      <p className="mt-0.5 text-xs text-brand-espresso/85">
                        Direct doorstep delivery from <strong>{shop.businessName}</strong> across {shop.city || 'the local area'}.
                      </p>
                    </div>

                    {shop.deliveryConfig && (
                      <div className="p-3 bg-white rounded-xl border border-brand-border/40 text-[11px] text-brand-espresso">
                        <strong className="font-bold text-brand-espresso block text-[11px]">Delivery Fee:</strong>
                        <p className="mt-0.5 text-brand-muted">
                          {shop.deliveryConfig.deliveryChargeType === 'FREE'
                            ? 'Complimentary Free Delivery on all orders.'
                            : `Fixed ₹${shop.deliveryConfig.fixedChargeAmount} delivery fee${
                                shop.deliveryConfig.minOrderForFreeDelivery
                                  ? ` (Free delivery for orders above ₹${shop.deliveryConfig.minOrderForFreeDelivery})`
                                  : ''
                              }.`}
                        </p>
                      </div>
                    )}

                    <div>
                      <strong className="text-brand-espresso font-semibold block text-[11px] uppercase tracking-wider">
                        Packaging &amp; Handling:
                      </strong>
                      {shop.deliveryConfig?.deliveryNotes?.trim() ? (
                        <p className="mt-0.5 text-xs text-brand-espresso/85 whitespace-pre-line">
                          {shop.deliveryConfig.deliveryNotes.trim()}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-brand-muted italic">
                          Special packaging notes not specified by the bakery.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Customer Reviews */}
              <div id="product-reviews-section">
                <button
                  type="button"
                  onClick={() => toggleAccordion('reviews')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-amber-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-sm text-[#2C1A1D]">
                        Customer Reviews ({totalReviews})
                      </span>
                      {totalReviews > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-espresso bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{averageRating.toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {myProductReview ? (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditReview(myProductReview);
                        }}
                        className="text-[11px] font-bold text-brand-plum bg-brand-blush hover:bg-brand-blush/80 px-2.5 py-1 rounded-lg border border-brand-plum/20 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit My Review</span>
                      </span>
                    ) : (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingReview(null);
                          setIsReviewModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-brand-plum hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Post Review</span>
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                        openAccordions.reviews ? 'rotate-180 text-amber-500' : ''
                      }`}
                    />
                  </div>
                </button>
                {openAccordions.reviews && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-brand-border/40 gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex items-baseline gap-1">
                          <span className="font-serif font-black text-xl text-brand-espresso">
                            {totalReviews > 0 && averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                          </span>
                          {totalReviews > 0 && averageRating > 0 && (
                            <span className="text-[10px] font-bold text-brand-muted">/ 5.0</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          {renderRatingStars(totalReviews > 0 ? averageRating : 0, 'w-3.5 h-3.5')}
                          <span className="text-[11px] text-brand-muted mt-0.5">
                            {totalReviews > 0
                              ? `Based on ${totalReviews} verified celebration ${totalReviews === 1 ? 'review' : 'reviews'}`
                              : 'No reviews yet for this cake'}
                          </span>
                        </div>
                      </div>
                      {myProductReview ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditReview(myProductReview)}
                          className="text-xs font-bold text-brand-plum hover:bg-brand-blush/80 cursor-pointer inline-flex items-center gap-1.5 bg-brand-blush px-3 py-1.5 rounded-xl border border-brand-plum/20 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit My Review</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingReview(null);
                            setIsReviewModalOpen(true);
                          }}
                          className="text-xs font-bold text-brand-plum hover:underline cursor-pointer"
                        >
                          Post Review
                        </button>
                      )}
                    </div>
                    {reviewsSummary && reviewsSummary.reviews && reviewsSummary.reviews.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {reviewsSummary.reviews.slice(0, 10).map((r) => {
                          const isMine = reviewStorage.isCustomerReview(r.id, r.customerDisplayName, r.source);
                          return (
                            <div
                              key={`${r.source || 'rev'}-${r.id}`}
                              className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                                isMine
                                  ? 'bg-[#FAF7F2] border-brand-plum/40 shadow-xs ring-1 ring-brand-plum/20'
                                  : 'bg-white border-brand-border/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-brand-espresso">{r.customerDisplayName}</span>
                                  {isMine && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-plum bg-brand-blush px-2 py-0.5 rounded-full border border-brand-plum/30">
                                      Your Review
                                    </span>
                                  )}
                                  {r.isVerifiedPurchase && (
                                    <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                                      Verified
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.createdAt && (
                                    <span
                                      className="text-[11px] text-brand-muted flex items-center gap-1 font-medium"
                                      title={new Date(r.createdAt).toLocaleString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      })}
                                    >
                                      <Clock className="w-3 h-3 text-brand-plum" />
                                      <span>
                                        {new Date(r.createdAt).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true,
                                        })}
                                      </span>
                                    </span>
                                  )}
                                  <span className="text-amber-500 font-bold text-xs">{r.rating}★</span>
                                </div>
                              </div>

                              {r.reviewText && (
                                <p className="text-[11px] text-brand-muted italic leading-relaxed">&ldquo;{r.reviewText}&rdquo;</p>
                              )}

                              {/* Customer Attached Photo or Video */}
                              {r.cakeImageUrl && (
                                <div className="mt-2 w-24 h-24 rounded-xl overflow-hidden border border-brand-border/60 bg-black/5">
                                  <img
                                    src={r.cakeImageUrl}
                                    alt="Customer celebration cake photo"
                                    className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => window.open(r.cakeImageUrl, '_blank')}
                                  />
                                </div>
                              )}

                              {r.cakeVideoUrl && (
                                <div className="mt-2 max-w-xs rounded-xl overflow-hidden border border-brand-border/60 bg-black">
                                  <video
                                    src={r.cakeVideoUrl}
                                    controls
                                    playsInline
                                    className="w-full max-h-48 object-cover rounded-xl"
                                  />
                                </div>
                              )}

                              {/* Baker Response */}
                              {r.ownerReply && (
                                <div className="mt-2 p-2.5 rounded-xl bg-brand-blush/40 border border-brand-blush-border text-[11px] space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-brand-plum">Baker Response:</span>
                                    {r.ownerRepliedAt && (
                                      <span className="text-[10px] text-brand-muted">
                                        {new Date(r.ownerRepliedAt).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true,
                                        })}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-brand-espresso block">{r.ownerReply}</span>
                                </div>
                              )}

                              {/* Edit / Delete actions for customer review */}
                              {isMine && (
                                <div className="pt-2 border-t border-brand-border/40 flex items-center justify-between text-xs">
                                  <span className="text-[11px] text-brand-muted">You posted this review</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditReview(r)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-brand-plum bg-brand-blush hover:bg-brand-blush/80 transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReview(r)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-brand-muted italic">Be the first to review this artisanal creation!</p>
                    )}
                  </div>
                )}
              </div>

              {/* 5. More from this bakery */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('more')}
                  className="w-full px-5 py-4 text-left flex items-center justify-between hover:bg-[#FAF7F2]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <span className="font-serif font-bold text-sm text-[#2C1A1D]">More from this bakery</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-brand-muted transition-transform duration-200 ${
                      openAccordions.more ? 'rotate-180 text-brand-plum' : ''
                    }`}
                  />
                </button>
                {openAccordions.more && (
                  <div className="px-5 pb-5 pt-1 text-xs text-brand-espresso/85 leading-relaxed space-y-3 border-t border-brand-border/30 bg-[#FAF7F2]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong className="block font-serif font-bold text-xs text-brand-espresso">
                          {shop.businessName}
                        </strong>
                        <span className="text-[10px] text-brand-muted">{shop.address || 'Verified Artisan Bakery'}</span>
                      </div>
                      <Link
                        href={`/shop/${shop.id}`}
                        className="px-3 py-1.5 rounded-xl bg-[#5C1D2E] text-white font-bold text-[11px] hover:bg-[#4a1525] transition-colors"
                      >
                        View Storefront
                      </Link>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* FSSAI Certified Kitchens Trust Badge */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-brand-border/60 text-xs text-brand-espresso shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-brand-blush/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-brand-plum" />
              </div>
              <div>
                <p className="font-bold text-[11px] text-[#2C1A1D]">FSSAI Certified Kitchens</p>
                <p className="text-[10px] text-brand-muted">Food safety &amp; hygiene compliance verified</p>
              </div>
            </div>
          </div>

        </div>

        {/* ============================================================ */}
        {/* RECOMMENDED SHELF: More Handcrafted Cakes from this Bakery    */}
        {/* ============================================================ */}
        {otherProducts.length > 0 && (
          <div className="pt-12 border-t border-brand-border/60 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#2C1A1D]">
                  More from {shop.businessName}
                </h2>
                <p className="text-xs text-brand-muted mt-0.5">Explore more artisanal creations from this bakery</p>
              </div>
              <Link
                href={`/shop/${shop.id}?tab=shop`}
                className="text-xs font-bold text-[#5C1D2E] hover:underline flex items-center gap-1"
              >
                <span>View Full Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {otherProducts.map((op) => (
                <Link
                  key={op.id}
                  href={`/shop/${shop.id}/product/${op.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-brand-border/70 hover:shadow-soft transition-all p-3 space-y-3"
                >
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#FAF7F2]">
                    <img
                      src={op.imageUrl || FALLBACK_CAKE}
                      alt={op.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#2C1A1D] line-clamp-1 group-hover:text-[#5C1D2E] transition-colors">
                      {op.name}
                    </h3>
                    <p className="text-xs font-bold text-brand-plum mt-1">₹{op.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Review / Feedback Modal */}
      <CakeReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setEditingReview(null);
        }}
        shopId={shop.id}
        productId={product.id}
        productName={product.name}
        shopName={shop.businessName}
        initialReview={editingReview}
        onDelete={() => {
          loadReviews();
        }}
        onReviewSubmitted={handleReviewSubmitted}
      />

      <CartDrawer />
      <SavedCakesDrawer />
      <Footer />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
          <LoadingState message="Loading cake page..." />
        </div>
      }
    >
      <ProductDetailContent />
    </Suspense>
  );
}
