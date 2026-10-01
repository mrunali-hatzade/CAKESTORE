'use client';

import React, { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Tag,
  Plus,
  Copy,
  Check,
  Percent,
  Calendar,
  Sparkles,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
  Edit2,
  Search,
  X,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { CouponRecord, CreateCouponPayload, DiscountType } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/common/Toast';

type CouponFilterStatus = 'ALL' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'EXHAUSTED';

interface CouponStatusInfo {
  status: CouponFilterStatus;
  label: string;
  badgeVariant: 'success' | 'default' | 'error' | 'warning';
  subNotice?: string;
  canToggle: boolean;
  toggleActionLabel: string;
}

function computeCouponStatus(c: CouponRecord): CouponStatusInfo {
  if (!c.isActive) {
    return {
      status: 'PAUSED',
      label: 'Paused',
      badgeVariant: 'default',
      subNotice: 'Temporarily disabled on storefront checkout',
      canToggle: true,
      toggleActionLabel: 'Activate',
    };
  }

  const isExpired = c.expiryDate && new Date(c.expiryDate).getTime() < Date.now();
  if (isExpired) {
    return {
      status: 'EXPIRED',
      label: 'Expired',
      badgeVariant: 'error',
      subNotice: 'Promotional window has elapsed',
      canToggle: false,
      toggleActionLabel: 'Expired',
    };
  }

  const isExhausted = c.usageLimit != null && c.usageLimit > 0 && (c.usedCount || 0) >= c.usageLimit;
  if (isExhausted) {
    return {
      status: 'EXHAUSTED',
      label: 'Exhausted',
      badgeVariant: 'warning',
      subNotice: `Redemption cap reached (${c.usedCount}/${c.usageLimit})`,
      canToggle: false,
      toggleActionLabel: 'Cap Reached',
    };
  }

  return {
    status: 'ACTIVE',
    label: 'Active',
    badgeVariant: 'success',
    canToggle: true,
    toggleActionLabel: 'Pause Coupon',
  };
}

function OwnerCouponsContent() {
  const { registerRefreshHandler } = useOwner();
  const toast = useToast();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || searchParams.get('code') || '';

  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<CouponFilterStatus>('ALL');

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Notification Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'warning';
    message: string;
  } | null>(null);

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmCoupon, setDeleteConfirmCoupon] = useState<CouponRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [minOrderValue, setMinOrderValue] = useState<number | ''>('');
  const [maxDiscountCap, setMaxDiscountCap] = useState<number | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedCouponsExample = async () => {
    setIsSeeding(true);
    try {
      await ownerApi.createCoupon({
        code: `WELCOME10-${Math.floor(Math.random() * 1000)}`,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 500,
        maxDiscountCap: 200,
        isActive: true
      });
      toast.success('Example coupon generated successfully!');
      await fetchCoupons(true);
    } catch (err: any) {
      toast.error('Failed to generate example: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchCoupons = useCallback(async (isManual = false) => {
    if (!isManual) setLoading(true);
    setError(null);

    try {
      const data = await ownerApi.getOwnerCoupons();
      setCoupons(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load promotional coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchCoupons(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchCoupons]);

  // Sync urlSearch if changes
  useEffect(() => {
    if (urlSearch) {
      setSearchTerm(urlSearch);
    }
  }, [urlSearch]);

  const copyToClipboard = (couponCode: string) => {
    navigator.clipboard?.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setMinOrderValue('');
    setMaxDiscountCap('');
    setExpiryDate('');
    setUsageLimit('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: CouponRecord) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMinOrderValue(c.minOrderValue != null ? c.minOrderValue : '');
    setMaxDiscountCap(c.maxDiscountCap != null ? c.maxDiscountCap : '');
    setExpiryDate(c.expiryDate ? c.expiryDate.split('T')[0] : '');
    setUsageLimit(c.usageLimit != null ? c.usageLimit : '');
    setIsActive(c.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      setFormError('Discount value must be greater than zero.');
      return;
    }
    if (discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload: CreateCouponPayload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: minOrderValue !== '' ? Number(minOrderValue) : null,
      maxDiscountCap: discountType === 'PERCENTAGE' && maxDiscountCap !== '' ? Number(maxDiscountCap) : null,
      expiryDate: expiryDate ? `${expiryDate}T23:59:59` : null,
      usageLimit: usageLimit !== '' ? Number(usageLimit) : null,
      isActive,
    };

    try {
      if (editingCoupon) {
        const updated = await ownerApi.updateOwnerCoupon(editingCoupon.id, payload);
        setCoupons((prev) => prev.map((c) => (c.id === editingCoupon.id ? updated : c)));
        setNotification({
          type: 'success',
          message: `Coupon "${updated.code}" updated successfully!`,
        });
      } else {
        const created = await ownerApi.createOwnerCoupon(payload);
        setCoupons((prev) => [created, ...prev]);
        setNotification({
          type: 'success',
          message: `Promotional coupon "${created.code}" created and ready for storefront shoppers!`,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save coupon. Please verify your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (c: CouponRecord) => {
    const statusInfo = computeCouponStatus(c);
    if (!statusInfo.canToggle) {
      handleOpenEditModal(c);
      return;
    }

    try {
      await ownerApi.toggleCoupon(c.id);
      const nextActiveState = !c.isActive;
      setCoupons((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, isActive: nextActiveState } : item))
      );
      setNotification({
        type: 'info',
        message: `Coupon "${c.code}" ${nextActiveState ? 'activated' : 'paused'} successfully.`,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to toggle coupon status');
    }
  };

  const handleDeleteCoupon = async (c: CouponRecord) => {
    const hasOrderHistory = (c.usedCount || 0) > 0;
    setIsDeleting(true);

    try {
      const res = await ownerApi.deleteCoupon(c.id);
      if (hasOrderHistory) {
        setCoupons((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, isActive: false } : item))
        );
        setNotification({
          type: 'warning',
          message:
            res?.message ||
            `Coupon "${c.code}" was safely paused to preserve customer order and accounting history.`,
        });
      } else {
        setCoupons((prev) => prev.filter((item) => item.id !== c.id));
        setNotification({
          type: 'success',
          message: res?.message || `Coupon "${c.code}" deleted permanently.`,
        });
      }
      setDeleteConfirmCoupon(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete coupon');
    } finally {
      setIsDeleting(false);
    }
  };

  // KPIs
  const activeCouponsCount = useMemo(() => {
    return coupons.filter((c) => computeCouponStatus(c).status === 'ACTIVE').length;
  }, [coupons]);

  const totalRedemptionsCount = useMemo(() => {
    return coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  }, [coupons]);

  const statusCounts = useMemo(() => {
    const counts = { ALL: coupons.length, ACTIVE: 0, PAUSED: 0, EXPIRED: 0, EXHAUSTED: 0 };
    coupons.forEach((c) => {
      const st = computeCouponStatus(c).status;
      if (st in counts) counts[st]++;
    });
    return counts;
  }, [coupons]);

  // Filtered List
  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const statusInfo = computeCouponStatus(c);
      if (statusFilter !== 'ALL' && statusInfo.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toUpperCase();
        const codeMatch = c.code.toUpperCase().includes(query);
        const typeMatch = c.discountType.toUpperCase().includes(query);
        return codeMatch || typeMatch;
      }
      return true;
    });
  }, [coupons, statusFilter, searchTerm]);

  if (loading) return <LoadingState message="Loading storefront discount coupons..." />;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Storefront Promotions & Festive Offers</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Discount Coupons
          </h1>
          <p className="text-xs text-owner-muted">
            Create percentage discounts or flat celebration vouchers to boost checkout conversions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button onClick={handleSeedCouponsExample} isLoading={isSeeding} size="sm" variant="outline" className="text-brand-plum border-brand-plum/30 hover:bg-brand-cream hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Example
          </Button>
          <Button onClick={handleOpenCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer text-current"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Active Promotions</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-bold font-serif text-owner-heading">{activeCouponsCount}</p>
              <span className="text-[11px] text-owner-muted">live on storefront</span>
            </div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Redemptions</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalRedemptionsCount} times</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">All-Time Coupons</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{coupons.length}</p>
          </div>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-owner-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'PAUSED', label: 'Paused' },
              { key: 'EXPIRED', label: 'Expired' },
              { key: 'EXHAUSTED', label: 'Exhausted' },
            ] as const
          ).map((tab) => {
            const count = statusCounts[tab.key];
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-brand-plum text-white shadow-sm'
                    : 'bg-brand-cream/60 text-owner-muted hover:text-brand-plum hover:bg-brand-cream'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-owner-muted border border-owner-border'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-owner-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search coupon code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-brand-cream/40 rounded-xl border border-owner-border text-owner-heading placeholder:text-owner-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-owner-muted hover:text-owner-heading p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Coupons Grid */}
      {coupons.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-6 h-6" />}
          title="No Coupons Created"
          description="Create your first discount coupon code (e.g. CELEBRATE10, DIWALI200) to reward your shoppers and boost sales."
          action={
            <Button onClick={handleOpenCreateModal} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Create First Coupon
            </Button>
          }
        />
      ) : filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-owner-border space-y-3">
          <Filter className="w-8 h-8 text-owner-muted mx-auto" />
          <h3 className="text-base font-bold text-owner-heading">No matching coupons found</h3>
          <p className="text-xs text-owner-muted">
            No coupons match your current filter ({statusFilter}) or search keyword &ldquo;{searchTerm}&rdquo;.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter('ALL');
                setSearchTerm('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map((c) => {
            const statusInfo = computeCouponStatus(c);

            return (
              <Card
                key={c.id}
                className="p-5 flex flex-col justify-between hover:shadow-card transition-all relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Coupon Code Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-base font-extrabold text-brand-plum tracking-wider bg-brand-blush px-3 py-1 rounded-xl border border-brand-blush-border inline-flex items-center gap-1.5">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="p-1.5 text-owner-muted hover:text-brand-plum hover:bg-brand-cream rounded-lg transition-colors cursor-pointer"
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <p className="text-sm font-bold text-owner-heading mt-2">
                        {c.discountType === 'PERCENTAGE'
                          ? `${c.discountValue}% OFF`
                          : `₹${c.discountValue} FLAT OFF`}
                      </p>
                    </div>

                    <Badge variant={statusInfo.badgeVariant} size="sm">
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Subnotice if expired or exhausted */}
                  {statusInfo.subNotice && (
                    <div
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                        statusInfo.status === 'EXPIRED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : statusInfo.status === 'EXHAUSTED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{statusInfo.subNotice}</span>
                    </div>
                  )}

                  {/* Details list */}
                  <div className="space-y-1.5 text-xs text-owner-muted pt-2 border-t border-owner-border/60">
                    {c.minOrderValue ? (
                      <p>
                        • Min. order amount:{' '}
                        <strong className="text-owner-heading">₹{c.minOrderValue}</strong>
                      </p>
                    ) : (
                      <p>• No minimum order required</p>
                    )}

                    {c.maxDiscountCap && c.discountType === 'PERCENTAGE' && (
                      <p>
                        • Max discount cap:{' '}
                        <strong className="text-owner-heading">₹{c.maxDiscountCap}</strong>
                      </p>
                    )}

                    {c.usageLimit ? (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span>Usage:</span>
                          <strong className="text-owner-heading">
                            {c.usedCount || 0} / {c.usageLimit} redeemed
                          </strong>
                        </div>
                        <div className="w-full bg-brand-cream rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (c.usedCount || 0) >= c.usageLimit ? 'bg-amber-500' : 'bg-brand-plum'
                            }`}
                            style={{
                              width: `${Math.min(100, (((c.usedCount || 0) / c.usageLimit) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p>
                        • Total redeemed:{' '}
                        <strong className="text-owner-heading">{c.usedCount || 0} times</strong> (unlimited)
                      </p>
                    )}

                    {c.expiryDate ? (
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-brand-plum shrink-0" />
                        <span>
                          Valid till{' '}
                          <strong className="text-owner-heading">
                            {new Date(c.expiryDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                      </p>
                    ) : (
                      <p>• No expiration date (always valid)</p>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-4 mt-4 border-t border-owner-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(c)}
                      className={`text-xs font-semibold px-3 py-1 rounded-xl transition-colors cursor-pointer ${
                        statusInfo.status === 'ACTIVE'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : statusInfo.status === 'PAUSED'
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-brand-plum bg-brand-blush hover:bg-brand-blush-border'
                      }`}
                      title={statusInfo.toggleActionLabel}
                    >
                      {statusInfo.status === 'EXPIRED'
                        ? 'Extend Expiry'
                        : statusInfo.status === 'EXHAUSTED'
                        ? 'Increase Limit'
                        : statusInfo.toggleActionLabel}
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 text-owner-muted hover:text-brand-plum hover:bg-brand-cream rounded-lg transition-colors cursor-pointer"
                      title="Edit Coupon Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setDeleteConfirmCoupon(c)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title={
                      (c.usedCount || 0) > 0
                        ? 'Deactivate coupon (has order history)'
                        : 'Delete coupon permanently'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Coupon Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Promotion Code'}
      >
        <form onSubmit={handleSaveCoupon} className="space-y-4">
          <Input
            label="Coupon Code"
            required
            placeholder="e.g. WELCOME10, SWEET200, DIWALI50"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            helperText="Uppercase alphanumeric characters. Customers enter this code at storefront checkout."
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Discount Type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as DiscountType)}
              options={[
                { value: 'PERCENTAGE', label: 'Percentage (%)' },
                { value: 'FLAT', label: 'Flat Amount (₹)' },
              ]}
            />
            <Input
              label={discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
              type="number"
              required
              min={1}
              max={discountType === 'PERCENTAGE' ? 100 : undefined}
              placeholder={discountType === 'PERCENTAGE' ? '15' : '150'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Order Value (₹)"
              type="number"
              min={0}
              placeholder="500 (optional)"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value === '' ? '' : Number(e.target.value))}
              helperText="Order total required to qualify"
            />
            {discountType === 'PERCENTAGE' ? (
              <Input
                label="Max Discount Cap (₹)"
                type="number"
                min={1}
                placeholder="300 (optional)"
                value={maxDiscountCap}
                onChange={(e) => setMaxDiscountCap(e.target.value === '' ? '' : Number(e.target.value))}
                helperText="Maximum discount ceiling in ₹"
              />
            ) : (
              <div className="flex items-center text-xs text-owner-muted p-2 rounded-xl bg-brand-cream/30 border border-owner-border/40 mt-6">
                Flat discount applies directly to order total.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Expiry Date"
              type="date"
              min={todayStr}
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              helperText="Leave empty for coupons that never expire"
            />
            <Input
              label="Usage Limit (Redemptions)"
              type="number"
              min={1}
              placeholder="e.g. 50 (optional)"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
              helperText="Max total times this code can be used"
            />
          </div>

          {/* Active status checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-brand-border text-brand-plum focus:ring-brand-plum/20 cursor-pointer"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-semibold text-owner-heading cursor-pointer">
              Active immediately on storefront checkout
            </label>
          </div>

          {formError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-owner-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              {editingCoupon ? 'Save Changes' : 'Create Coupon'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmCoupon !== null && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmCoupon(null)}
          title={(deleteConfirmCoupon.usedCount || 0) > 0 ? 'Deactivate Coupon?' : 'Delete Coupon?'}
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-owner-muted leading-relaxed">
              {(deleteConfirmCoupon.usedCount || 0) > 0
                ? `Coupon "${deleteConfirmCoupon.code}" has been redeemed in ${deleteConfirmCoupon.usedCount} order(s). To preserve historical invoices and accounting records, it will be immediately paused instead of deleted.`
                : `Are you sure you want to permanently delete coupon "${deleteConfirmCoupon.code}"? This action cannot be undone.`}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-owner-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmCoupon(null)}
                disabled={isDeleting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDeleteCoupon(deleteConfirmCoupon)}
                disabled={isDeleting}
                className="text-xs font-bold"
              >
                {isDeleting ? 'Processing...' : (deleteConfirmCoupon.usedCount || 0) > 0 ? 'Deactivate Coupon' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function OwnerCouponsPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading discount coupons..." />}>
      <OwnerCouponsContent />
    </Suspense>
  );
}
