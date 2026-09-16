'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Shop, ShopCustomFormField } from '@/types/shop';
import {
  Sparkles,
  MessageCircle,
  Calendar,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Upload,
  Camera,
  Link as LinkIcon,
  Cake,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { storefrontApi } from '@/lib/api/storefront';
import { mediaApi } from '@/lib/api/media';

interface CustomCakeInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
}

export const CustomCakeInquiryModal: React.FC<CustomCakeInquiryModalProps> = ({
  isOpen,
  onClose,
  shop,
}) => {
  const toast = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [occasion, setOccasion] = useState('BIRTHDAY');
  const [cakeType, setCakeType] = useState('CUSTOM_DESIGN');
  const [flavour, setFlavour] = useState('Belgian Dark Truffle');
  const [servings, setServings] = useState('15');
  const [budget, setBudget] = useState('2000');
  const [requiredDate, setRequiredDate] = useState('');
  const [deliveryPreference, setDeliveryPreference] = useState('DOORSTEP_DELIVERY');
  const [designDescription, setDesignDescription] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');

  // Dynamic custom form fields
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCustomCakesEnabled = shop.storefrontSettings ? shop.storefrontSettings.customCakesEnabled !== false : true;

  const activeCustomFields = (shop.customCakeFormFields || [])
    .filter(f => f.isEnabled !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleDynamicChange = (key: string, value: string) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const result = await mediaApi.uploadGuestReferenceImage(file);
      setReferenceImageUrl(result.url);
      toast.success('Inspiration photo uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image reference. Please ensure it is a valid JPEG, PNG, or WEBP under 5MB.');
    } finally {
      setIsUploading(false);
    }
  };

  const getWhatsAppMessage = () => {
    return encodeURIComponent(
      `Hello ${shop.businessName}!\n\n` +
      `🎂 *CUSTOM BESPOKE CAKE CONSULTATION*\n` +
      `• *Customer:* ${customerName.trim()}\n` +
      `• *Mobile:* ${customerMobile.trim()}\n` +
      `• *Occasion:* ${occasion}\n` +
      `• *Cake Style:* ${cakeType.replace(/_/g, ' ')}\n` +
      `• *Flavour:* ${flavour}\n` +
      `• *Servings / Guests:* ${servings} guests\n` +
      `• *Target Budget:* ₹${budget}\n` +
      `• *Event Date:* ${requiredDate || 'Flexible'}\n` +
      `• *Fulfillment:* ${deliveryPreference === 'DOORSTEP_DELIVERY' ? 'Doorstep Delivery' : 'Self Pickup'}\n` +
      `• *Design & Plaque Text:* ${designDescription.trim()}\n` +
      (referenceImageUrl ? `• *Reference Photo:* ${referenceImageUrl}\n` : '') +
      `\nPlease let me know your availability and estimated quote. Thank you!`
    );
  };

  const cleanPhone = (shop.whatsappNumber || shop.phone || shop.businessPhone || '').replace(/\D/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    let sanitizedMobile = customerMobile.replace(/\D/g, '');
    if (sanitizedMobile.startsWith('0')) sanitizedMobile = sanitizedMobile.substring(1);
    if (!sanitizedMobile.startsWith('91') && sanitizedMobile.length === 10) {
      sanitizedMobile = `91${sanitizedMobile}`;
    }

    try {
      const dynamicFieldValuesList = activeCustomFields
        .filter(f => dynamicValues[f.fieldKey] !== undefined && dynamicValues[f.fieldKey] !== '')
        .map(f => ({
          fieldKey: f.fieldKey,
          fieldLabel: f.fieldLabel,
          fieldValue: dynamicValues[f.fieldKey],
        }));

      const payload = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerMobile: sanitizedMobile,
        occasion,
        cakeType,
        flavour,
        servings: Number(servings) || 1,
        budget: Number(budget) || undefined,
        requiredDate: requiredDate || undefined,
        deliveryPreference,
        designDescription: designDescription.trim(),
        referenceImageUrl: referenceImageUrl || undefined,
        dynamicFieldValues: dynamicFieldValuesList,
      };

      const res = await storefrontApi.submitCustomCakeRequest(shop.id, payload);
      setSuccessResult(res || { id: 'REQUEST-SUBMITTED' });
      toast.success('Custom cake consultation submitted!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setErrorMessage(null);
    setDesignDescription('');
    setReferenceImageUrl('');
    setDynamicValues({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title=""
      maxWidth="lg"
      className="max-h-[92vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="text-center space-y-1.5 pb-4 border-b border-brand-border/60">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Artisan Consultation</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-brand-espresso">
            Bespoke Custom Cake Inquiry
          </h2>
          <p className="text-xs text-brand-muted max-w-md mx-auto">
            Design your dream celebration centerpiece with <strong>{shop.businessName}</strong>.
          </p>
        </div>

        {!isCustomCakesEnabled ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-cream flex items-center justify-center text-brand-plum mx-auto border border-brand-border">
              <Cake className="w-7 h-7" />
            </div>
            <h3 className="text-base font-serif font-bold text-brand-espresso">Custom Orders Temporarily Paused</h3>
            <p className="text-xs text-brand-muted max-w-sm mx-auto leading-relaxed">
              {shop.businessName} is currently not accepting bespoke cake consultation requests. Please check our ready-to-order cake menu.
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : successResult ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-brand-espresso">
                Inquiry Received!
              </h3>
              <p className="text-xs text-brand-muted mt-1">
                Reference: <span className="font-bold text-brand-plum">#CC-{successResult.id || 'NEW'}</span>
              </p>
            </div>
            <p className="text-xs text-brand-espresso bg-[#FAF7F2] p-4 rounded-2xl border border-brand-border/60 leading-relaxed text-left">
              The pastry team at <strong>{shop.businessName}</strong> will review your custom specifications and contact you directly via WhatsApp or phone with an estimate and availability.
            </p>
            <Button onClick={handleReset} className="w-full font-bold">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Your Name"
                required
                placeholder="Rohit Verma"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="rohit@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              <Input
                label="WhatsApp / Phone"
                required
                placeholder="9876543210"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
              />
            </div>

            {/* Cake Specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select
                label="Occasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                options={[
                  { value: 'BIRTHDAY', label: '🎂 Birthday' },
                  { value: 'WEDDING', label: '💍 Wedding' },
                  { value: 'ANNIVERSARY', label: '🥂 Anniversary' },
                  { value: 'BABY_SHOWER', label: '🍼 Baby Shower' },
                  { value: 'CORPORATE', label: '🏢 Corporate' },
                  { value: 'OTHER', label: '✨ Other' },
                ]}
              />

              <Select
                label="Cake Style"
                value={cakeType}
                onChange={(e) => setCakeType(e.target.value)}
                options={[
                  { value: 'CUSTOM_DESIGN', label: 'Bespoke Theme Cake' },
                  { value: 'TIERED_WEDDING', label: 'Multi-Tier Luxe Cake' },
                  { value: 'PHOTO_PRINT', label: 'Edible Photo Print' },
                  { value: '3D_SCULPTED', label: '3D Sculpted Fondant' },
                  { value: 'NAKED_FLORAL', label: 'Rustic Naked & Floral' },
                ]}
              />

              <Select
                label="Preferred Flavour"
                value={flavour}
                onChange={(e) => setFlavour(e.target.value)}
                options={[
                  { value: 'Belgian Dark Truffle', label: '🍫 Belgian Dark Truffle' },
                  { value: 'Red Velvet Cream Cheese', label: '🍓 Red Velvet' },
                  { value: 'Alfonso Mango Mascarpone', label: '🥭 Mango Mascarpone' },
                  { value: 'Lotus Biscoff Ganache', label: '🍪 Lotus Biscoff' },
                  { value: 'Nutella Hazelnut Praline', label: '🌰 Hazelnut Praline' },
                  { value: 'Vanilla Bean Berry Compote', label: '🍰 Vanilla Berry' },
                  { value: 'Custom Mix', label: '✨ Chef Consultation' },
                ]}
              />

              <Input
                label="Servings / Guests"
                type="number"
                min="1"
                required
                placeholder="15"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Event Date"
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />
              <Input
                label="Target Budget (₹)"
                type="number"
                placeholder="2000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <Select
                label="Fulfillment"
                value={deliveryPreference}
                onChange={(e) => setDeliveryPreference(e.target.value)}
                options={[
                  { value: 'DOORSTEP_DELIVERY', label: '🚚 Doorstep Delivery' },
                  { value: 'SELF_PICKUP', label: '🏪 Kitchen Pickup' },
                ]}
              />
            </div>

            {/* Owner Custom Form Fields (if defined) */}
            {activeCustomFields.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60 space-y-3">
                <span className="font-bold text-brand-espresso block text-xs">Bakery Options:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeCustomFields.map((field) => {
                    let parsedOptions: string[] = [];
                    if (field.optionsJson) {
                      try {
                        parsedOptions = typeof field.optionsJson === 'string'
                          ? JSON.parse(field.optionsJson)
                          : field.optionsJson;
                      } catch {
                        parsedOptions = field.optionsJson.split(',').map(s => s.trim());
                      }
                    }

                    if (field.fieldType === 'DROPDOWN') {
                      return (
                        <Select
                          key={field.fieldKey}
                          label={field.fieldLabel}
                          required={field.isRequired}
                          value={dynamicValues[field.fieldKey] || ''}
                          onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                          options={[
                            { value: '', label: `Select ${field.fieldLabel}` },
                            ...parsedOptions.map(opt => ({ value: opt, label: opt })),
                          ]}
                        />
                      );
                    }

                    if (field.fieldType === 'TEXTAREA') {
                      return (
                        <div key={field.fieldKey} className="sm:col-span-2">
                          <Textarea
                            label={field.fieldLabel}
                            required={field.isRequired}
                            rows={2}
                            value={dynamicValues[field.fieldKey] || ''}
                            onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                          />
                        </div>
                      );
                    }

                    return (
                      <Input
                        key={field.fieldKey}
                        label={field.fieldLabel}
                        type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
                        required={field.isRequired}
                        value={dynamicValues[field.fieldKey] || ''}
                        onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Design Description */}
            <Textarea
              label="Design Instructions & Plaque Text"
              rows={3}
              required
              placeholder="Describe color palette, theme elements, name/age for cake plaque, dietary notes..."
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
            />

            {/* Reference Image */}
            <div className="space-y-2">
              <label className="font-semibold text-brand-espresso block">
                Reference Photo (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl border border-brand-border hover:bg-brand-cream text-brand-espresso font-semibold inline-flex items-center gap-1.5 transition-all text-xs"
                >
                  <Camera className="w-3.5 h-3.5 text-brand-plum" />
                  <span>{isUploading ? 'Uploading...' : 'Upload Photo'}</span>
                </button>
                <Input
                  placeholder="Or paste image URL"
                  value={referenceImageUrl}
                  onChange={(e) => setReferenceImageUrl(e.target.value)}
                  className="flex-1"
                />
              </div>

              {referenceImageUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={referenceImageUrl}
                    alt="Reference"
                    className="w-12 h-12 rounded-lg object-cover border border-brand-border"
                  />
                  <button
                    type="button"
                    onClick={() => setReferenceImageUrl('')}
                    className="text-rose-600 text-[11px] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="submit"
                size="md"
                disabled={isSubmitting}
                className="flex-1 font-bold"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Inquiry'}</span>
              </Button>

              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=${getWhatsAppMessage()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs transition-all text-center"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
