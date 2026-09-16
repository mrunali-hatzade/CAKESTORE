import React, { useState, useRef } from 'react';
import { Upload, Trash2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { mediaApi } from '@/lib/api/media';

interface AboutBakerySectionProps {
  aboutStory: string;
  onAboutStoryChange: (val: string) => void;
  aboutImageUrl: string;
  onAboutImageUrlChange: (val: string) => void;
  showAboutImage: boolean;
  onShowAboutImageChange: (val: boolean) => void;
}

export const AboutBakerySection: React.FC<AboutBakerySectionProps> = ({
  aboutStory,
  onAboutStoryChange,
  aboutImageUrl,
  onAboutImageUrlChange,
  showAboutImage,
  onShowAboutImageChange,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('About image must be under 5MB');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await mediaApi.uploadImage(file, 'covers');
      onAboutImageUrlChange(result.url);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (window.confirm('Remove about image?')) {
      onAboutImageUrlChange('');
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="font-serif font-bold text-base text-owner-heading">About Bakery & Artisan Story</h2>
        <p className="text-[11px] text-owner-muted">
          Tell customers about your baking philosophy, culinary passion, ingredients, and heritage.
        </p>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Bakery Story Textarea */}
      <Textarea
        label="Bakery Story / About Us Bio"
        rows={5}
        placeholder="Write about your journey, kitchen secrets, high quality ingredients, or how you started baking..."
        value={aboutStory}
        onChange={(e) => onAboutStoryChange(e.target.value)}
        helperText="Displayed in the dedicated 'About Us' section of your customer storefront."
      />

      {/* About Photo Card */}
      <div className="space-y-3 pt-2 border-t border-owner-border/70">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-owner-heading">Artisan Kitchen / Baker Photo</label>
          <label className="flex items-center gap-1.5 text-xs text-brand-espresso font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={showAboutImage}
              onChange={(e) => onShowAboutImageChange(e.target.checked)}
              className="rounded text-brand-plum focus:ring-brand-plum"
            />
            <span>Show this image to customers</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60">
          <div className="relative w-36 h-28 rounded-xl overflow-hidden border border-brand-border bg-white shadow-soft shrink-0 flex items-center justify-center">
            {aboutImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aboutImageUrl} alt="About Bakery" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2 text-owner-muted">
                <ImageIcon className="w-6 h-6 mx-auto mb-1 text-brand-plum/40" />
                <span className="text-[10px] block">No photo set</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <Input
              placeholder="Paste photo URL or upload file..."
              value={aboutImageUrl}
              onChange={(e) => onAboutImageUrlChange(e.target.value)}
            />
            <div className="flex items-center justify-center sm:justify-start gap-2">
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
                className="gap-1.5 text-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </Button>
              {aboutImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
