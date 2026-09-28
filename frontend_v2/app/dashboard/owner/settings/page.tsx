'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Settings,
  Save,
  Store,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Image as ImageIcon,
  Leaf,
  ExternalLink,
  Upload,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  FileText,
  FileCheck,
  Eye,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { mediaApi } from '@/lib/api/media';
import { ShopSettings, ShopPayoutDetails } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState } from '@/components/ui/LoadingState';
import OwnerFeedbackModal from '@/components/owner/OwnerFeedbackModal';
import DeleteAccountModal from '@/components/owner/DeleteAccountModal';
import CascadingLocationSelector from '@/components/owner/CascadingLocationSelector';
import { MessageSquare, Star, AlertTriangle, Trash2 } from 'lucide-react';

export default function OwnerSettingsPage() {
  const { updateShop, registerRefreshHandler } = useOwner();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PAYOUT'>('PROFILE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile fields
  const [profile, setProfile] = useState<ShopSettings | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<{
    verificationStatus: string;
    rejectionReason?: string | null;
    documents?: any[];
  } | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [pincode, setPincode] = useState('');
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [fssaiRegistration, setFssaiRegistration] = useState('');

  // FSSAI Document Certificate state
  const [fssaiFile, setFssaiFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadSuccess, setDocUploadSuccess] = useState<string | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payout fields
  const [payout, setPayout] = useState<ShopPayoutDetails | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const [shopData, payoutData, verifData] = await Promise.all([
        ownerApi.getShopSettings(),
        ownerApi.getPayoutDetails(),
        ownerApi.getVerificationStatus(),
      ]);

      if (verifData) {
        setVerificationInfo(verifData);
      }

      if (shopData) {
        setProfile(shopData);
        updateShop(shopData);
        setBusinessName(shopData.businessName || '');
        setDescription(shopData.description || '');
        setPhone(shopData.phone || '');
        setEmail(shopData.email || '');
        setAddressLine1(shopData.addressLine1 || shopData.address || '');
        setAddressLine2(shopData.addressLine2 || '');
        setState(shopData.state || '');
        setDistrict(shopData.district || '');
        setCity(shopData.city || '');
        setArea(shopData.area || '');
        setPincode(shopData.pincode || '');
        setFssaiRegistration(shopData.fssaiRegistration || '');
      }

      if (payoutData) {
        setPayout(payoutData);
        setBeneficiaryName(payoutData.beneficiaryName || '');
        setBankAccountNumber(payoutData.bankAccountNumber || '');
        setIfscCode(payoutData.ifscCode || '');
        setUpiId(payoutData.upiId || '');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load bakery settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [updateShop]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchData(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchData]);

  const handleUploadFssaiDoc = async () => {
    if (!fssaiFile) return;
    setIsUploadingDoc(true);
    setDocUploadError(null);
    setDocUploadSuccess(null);

    try {
      const { url } = await mediaApi.uploadImage(fssaiFile, 'documents');
      await ownerApi.uploadVerificationDocument({
        documentType: 'FSSAI_CERTIFICATE',
        fileUrl: url,
      });

      setDocUploadSuccess('FSSAI Certificate uploaded and submitted for review!');
      setFssaiFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await fetchData(true);
    } catch (err: any) {
      setDocUploadError(err?.message || 'Failed to upload FSSAI document. Ensure file is under 5MB (PDF/JPG/PNG).');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await ownerApi.updateShopSettings({
        businessName,
        description,
        phone,
        email,
        addressLine1,
        addressLine2,
        city,
        state,
        district: district || undefined,
        area: area || undefined,
        pincode,
        fssaiRegistration,
      });

      if (fssaiFile) {
        try {
          const { url } = await mediaApi.uploadImage(fssaiFile, 'documents');
          await ownerApi.uploadVerificationDocument({
            documentType: 'FSSAI_CERTIFICATE',
            fileUrl: url,
          });
          setFssaiFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          await fetchData(true);
        } catch (docErr: any) {
          console.warn('FSSAI document upload warning:', docErr);
        }
      }

      setProfile(updated);
      updateShop(updated);
      setSuccessMsg('Bakery profile settings saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      const respData = err?.response?.data || {};
      const fieldErrors = respData?.fieldErrors || {};
      if (Object.keys(fieldErrors).length > 0) {
        setLocationErrors(fieldErrors);
      }
      setErrorMsg(err?.message || respData?.error || 'Failed to save bakery profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await ownerApi.updatePayoutDetails({
        beneficiaryName,
        bankAccountNumber,
        ifscCode,
        upiId,
      });
      setPayout(updated);
      setSuccessMsg('Bank account & UPI payout coordinates saved securely!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save payout details');
    } finally {
      setIsSaving(false);
    }
  };

  const fssaiDoc = verificationInfo?.documents?.find(
    (d: any) => d.documentType === 'FSSAI_CERTIFICATE'
  );

  if (loading) return <LoadingState message="Loading bakery settings & payout details..." />;

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

        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-owner-canvas hover:bg-brand-cream border border-owner-border text-xs font-semibold text-owner-heading transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-plum ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KYC Compliance Status Alerts */}
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
      </div>

      {/* Tab 1: Bakery Profile */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="font-serif font-bold text-base text-owner-heading">Identity & Commercials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bakery Registered Name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <Input
                label="FSSAI License / Registration #"
                placeholder="e.g. 11521000000000"
                value={fssaiRegistration}
                onChange={(e) => setFssaiRegistration(e.target.value)}
              />
            </div>

            {/* FSSAI Certificate Document Verification Block */}
            <div className="pt-3 border-t border-owner-border/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-plum" />
                  <div>
                    <h3 className="text-xs font-bold text-owner-heading">
                      FSSAI Food License / Registration Certificate
                    </h3>
                    <p className="text-[11px] text-owner-muted">
                      Official document required to activate verified status on your storefront.
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {fssaiDoc ? (
                    fssaiDoc.status === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verified by Admin
                      </span>
                    ) : fssaiDoc.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        Action Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Under Review
                      </span>
                    )
                  ) : (
                    <span className="text-[11px] font-medium text-owner-muted px-2.5 py-1 rounded-lg bg-owner-canvas border border-owner-border">
                      Certificate Not Uploaded
                    </span>
                  )}
                </div>
              </div>

              {/* Current Attached Document Card if exists */}
              {fssaiDoc && (
                <div className="p-3.5 rounded-xl bg-owner-canvas/70 border border-owner-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-owner-heading truncate">
                        Attached FSSAI Certificate
                      </p>
                      <p className="text-[11px] text-owner-muted">
                        Submitted: {new Date(fssaiDoc.createdAt || fssaiDoc.updatedAt || Date.now()).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  {fssaiDoc.fileUrl && (
                    <a
                      href={fssaiDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-owner-border text-brand-plum hover:bg-brand-cream hover:text-brand-espresso transition-colors shrink-0 shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Current Document</span>
                    </a>
                  )}
                </div>
              )}

              {/* Rejection / Note banner if rejected */}
              {(fssaiDoc?.status === 'REJECTED' || verificationInfo?.verificationStatus === 'REJECTED') && verificationInfo?.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Admin Review Feedback:</span>
                  </p>
                  <p className="text-[11px] text-rose-700 pl-5 leading-relaxed">
                    &ldquo;{verificationInfo.rejectionReason}&rdquo;
                  </p>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="relative border-2 border-dashed border-owner-border hover:border-brand-plum/50 rounded-xl p-4 transition-colors bg-white text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFssaiFile(file);
                    setDocUploadError(null);
                    setDocUploadSuccess(null);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <Upload className="w-5 h-5 text-brand-plum mb-1.5" />
                  {fssaiFile ? (
                    <p className="text-xs font-semibold text-brand-plum">
                      Selected: {fssaiFile.name} ({(fssaiFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-owner-heading">
                        {fssaiDoc ? 'Click or drag to upload a replacement certificate' : 'Upload FSSAI License or Registration Certificate'}
                      </p>
                      <p className="text-[11px] text-owner-muted mt-0.5">
                        Supports PDF, PNG, JPG up to 5MB. Fast-tracks your bakery verification badge.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Selected File Action Buttons */}
              {fssaiFile && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFssaiFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  >
                    Cancel selection
                  </button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isUploadingDoc}
                    onClick={handleUploadFssaiDoc}
                    className="gap-1.5 shadow-2xs"
                  >
                    {isUploadingDoc ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Certificate...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit Certificate for Verification</span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {docUploadSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{docUploadSuccess}</span>
                </div>
              )}

              {docUploadError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{docUploadError}</span>
                </div>
              )}
            </div>

            <Textarea
              label="Bakery Story & Customer Bio"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell cake lovers what makes your bakes unique..."
            />
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="font-serif font-bold text-base text-owner-heading">Contact & Kitchen Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Kitchen Phone / Order Hotline"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Official Notification Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Input
              label="Address Line 1"
              required
              placeholder="Shop No. 4, Ground Floor, Lane 3"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />

            <Input
              label="Address Line 2 / Landmark"
              placeholder="Near Datta Mandir, Akurdi"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />

            <CascadingLocationSelector
              values={{ state, district, city, area, pincode }}
              onChange={(updated) => {
                if ('state' in updated) setState(updated.state || '');
                if ('district' in updated) setDistrict(updated.district || '');
                if ('city' in updated) setCity(updated.city || '');
                if ('area' in updated) setArea(updated.area || '');
                if ('pincode' in updated) setPincode(updated.pincode || '');
                setLocationErrors((prev) => {
                  const next = { ...prev };
                  for (const key of Object.keys(updated)) {
                    delete next[key];
                  }
                  return next;
                });
              }}
              fieldErrors={locationErrors}
              disabled={isSaving}
            />
          </Card>

          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-serif font-bold text-base text-owner-heading">Operating Hours & Dietary Preferences</h2>
              <p className="text-xs text-owner-muted mt-0.5">
                Kitchen schedule and menu dietary configurations are managed in dedicated studio modules.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60 flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-owner-heading">7-Day Operating & Baking Schedule</h3>
                    <p className="text-[11px] text-owner-muted mt-0.5">
                      Configure open/closed status and custom business hours for each day of the week.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/owner/website"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-plum hover:text-brand-espresso transition-colors"
                >
                  <span>Manage Weekly Schedule</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex flex-col justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-emerald-950">Dietary & Eggless Preferences</h3>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Set 100% Pure Veg (eggless) or customizable egg choices individually per cake product.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/owner/products"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
                >
                  <span>Manage Product Catalog</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </Card>

          <Button type="submit" size="lg" className="w-full" isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            Save Bakery Profile Settings
          </Button>
        </form>
      )}

      {/* Tab 2: Payout Details */}
      {activeTab === 'PAYOUT' && (
        <form onSubmit={handleSavePayout} className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-base text-owner-heading">Direct Bank Settlement Details</h2>
              <p className="text-xs text-owner-muted">
                Funds from online prepaid cake orders will be disbursed directly to this registered bank account with 0% platform commission.
              </p>
            </div>

            <Input
              label="Account Beneficiary / Legal Name"
              required
              placeholder="e.g. Pune Artisan Bakes LLP or Baker Name"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Account Number"
                required
                type="password"
                placeholder="Enter bank account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
              <Input
                label="Bank IFSC Code"
                required
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-base text-owner-heading">Instant UPI VPA Handle</h2>
              <p className="text-xs text-owner-muted">
                Used for instant real-time settlement transfers and payment link reconciliation.
              </p>
            </div>

            <Input
              label="UPI ID / VPA"
              placeholder="e.g. yourbakery@okhdfcbank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </Card>

          <div className="p-4 rounded-2xl bg-brand-blush/60 border border-brand-blush-border text-xs text-brand-plum flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Bank Security Guarantee:</strong> All bank account numbers and routing codes are encrypted at rest with AES-256 standard. CakeStore never retains debit authority on your account.
            </p>
          </div>

          <Button type="submit" size="lg" className="w-full" isLoading={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            Save Payout Coordinates
          </Button>
        </form>
      )}

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
                Permanently delete your bakery owner account, storefront, products, menu variants, and configuration. This action is irreversible and cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <OwnerFeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        shopName={businessName}
      />
    </div>
  );
}
