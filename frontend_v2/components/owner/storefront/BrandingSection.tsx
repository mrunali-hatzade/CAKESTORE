import React, { useState, useRef } from 'react';
import {
  Upload, Trash2, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { mediaApi } from '@/lib/api/media';

interface BrandingSectionProps {
  logoUrl: string;
  onLogoChange: (url: string) => void;
  coverImageUrl?: string;
  onCoverImageChange?: (url: string) => void;
  businessName: string;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({
  logoUrl,
  onLogoChange,
  coverImageUrl = '',
  onCoverImageChange,
  businessName,
}) => {
  // Logo upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Cover image upload state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setLogoUploadError('Logo image must be under 3MB');
      return;
    }
    setIsUploadingLogo(true);
    setLogoUploadError(null);
    try {
      const result = await mediaApi.uploadImage(file, 'logos');
      onLogoChange(result.url);
    } catch (err: any) {
      setLogoUploadError(err?.message || 'Failed to upload logo image');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setCoverUploadError('Cover image must be under 5MB');
      return;
    }
    setIsUploadingCover(true);
    setCoverUploadError(null);
    try {
      const result = await mediaApi.uploadImage(file, 'covers');
      if (onCoverImageChange) {
        onCoverImageChange(result.url);
      }
    } catch (err: any) {
      setCoverUploadError(err?.message || 'Failed to upload cover image');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    onLogoChange('');
    setConfirmRemoveLogo(false);
  };

  const handleRemoveCover = () => {
    if (onCoverImageChange) {
      onCoverImageChange('');
    }
    setConfirmRemoveCover(false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="font-serif font-bold text-base text-owner-heading">Bakery Branding & Visual Identity</h2>
        <p className="text-[11px] text-owner-muted">
          Upload your official bakery logo and storefront cover banner. These appear on your marketplace bakery card, storefront header, and order invoices.
        </p>
      </div>

      {/* 1. Bakery Logo */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-owner-muted">Bakery Logo / Brand Mark</h3>

        {logoUploadError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{logoUploadError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-brand-border bg-white shadow-soft flex items-center justify-center shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Bakery Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2 text-owner-muted">
                <ImageIcon className="w-8 h-8 mx-auto mb-1 text-brand-plum/40" />
                <span className="text-[10px] font-semibold block leading-tight text-brand-muted">No logo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div>
              <h4 className="text-sm font-bold text-owner-heading">
                {businessName || 'Your Bakery'}
              </h4>
              <p className="text-xs text-owner-muted mt-0.5">
                Square PNG, JPG, or WebP (min 200x200px recommended). Max 3MB.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logoInputRef.current?.click()}
                isLoading={isUploadingLogo}
                className="gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
              </Button>

              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Storefront Cover Banner */}
      {onCoverImageChange && (
        <div className="space-y-3 pt-2 border-t border-brand-border/40">
          <h3 className="text-xs font-bold uppercase tracking-wider text-owner-muted">Storefront Cover Banner</h3>

          {coverUploadError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{coverUploadError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60">
            <div className="relative w-full sm:w-52 h-28 rounded-2xl overflow-hidden border-2 border-brand-border bg-white shadow-soft flex items-center justify-center shrink-0">
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImageUrl} alt="Storefront Cover Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2 text-owner-muted">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 text-brand-plum/40" />
                  <span className="text-[10px] font-semibold block leading-tight text-brand-muted">No cover banner</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div>
                <h4 className="text-sm font-bold text-owner-heading">
                  Primary Storefront Header & Marketplace Banner
                </h4>
                <p className="text-xs text-owner-muted mt-0.5">
                  Landscape image (recommended 1200x400px or 16:9). Displayed on your bakery card across the local marketplace and storefront header. Max 5MB.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  isLoading={isUploadingCover}
                  className="gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{coverImageUrl ? 'Replace Cover Banner' : 'Upload Cover Banner'}</span>
                </Button>

                {coverImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRemoveCover(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmRemoveLogo}
        onClose={() => setConfirmRemoveLogo(false)}
        onConfirm={async () => handleRemoveLogo()}
        title="Remove Logo"
        description="Are you sure you want to remove the bakery logo?"
        confirmLabel="Remove"
        isDestructive={true}
      />

      <ConfirmDialog
        isOpen={confirmRemoveCover}
        onClose={() => setConfirmRemoveCover(false)}
        onConfirm={async () => handleRemoveCover()}
        title="Remove Cover Banner"
        description="Are you sure you want to remove the storefront cover banner?"
        confirmLabel="Remove"
        isDestructive={true}
      />
    </Card>
  );
};
