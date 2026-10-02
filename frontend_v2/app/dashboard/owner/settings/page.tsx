'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Store,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CreditCard,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { ShopSettings, ShopPayoutDetails } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { LoadingState } from '@/components/ui/LoadingState';
import DeleteAccountModal from '@/components/owner/DeleteAccountModal';

// Modular Tabs
import ProfileTab from '@/components/owner/settings/ProfileTab';
import PayoutTab from '@/components/owner/settings/PayoutTab';
import SecurityTab from '@/components/owner/settings/SecurityTab';

export default function OwnerSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { updateShop, registerRefreshHandler, shop } = useOwner();

  // Handle system administrators visiting owner settings without an assigned bakery
  const isAdminWithoutShop = !authLoading && Boolean(
    (user?.role === 'ROLE_ADMIN' || (user?.role as string) === 'ADMIN') && !user?.shopId && !shop
  );

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PAYOUT' | 'SECURITY'>('PROFILE');
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<ShopSettings | null>(null);
  const [payout, setPayout] = useState<ShopPayoutDetails | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<{
    verificationStatus: string;
    rejectionReason?: string | null;
    documents?: any[];
  } | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (authLoading) return;

    if (isAdminWithoutShop) {
      setLoading(false);
      return;
    }

    if (!isManual) setLoading(true);
    setErrorMsg(null);

    try {
      const [shopData, payoutData, verifData] = await Promise.all([
        ownerApi.getShopSettings(),
        ownerApi.getPayoutDetails(),
        ownerApi.getVerificationStatus(),
      ]);

      if (verifData) setVerificationInfo(verifData);
      if (shopData) {
        setProfile(shopData);
        updateShop(shopData);
      }
      if (payoutData) setPayout(payoutData);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load bakery settings');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAdminWithoutShop, updateShop]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [fetchData, authLoading]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchData(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchData]);

  if (loading || authLoading) {
    return <LoadingState message="Loading bakery settings & payout details..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bakery Configuration & Financials</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Settings & Payouts
          </h1>
          <p className="text-xs text-owner-muted">
            Configure your commercial bakery details, operational timings, and bank payout coordinates
          </p>
        </div>
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
                  You are logged in with administrator credentials (<code>{user?.email}</code>). Since this account does not have an active bakery storefront assigned, live configuration and payout details cannot be modified here.
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

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* KYC Compliance Status Alerts */}
      {!isAdminWithoutShop && (
        <>
          {(verificationInfo?.verificationStatus === 'REJECTED' ||
            verificationInfo?.verificationStatus === 'ACTION_REQUIRED' ||
            profile?.verificationStatus === 'REJECTED' ||
            profile?.verificationStatus === 'ACTION_REQUIRED') && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-soft">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-amber-950 font-serif">
                      Business Verification Action Required
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                      Action Required
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    {verificationInfo?.rejectionReason
                      ? `Admin Note: "${verificationInfo.rejectionReason}". Please update your bakery registration details or contact platform support.`
                      : 'Your verification submission was reviewed and requires updates. Please check your FSSAI registration details and re-submit.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(verificationInfo?.verificationStatus === 'VERIFIED' || profile?.verificationStatus === 'VERIFIED') && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-soft">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold">Your bakery has been officially verified by CakeStore Platform Admin.</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Verified Partner
              </span>
            </div>
          )}
        </>
      )}

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-2xl bg-white border border-owner-border shadow-soft">
        <button
          type="button"
          onClick={() => setActiveTab('PROFILE')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'PROFILE'
              ? 'bg-brand-plum text-white shadow-soft'
              : 'text-owner-muted hover:text-owner-heading'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Bakery Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAYOUT')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'PAYOUT'
              ? 'bg-brand-plum text-white shadow-soft'
              : 'text-owner-muted hover:text-owner-heading'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payout Details (Bank & UPI)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'SECURITY'
              ? 'bg-brand-plum text-white shadow-soft'
              : 'text-owner-muted hover:text-owner-heading'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="mt-6">
        {activeTab === 'PROFILE' && (
          <ProfileTab
            initialProfile={profile}
            verificationInfo={verificationInfo}
            isAdminWithoutShop={isAdminWithoutShop}
            onUpdate={() => fetchData(true)}
            updateShopContext={updateShop}
          />
        )}

        {activeTab === 'PAYOUT' && (
          <PayoutTab
            initialPayout={payout}
            isAdminWithoutShop={isAdminWithoutShop}
            onUpdate={() => fetchData(true)}
          />
        )}

        {activeTab === 'SECURITY' && <SecurityTab />}
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-owner-border/80">
        <div className="rounded-3xl border border-red-200 bg-red-50/40 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 border border-red-200 text-[11px] font-bold text-red-700 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span>Danger Zone</span>
              </div>
              <h2 className="font-serif font-bold text-lg text-red-950">Delete CakeStore Account</h2>
              <p className="text-xs text-red-800/80 max-w-xl leading-relaxed">
                Permanently delete your bakery storefront, products, custom requests, and all operational data. This action cannot be undone and will immediately take your store offline.
              </p>
            </div>
            {!isAdminWithoutShop && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="shrink-0 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Permanently Delete Account
              </button>
            )}
          </div>
        </div>
      </div>

      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}
