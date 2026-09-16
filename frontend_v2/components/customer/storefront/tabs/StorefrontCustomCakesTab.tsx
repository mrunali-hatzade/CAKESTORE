'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Upload,
  Calendar,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Cake,
  Palette,
  Camera,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react';
import { Shop, ShopCustomFormField } from '@/types/shop';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { storefrontApi } from '@/lib/api/storefront';
import { mediaApi } from '@/lib/api/media';

interface StorefrontCustomCakesTabProps {
  shop: Shop;
  initialReferenceImage?: string;
}

export const StorefrontCustomCakesTab: React.FC<StorefrontCustomCakesTabProps> = ({
  shop,
  initialReferenceImage = '',
}) => {
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
  const [referenceImageUrl, setReferenceImageUrl] = useState(initialReferenceImage);

  // Dynamic custom form fields
  const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialReferenceImage) {
      setReferenceImageUrl(initialReferenceImage);
    }
  }, [initialReferenceImage]);

  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCustomCakesEnabled = shop.storefrontSettings ? shop.storefrontSettings.customCakesEnabled !== false : true;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    setIsUploading(true);
    try {
      const result = await mediaApi.uploadGuestReferenceImage(file);
      setReferenceImageUrl(result.url);
    } catch (err: any) {
      alert(err.message || 'Failed to upload image reference. Please ensure it is a valid JPEG, PNG, or WEBP under 5MB.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDynamicChange = (key: string, value: string) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }));
  };

  const activeCustomFields = (shop.customCakeFormFields || [])
    .filter(f => f.isEnabled !== false)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    // Sanitize phone number (strip non-digits, drop leading 0)
    let cleanPhone = customerMobile.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    try {
      // Build dynamic field values payload
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
        customerMobile: cleanPhone,
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit custom cake consultation. Please check your fields.');
    } finally {
      setIsSubmitting(false);
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
              <strong>Occasion:</strong> {occasion} • <strong>Flavour:</strong> {flavour}
            </p>
            <p>
              <strong>Event Date:</strong> {requiredDate || 'As discussed'} • <strong>Estimated Servings:</strong> {servings} guests
            </p>
            <p className="text-brand-muted pt-1 border-t border-brand-border/40">
              The pastry chef at <strong>{shop.businessName}</strong> has received your reference design and event specifications. They will review and contact you directly via WhatsApp or Phone to finalize your custom quote.
            </p>
          </div>

          <Button
            onClick={() => {
              setSuccessResult(null);
              setDesignDescription('');
              setReferenceImageUrl('');
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
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Bespoke Celebration Studio</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-brand-espresso">
          Design Your Custom Cake with <span className="text-brand-plum italic">{shop.businessName}</span>
        </h1>
        <p className="text-xs sm:text-sm text-brand-muted max-w-2xl mx-auto leading-relaxed">
          From multi-tier wedding cakes to themed birthday centerpieces, share your inspiration photos and event specifications for an artisan quote.
        </p>
      </div>

      <Card className="p-6 sm:p-10 border border-brand-border/80 shadow-soft">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Customer Info */}
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

          {/* Section 2: Cake Specifications */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-brand-espresso uppercase tracking-wider border-b border-brand-border/60 pb-2">
              2. Celebration Details &amp; Flavour
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="Occasion"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                options={[
                  { value: 'BIRTHDAY', label: '🎂 Birthday' },
                  { value: 'WEDDING', label: '💍 Wedding' },
                  { value: 'ANNIVERSARY', label: '🥂 Anniversary' },
                  { value: 'BABY_SHOWER', label: '🍼 Baby Shower' },
                  { value: 'CORPORATE', label: '🏢 Corporate Event' },
                  { value: 'OTHER', label: '✨ Other Celebration' },
                ]}
              />

              <Select
                label="Cake Style"
                value={cakeType}
                onChange={(e) => setCakeType(e.target.value)}
                options={[
                  { value: 'CUSTOM_DESIGN', label: 'Bespoke Theme Cake' },
                  { value: 'TIERED_WEDDING', label: 'Multi-Tier Luxe Cake' },
                  { value: 'PHOTO_PRINT', label: 'Edible Photo Print Cake' },
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
                  { value: 'Red Velvet Cream Cheese', label: '🍓 Red Velvet Cream Cheese' },
                  { value: 'Alfonso Mango Mascarpone', label: '🥭 Mango Mascarpone' },
                  { value: 'Lotus Biscoff Ganache', label: '🍪 Lotus Biscoff' },
                  { value: 'Nutella Hazelnut Praline', label: '🌰 Hazelnut Praline' },
                  { value: 'Vanilla Bean Berry Compote', label: '🍰 Vanilla Berry' },
                  { value: 'Custom Mix', label: '✨ Chef Consultation' },
                ]}
              />

              <Input
                label="Expected Guests / Servings"
                type="number"
                min="1"
                required
                placeholder="15"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="Event Delivery Date"
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />

              <Input
                label="Estimated Budget (₹)"
                type="number"
                placeholder="2000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />

              <Select
                label="Fulfillment Preference"
                value={deliveryPreference}
                onChange={(e) => setDeliveryPreference(e.target.value)}
                options={[
                  { value: 'DOORSTEP_DELIVERY', label: '🚚 Doorstep Delivery' },
                  { value: 'SELF_PICKUP', label: '🏪 Self Pickup from Kitchen' },
                ]}
              />
            </div>
          </div>

          {/* Section 3: Owner-configured Dynamic Custom Fields (if configured) */}
          {activeCustomFields.length > 0 && (
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-bold text-brand-espresso uppercase tracking-wider border-b border-brand-border/60 pb-2">
                3. Additional Customization Options
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          rows={3}
                          value={dynamicValues[field.fieldKey] || ''}
                          onChange={(e) => handleDynamicChange(field.fieldKey, e.target.value)}
                        />
                      </div>
                    );
                  }

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
            </div>
          )}

          {/* Section 4: Reference Image & Design Description */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-brand-espresso uppercase tracking-wider border-b border-brand-border/60 pb-2">
              {activeCustomFields.length > 0 ? '4' : '3'}. Design Instructions &amp; Photo Reference
            </h2>

            <Textarea
              label="Design Instructions &amp; Cake Message"
              rows={4}
              required
              placeholder="Describe color palette, theme elements, topper text, dietary preferences (e.g., eggless, nut-free), and special requests..."
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
            />

            {/* Reference Image Upload / URL */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-brand-espresso block">
                Reference Photo (Optional but Recommended)
              </label>
              <div className="flex gap-2 p-1 bg-brand-cream-light rounded-xl border border-brand-border/60 max-w-xs">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    imageTab === 'upload' ? 'bg-white text-brand-espresso shadow-xs' : 'text-brand-muted'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    imageTab === 'url' ? 'bg-white text-brand-espresso shadow-xs' : 'text-brand-muted'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1" /> Paste URL
                </button>
              </div>

              {imageTab === 'upload' ? (
                <div>
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
                    className="w-full border-2 border-dashed border-brand-border hover:border-brand-plum/40 rounded-2xl p-6 text-center transition-all bg-brand-cream-light/30"
                  >
                    {isUploading ? (
                      <div className="text-xs text-brand-muted">Uploading reference photo...</div>
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-brand-plum mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-brand-espresso">Click to upload inspiration photo</p>
                        <p className="text-[11px] text-brand-muted mt-0.5">JPG, PNG, WebP up to 5MB</p>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <Input
                  placeholder="https://images.unsplash.com/... or Pinterest URL"
                  value={referenceImageUrl}
                  onChange={(e) => setReferenceImageUrl(e.target.value)}
                />
              )}

              {referenceImageUrl && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-cream-light border border-brand-border/60">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-brand-border shrink-0">
                    <img
                      src={referenceImageUrl}
                      alt="Reference design"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-brand-espresso block">Reference Photo Attached</span>
                    <button
                      type="button"
                      onClick={() => setReferenceImageUrl('')}
                      className="text-rose-600 hover:underline mt-0.5 text-[11px]"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

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

            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`}?text=${getWhatsAppMessage()}`}
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
