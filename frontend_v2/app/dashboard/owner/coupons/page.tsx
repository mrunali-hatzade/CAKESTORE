'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Tag,
  Plus,
  Copy,
  Check,
  Percent,
  Calendar,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  Trash2,
  CheckCircle2,
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

export default function OwnerCouponsPage() {
  const { registerRefreshHandler } = useOwner();
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [minOrderValue, setMinOrderValue] = useState<number | ''>('');
  const [maxDiscountCap, setMaxDiscountCap] = useState<number | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);

  const fetchCoupons = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await ownerApi.getOwnerCoupons();
      setCoupons(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const copyToClipboard = (couponCode: string) => {
    navigator.clipboard?.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenModal = () => {
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

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      setFormError('Valid discount value is required.');
      return;
    }
    if (discountType === 'PERCENTAGE' && Number(discountValue) > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: CreateCouponPayload = {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderValue: minOrderValue ? Number(minOrderValue) : undefined,
        maxDiscountCap: maxDiscountCap ? Number(maxDiscountCap) : undefined,
        expiryDate: expiryDate ? `${expiryDate}T23:59:59` : undefined,
        usageLimit: usageLimit ? Number(usageLimit) : undefined,
        isActive,
      };

      const newCoupon = await ownerApi.createOwnerCoupon(payload);
      setCoupons((prev) => [newCoupon, ...prev]);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await ownerApi.toggleCoupon(id);
      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (!confirm('Are you sure you want to delete this promotional coupon?')) return;
    try {
      await ownerApi.deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete coupon');
    }
  };

  const activeCouponsCount = coupons.filter((c) => c.isActive).length;
  const totalUsedCount = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

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
            Create percentage discounts or flat celebration vouchers to boost storefront conversions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchCoupons(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-owner-canvas hover:bg-brand-cream border border-owner-border text-xs font-semibold text-owner-heading transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-plum ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Button onClick={handleOpenModal} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create Coupon
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Active Promotions</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{activeCouponsCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Redemptions</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalUsedCount} times</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">All Time Coupons</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{coupons.length}</p>
          </div>
        </Card>
      </div>

      {/* Coupons Grid */}
      {coupons.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-6 h-6" />}
          title="No Coupons Created"
          description="Create your first discount coupon code (e.g. CELEBRATE10, DIWALI200) to reward your shoppers."
          action={
            <Button onClick={handleOpenModal} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Create First Coupon
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coupons.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
              <div className="space-y-4">
                {/* Coupon Code Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
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
                    <p className="text-xs font-bold text-owner-heading mt-2">
                      {c.discountType === 'PERCENTAGE'
                        ? `${c.discountValue}% OFF`
                        : `₹${c.discountValue} FLAT OFF`}
                    </p>
                  </div>

                  <Badge variant={c.isActive ? 'success' : 'default'} size="sm">
                    {c.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>

                {/* Details list */}
                <div className="space-y-1.5 text-xs text-owner-muted pt-2 border-t border-owner-border/60">
                  {c.minOrderValue ? (
                    <p>• Min. order amount: <strong className="text-owner-heading">₹{c.minOrderValue}</strong></p>
                  ) : (
                    <p>• No minimum order required</p>
                  )}

                  {c.maxDiscountCap && c.discountType === 'PERCENTAGE' && (
                    <p>• Max discount cap: <strong className="text-owner-heading">₹{c.maxDiscountCap}</strong></p>
                  )}

                  {c.usageLimit && (
                    <p>• Usage limit: <strong className="text-owner-heading">{c.usedCount || 0} / {c.usageLimit}</strong></p>
                  )}

                  {c.expiryDate ? (
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-brand-plum" />
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
                <button
                  onClick={() => handleToggleStatus(c.id)}
                  className={`text-xs font-semibold px-3 py-1 rounded-xl transition-colors cursor-pointer ${
                    c.isActive
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {c.isActive ? 'Pause Coupon' : 'Activate'}
                </button>

                <button
                  onClick={() => handleDeleteCoupon(c.id)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete Coupon"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Coupon Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Promotion Code">
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <Input
            label="Coupon Code"
            required
            placeholder="e.g. WELCOME10, SWEET200"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
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
              placeholder={discountType === 'PERCENTAGE' ? '15' : '150'}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Order Value (₹)"
              type="number"
              placeholder="500 (optional)"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value === '' ? '' : Number(e.target.value))}
            />
            {discountType === 'PERCENTAGE' ? (
              <Input
                label="Max Discount Cap (₹)"
                type="number"
                placeholder="300 (optional)"
                value={maxDiscountCap}
                onChange={(e) => setMaxDiscountCap(e.target.value === '' ? '' : Number(e.target.value))}
              />
            ) : (
              <Input
                label="Usage Limit"
                type="number"
                placeholder="100 (optional)"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}
          </div>

          <Input
            label="Expiry Date"
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />

          {formError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={submitting}>
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
