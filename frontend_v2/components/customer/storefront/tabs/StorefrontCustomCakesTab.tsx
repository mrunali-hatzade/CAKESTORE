'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Shop, ShopCustomFormField } from '@/types/shop';
import {
  Sparkles,
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Cake,
  Camera,
} from 'lucide-react';
import { storefrontApi } from '@/lib/api/storefront';
import { mediaApi } from '@/lib/api/media';

interface StorefrontCustomCakesTabProps {
  shop: Shop;
  initialReferenceImage?: string;
}

// Field keys that represent contact details already captured in Section 1
const CONTACT_FIELD_KEYS = new Set([
  'customer_name',
  'customer_email',
  'customer_phone',
  'customer_mobile',
  'name',
  'email',
  'phone',
  'mobile',
]);

export const StorefrontCustomCakesTab: React.FC<StorefrontCustomCakesTabProps> = ({
  shop,
  initialReferenceImage = '',
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  // Dynamic values stored by fieldKey
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});
  const [isUploadingKey, setIsUploadingKey] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCustomCakesEnabled = shop.storefrontSettings
    ? shop.storefrontSettings.customCakesEnabled !== false
    : true;

  // Active custom fields defined by the bakery owner, sorted by displayOrder
  const allActiveFields: ShopCustomFormField[] = (shop.customCakeFormFields || [])
    .filter((f) => f.isEnabled !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Filter out contact fields to prevent any duplication with Section 1
  const cakeSpecificationFields = allActiveFields.filter(
    (f) => !CONTACT_FIELD_KEYS.has(f.fieldKey.toLowerCase().trim())
  );

  // Set initial reference image if passed
  useEffect(() => {
    if (initialReferenceImage) {
      // Find the first image or reference field if present
      const imageField = cakeSpecificationFields.find(
        (f) => f.fieldType === 'IMAGE' || f.fieldType === 'FILE' || f.fieldKey.includes('image')
      );
      if (imageField) {
        setDynamicValues((prev) => ({ ...prev, [imageField.fieldKey]: initialReferenceImage }));
      } else {
        setDynamicValues((prev) => ({ ...prev, reference_image: initialReferenceImage }));
      }
    }
  }, [initialReferenceImage]);

  const handleDynamicChange = (key: string, value: string) => {
    setDynamicValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setIsUploadingKey(key);
    try {
      const result = await mediaApi.uploadGuestReferenceImage(file);
      handleDynamicChange(key, result.url);
    } catch (err: any) {
      alert(err.message || 'Failed to upload image reference. Please ensure it is a valid JPEG, PNG, or WebP under 5MB.');
    } finally {
      setIsUploadingKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Sanitize phone number (strip non-digits, normalize Indian country code)
    let cleanPhone = customerMobile.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    try {
      // Build dynamic field values payload for the backend
      const dynamicFieldValuesList = cakeSpecificationFields
        .filter((f) => dynamicValues[f.fieldKey] !== undefined && dynamicValues[f.fieldKey] !== '')
        .map((f) => ({
          fieldKey: f.fieldKey,
          fieldLabel: f.fieldLabel,
          fieldValue: dynamicValues[f.fieldKey],
        }));

      // Extract well-known properties if the owner defined them
      const occasion = dynamicValues['occasion'] || 'CUSTOM';
      const cakeType = dynamicValues['cake_type'] || dynamicValues['cakeType'] || 'CUSTOM_DESIGN';
      const flavour = dynamicValues['flavour'] || dynamicValues['cake_flavour'] || 'Custom';
      const servings = parseInt(dynamicValues['servings'] || '1', 10) || 1;
      const budget = dynamicValues['budget'] ? parseFloat(dynamicValues['budget']) : undefined;
      const requiredDate = dynamicValues['delivery_date'] || dynamicValues['requiredDate'] || undefined;
      const deliveryPreference = dynamicValues['delivery_preference'] || dynamicValues['fulfillment'] || 'DOORSTEP_DELIVERY';
      const designDescription = dynamicValues['design_description'] || dynamicValues['additional_instructions'] || 'Bespoke custom cake inquiry';
      const referenceImageUrl = dynamicValues['reference_image'] || dynamicValues['photo'] || undefined;

      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerMobile: cleanPhone,
        occasion,
        cakeType,
        flavour,
        servings,
        budget,
        requiredDate,
        deliveryPreference,
        designDescription,
        referenceImageUrl,
        dynamicFieldValues: dynamicFieldValuesList,
      };

      const res = await storefrontApi.submitCustomCakeRequest(shop.id, payload);
      setSuccessResult(res || { id: 'REQUEST-SUBMITTED' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit custom cake consultation. Please check your fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppMessage = () => {
    const specsText = cakeSpecificationFields
      .filter((f) => dynamicValues[f.fieldKey])
      .map((f) => `• *${f.fieldLabel}:* ${dynamicValues[f.fieldKey]}`)
      .join('\n');

    return encodeURIComponent(
      `Hello ${shop.businessName}!\n\n` +
      `🎂 *CUSTOM BESPOKE CAKE CONSULTATION*\n` +
      `• *Customer:* ${customerName.trim()}\n` +
      `• *Mobile:* ${customerMobile.trim()}\n` +
      (specsText ? `\n${specsText}\n` : '') +
      `\nPlease let me know your availability and estimated quote. Thank you!`
    );
  };

  const bakeryPhone = (shop.whatsappNumber || shop.phone || shop.businessPhone || '').replace(/\D/g, '');

  if (!isCustomCakesEnabled) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-cream flex items-center justify-center text-brand-plum mx-auto border border-brand-border shadow-soft">
          <Cake className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-brand-espresso">Custom Orders Temporarily Paused</h2>
        <p className="text-xs sm:text-sm text-brand-muted max-w-md mx-auto leading-relaxed">
          {shop.businessName} is currently focusing on their fresh menu bake batches and is not accepting bespoke custom cake requests at this time. Please explore our ready-to-order cake menu.
        </p>
      </div>
    );
  }

  if (successResult) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="p-8 sm:p-12 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-serif font-bold text-brand-espresso">
              Custom Cake Consultation Submitted!
            </h2>
            <p className="text-xs sm:text-sm text-brand-muted">
              Inquiry Reference: <span className="font-bold text-brand-plum">#CC-{successResult.id || 'NEW'}</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-brand-cream-light/80 border border-brand-border/60 text-xs text-brand-espresso space-y-2 text-left">
            <p>
              <strong>Customer:</strong> {customerName} ({customerMobile})
            </p>
            <p className="text-brand-muted pt-1 border-t border-brand-border/40">
              The pastry team at <strong>{shop.businessName}</strong> has received your specifications. They will review your order requirements and contact you directly via WhatsApp or Phone to finalize your custom quote.
            </p>
          </div>

          <Button
            onClick={() => {
              setSuccessResult(null);
              setDynamicValues({});
            }}
            className="font-bold"
          >
            Submit Another Request
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blush text-brand-plum text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bespoke Celebration Studio</span>
        </div>
        <h1 className="text-3xl font-serif font-bold text-brand-espresso">Custom Cake Consultation</h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-xl mx-auto leading-relaxed">
          Order a handcrafted bespoke cake tailored to your celebration theme, flavour preferences, and dietary requirements.
        </p>
      </div>

      <Card className="p-6 sm:p-10 shadow-soft border-brand-border/70">
        <form onSubmit={handleSubmit} className="space-y-8">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Customer Contact Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-brand-espresso uppercase tracking-wider border-b border-brand-border/60 pb-2">
              1. Your Contact Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Your Name"
                required
                placeholder="Priya Sharma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="priya@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              <Input
                label="WhatsApp / Mobile Number"
                required
                placeholder="9876543210"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Owner-Configured Custom Cake Specifications */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
              <h2 className="text-sm font-bold text-brand-espresso uppercase tracking-wider">
                2. Cake Specifications & Requirements
              </h2>
              <span className="text-[11px] text-brand-muted">
                Configured by {shop.businessName}
              </span>
            </div>

            {cakeSpecificationFields.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {cakeSpecificationFields.map((field) => {
                  let parsedOptions: string[] = [];
                  if (field.optionsJson) {
                    try {
                      parsedOptions = typeof field.optionsJson === 'string'
                        ? JSON.parse(field.optionsJson)
                        : field.optionsJson;
                    } catch {
                      parsedOptions = field.optionsJson.split(',').map((s) => s.trim());
                    }
                  }

                  // DROPDOWN / SELECT
                  if (field.fieldType === 'DROPDOWN' || field.fieldType === 'SELECT') {
                    return (
                      <Select
                        key={field.fieldKey}
                        label={field.fieldLabel}
                        required={field.isRequired}
                        value={dynamicValues[field.fieldKey] || ''}
                        onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                        options={[
                          { value: '', label: `Select ${field.fieldLabel}` },
                          ...parsedOptions.map((opt) => ({ value: opt, label: opt })),
                        ]}
                      />
                    );
                  }

                  // RADIO BUTTONS
                  if (field.fieldType === 'RADIO') {
                    return (
                      <div key={field.fieldKey} className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-semibold text-brand-espresso block">
                          {field.fieldLabel} {field.isRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="flex flex-wrap gap-2.5">
                          {parsedOptions.map((opt) => {
                            const isSelected = dynamicValues[field.fieldKey] === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleDynamicChange(field.fieldKey, opt)}
                                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-plum text-white border-brand-plum shadow-sm'
                                    : 'bg-white text-brand-espresso border-brand-border hover:border-brand-plum/40 hover:bg-brand-cream-light/40'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // TEXTAREA
                  if (field.fieldType === 'TEXTAREA') {
                    return (
                      <div key={field.fieldKey} className="sm:col-span-2">
                        <Textarea
                          label={field.fieldLabel}
                          required={field.isRequired}
                          rows={3}
                          placeholder={`Enter ${field.fieldLabel.toLowerCase()}...`}
                          value={dynamicValues[field.fieldKey] || ''}
                          onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                        />
                      </div>
                    );
                  }

                  // IMAGE / FILE UPLOAD
                  if (field.fieldType === 'IMAGE' || field.fieldType === 'FILE') {
                    const isUploading = isUploadingKey === field.fieldKey;
                    const imageUrl = dynamicValues[field.fieldKey];
                    return (
                      <div key={field.fieldKey} className="sm:col-span-2 space-y-2">
                        <label className="text-xs font-semibold text-brand-espresso block">
                          {field.fieldLabel} {field.isRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <div>
                          <input
                            id={`file-input-${field.fieldKey}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(field.fieldKey, file);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`file-input-${field.fieldKey}`)?.click()}
                            className="w-full border-2 border-dashed border-brand-border hover:border-brand-plum/40 rounded-2xl p-5 text-center transition-all bg-brand-cream-light/30 cursor-pointer"
                          >
                            {isUploading ? (
                              <div className="text-xs text-brand-muted">Uploading photo...</div>
                            ) : (
                              <>
                                <Camera className="w-6 h-6 text-brand-plum mx-auto mb-1.5" />
                                <p className="text-xs font-bold text-brand-espresso">
                                  {imageUrl ? 'Click to replace photo' : `Upload ${field.fieldLabel}`}
                                </p>
                                <p className="text-[11px] text-brand-muted mt-0.5">JPG, PNG, WebP up to 5MB</p>
                              </>
                            )}
                          </button>
                        </div>

                        {imageUrl && (
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-cream-light border border-brand-border/60">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-brand-border shrink-0">
                              <img src={imageUrl} alt="Reference design" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold text-brand-espresso block">Photo Attached</span>
                              <button
                                type="button"
                                onClick={() => handleDynamicChange(field.fieldKey, '')}
                                className="text-rose-600 hover:underline mt-0.5 text-[11px]"
                              >
                                Remove Photo
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // DATE
                  if (field.fieldType === 'DATE') {
                    return (
                      <Input
                        key={field.fieldKey}
                        label={field.fieldLabel}
                        type="date"
                        required={field.isRequired}
                        value={dynamicValues[field.fieldKey] || ''}
                        onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                      />
                    );
                  }

                  // TIME
                  if (field.fieldType === 'TIME') {
                    return (
                      <Input
                        key={field.fieldKey}
                        label={field.fieldLabel}
                        type="time"
                        required={field.isRequired}
                        value={dynamicValues[field.fieldKey] || ''}
                        onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                      />
                    );
                  }

                  // NUMBER
                  if (field.fieldType === 'NUMBER') {
                    return (
                      <Input
                        key={field.fieldKey}
                        label={field.fieldLabel}
                        type="number"
                        required={field.isRequired}
                        value={dynamicValues[field.fieldKey] || ''}
                        onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                      />
                    );
                  }

                  // DEFAULT: TEXT
                  return (
                    <Input
                      key={field.fieldKey}
                      label={field.fieldLabel}
                      type="text"
                      required={field.isRequired}
                      value={dynamicValues[field.fieldKey] || ''}
                      onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                    />
                  );
                })}
              </div>
            ) : (
              // Clean fallback if bakery owner hasn't configured any custom fields yet
              <div className="space-y-4">
                <Textarea
                  label="Cake Specifications & Message"
                  rows={4}
                  required
                  placeholder="Describe your desired cake theme, occasion, preferred flavours, servings, and event date..."
                  value={dynamicValues['specifications'] || ''}
                  onChange={(e) => handleDynamicChange('specifications', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Submit & WhatsApp Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="flex-1 font-bold shadow-sm"
            >
              <Send className="w-4 h-4 mr-2" />
              <span>{isSubmitting ? 'Submitting Consultation...' : 'Submit Custom Cake Consultation'}</span>
            </Button>

            {bakeryPhone && (
              <a
                href={`https://wa.me/${bakeryPhone.startsWith('91') ? bakeryPhone : `91${bakeryPhone}`}?text=${getWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all text-center"
              >
                <MessageCircle className="w-4 h-4 mr-2 fill-current" />
                <span>Chat Quote on WhatsApp</span>
              </a>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};
