import React, { useState, useRef } from 'react';
import {
  Upload, Trash2, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mediaApi } from '@/lib/api/media';

interface BrandingSectionProps {
  logoUrl: string;
  onLogoChange: (url: string) => void;
  businessName: string;
}

export const BrandingSection: React.FC<BrandingSectionProps> = ({
  logoUrl,
  onLogoChange,
  businessName,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Logo image must be under 3MB');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await mediaApi.uploadImage(file, 'logos');
      onLogoChange(result.url);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload logo image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove the bakery logo?')) {
      onLogoChange('');
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="font-serif font-bold text-base text-owner-heading">Bakery Branding & Logo</h2>
        <p className="text-[11px] text-owner-muted">
          Upload your official bakery logo or mark. Displayed on your storefront header, product cards, and invoices.
        </p>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
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
              <span className="text-[10px] font-semibold block leading-tight text-brand-muted">No logo uploaded</span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <div>
            <h3 className="text-sm font-bold text-owner-heading">
              {businessName || 'Your Bakery'}
            </h3>
            <p className="text-xs text-owner-muted mt-0.5">
              Square PNG, JPG, or WebP (min 200x200px recommended). Max 3MB.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
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
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
