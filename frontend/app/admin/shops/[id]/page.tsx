"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Store, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ShoppingBag, 
  Cake, 
  Clock, 
  RefreshCw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { getAdminShopDetails, updateShopStatus, AdminShopDetails } from '@/lib/api/admin';

export default function AdminShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = Number(params.id);

  const [details, setDetails] = useState<AdminShopDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status mutation state
  const [mutating, setMutating] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const fetchDetails = useCallback(async (isManual = false) => {
    if (!shopId) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getAdminShopDetails(shopId);
      setDetails(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load bakery details';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchDetails();
  }, [shopId, fetchDetails]);

  const handleUpdateStatus = async (newStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE') => {
    if (!shopId) return;
    setMutating(true);
    setStatusNotice(null);

    try {
      await updateShopStatus(shopId, newStatus);
      setStatusNotice(`Bakery status successfully updated to ${newStatus}.`);
      await fetchDetails(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update shop status';
      alert(msg);
    } finally {
      setMutating(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="text-3xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
          Active Storefront
        </span>
      );
    }
    if (s === 'PENDING' || s === 'PENDING_APPROVAL') {
      return (
        <span className="text-3xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase">
          Pending Approval
        </span>
      );
    }
    return (
      <span className="text-3xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase">
        {s}
      </span>
    );
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading merchant audit file...</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 max-w-md mx-auto my-12">
        <AlertCircle size={36} className="mx-auto text-rose-500" />
        <h3 className="text-base font-bold text-slate-900">Failed to load bakery</h3>
        <p className="text-xs text-slate-500">{error || 'Shop record not found.'}</p>
        <Link
          href="/admin/shops"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          <ArrowLeft size={14} /> Back to Directory
        </Link>
      </div>
    );
  }

  const { shop } = details;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Back Link */}
      <Link
        href="/admin/shops"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to Bakery Directory</span>
      </Link>

      {/* Notice */}
      {statusNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {/* 1. Shop Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center font-bold text-lg shrink-0">
            {shop.businessName.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{shop.businessName}</h2>
              {renderStatusBadge(shop.status)}
            </div>
            <p className="text-xs text-slate-400">
              Bakery ID #{shop.id} • Registered {formatDate(shop.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={`/shop/${shop.id}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            <ExternalLink size={13} />
            <span>Storefront</span>
          </Link>

          {shop.status !== 'ACTIVE' && (
            <button
              onClick={() => handleUpdateStatus('ACTIVE')}
              disabled={mutating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 size={14} />
              <span>Approve / Activate</span>
            </button>
          )}

          {shop.status === 'ACTIVE' && (
            <button
              onClick={() => handleUpdateStatus('SUSPENDED')}
              disabled={mutating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              <AlertTriangle size={14} />
              <span>Suspend Bakery</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Catalog Products</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{details.totalProducts}</p>
          <p className="text-3xs text-slate-400 mt-0.5">Listed cakes & bakes</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Customer Orders</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{details.totalOrders}</p>
          <p className="text-3xs text-slate-400 mt-0.5">Lifetime platform orders</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">FSSAI License</span>
          <p className="text-sm font-mono font-bold text-slate-900 mt-1 truncate">
            {shop.fssaiRegistration || 'Not Submitted'}
          </p>
          <p className="text-3xs text-slate-400 mt-0.5">Food safety regulatory ID</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Operating City</span>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">
            {shop.city || '—'}, {shop.state || '—'}
          </p>
          <p className="text-3xs text-slate-400 mt-0.5">{shop.pincode || 'Postal Code'}</p>
        </div>

      </div>

      {/* 3. Detailed Identity & Location Information */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-2xs space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Merchant Contact & Address
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Phone size={13} className="text-indigo-600" />
              <span>{shop.phone || '—'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Business Email</span>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Mail size={13} className="text-indigo-600" />
              <span>{shop.email || '—'}</span>
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Full Physical Address</span>
            <p className="text-slate-700 flex items-start gap-1.5">
              <MapPin size={13} className="text-indigo-600 shrink-0 mt-0.5" />
              <span>{shop.address || `${shop.city || ''}, ${shop.state || ''}`}</span>
            </p>
          </div>
        </div>

        {shop.description && (
          <div className="pt-3 border-t border-slate-100">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Bakery Bio / Description</span>
            <p className="text-slate-600 leading-relaxed italic">&ldquo;{shop.description}&rdquo;</p>
          </div>
        )}
      </div>

    </div>
  );
}
