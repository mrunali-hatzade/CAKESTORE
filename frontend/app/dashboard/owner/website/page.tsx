"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Globe, 
  Image as ImageIcon, 
  ExternalLink, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  Store 
} from 'lucide-react';
import { getMyShopProfile, updateMyShopProfile, ShopProfile } from '@/lib/api/shopSettings';

export default function OwnerWebsitePage() {
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable branding
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchProfile = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const data = await getMyShopProfile();
      setProfile(data);
      setCoverImageUrl(data.coverImageUrl || '');
      setLogoUrl(data.logoUrl || '');
      setDescription(data.description || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load storefront profile';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await updateMyShopProfile({
        coverImageUrl,
        logoUrl,
        description,
      });
      setProfile(updated);
      setSuccessMsg('Storefront branding updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update storefront';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const defaultCover = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="space-y-6 max-w-4xl">

      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900 tracking-tight">
            Storefront & Branding
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">
            Customize your public bakery website banner, logo, and marketplace appearance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchProfile(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 text-gray-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#A35742]' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {profile && (
            <Link
              href={`/shop/${profile.id}`}
              target="_blank"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3D101E] hover:bg-[#5B1C2E] text-white text-xs font-bold shadow-2xs transition-colors"
            >
              <ExternalLink size={14} />
              <span>View Live Store</span>
            </Link>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200/80 py-24 flex flex-col items-center justify-center space-y-3 shadow-2xs">
          <div className="w-8 h-8 border-3 border-[#C56E56] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Loading storefront preview...</p>
        </div>
      ) : profile ? (
        <div className="space-y-6">

          {/* 2. Live Storefront Card Preview */}
          <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-2xs">
            <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
              <span className="text-3xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={13} className="text-[#A35742]" />
                <span>Live Marketplace Header Preview</span>
              </span>
              <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {profile.status}
              </span>
            </div>

            {/* Cover Banner */}
            <div className="relative h-44 sm:h-56 w-full bg-gray-100 overflow-hidden">
              <img
                src={coverImageUrl || defaultCover}
                alt="Bakery Cover"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultCover;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

              {/* Bakery Identity Overlay */}
              <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4 text-white">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center text-[#3D101E] font-bold text-xl">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{profile.businessName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 pb-1">
                  <h3 className="text-lg sm:text-2xl font-bold font-serif truncate drop-shadow-sm">
                    {profile.businessName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 truncate opacity-90">
                    {profile.city ? `${profile.city} • ` : ''}{profile.businessCategory || 'Artisan Bakery'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 text-xs text-gray-600 bg-white">
              <p className="italic">{description || 'No bakery bio configured yet.'}</p>
            </div>
          </div>

          {/* 3. Branding Form */}
          <form onSubmit={handleSaveStorefront} className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-7 shadow-2xs space-y-5 text-xs">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Customization Settings</h3>
              <p className="text-3xs text-gray-400 mt-0.5">Provide direct image URLs or hosted assets</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-3xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Hero Cover Banner Image URL
                </label>
                <div className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-gray-400 shrink-0" />
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#A35742]"
                  />
                </div>
                <p className="text-3xs text-gray-400 mt-1">Recommended dimension: 1200 x 400px (16:9 ratio)</p>
              </div>

              <div>
                <label className="text-3xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Brand Logo / Avatar URL
                </label>
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-gray-400 shrink-0" />
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#A35742]"
                  />
                </div>
                <p className="text-3xs text-gray-400 mt-1">Square logo image: 400 x 400px</p>
              </div>

              <div>
                <label className="text-3xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
                  Storefront Bio & Announcement
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Welcome message or bakery specialty spotlight..."
                  className="w-full p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-[#A35742]"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3D101E] hover:bg-[#5B1C2E] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              >
                <Save size={14} />
                <span>{saving ? 'Publishing...' : 'Publish Storefront Branding'}</span>
              </button>
            </div>
          </form>

        </div>
      ) : null}

    </div>
  );
}
