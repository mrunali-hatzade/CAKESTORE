import React from 'react';
import { Phone, MessageCircle, Mail, MapPin, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface ContactInfoSectionProps {
  whatsappNumber: string;
  onWhatsappNumberChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  email: string;
  onEmailChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  mapLocationUrl: string;
  onMapLocationUrlChange: (v: string) => void;
}

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({
  whatsappNumber,
  onWhatsappNumberChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  address,
  onAddressChange,
  mapLocationUrl,
  onMapLocationUrlChange,
}) => {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h2 className="font-serif font-bold text-base text-owner-heading">Contact & Location Details</h2>
        <p className="text-[11px] text-owner-muted">
          Your direct communication channels for customer cake queries, pickup directions, and order updates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-espresso flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp Number</span>
          </label>
          <Input
            placeholder="+91 98765 43210"
            value={whatsappNumber}
            onChange={(e) => onWhatsappNumberChange(e.target.value)}
            helperText="Direct WhatsApp chat link will appear on storefront."
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-espresso flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-brand-plum" />
            <span>Calling Phone Number</span>
          </label>
          <Input
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-espresso flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-brand-plum" />
            <span>Customer Support Email</span>
          </label>
          <Input
            type="email"
            placeholder="orders@bakery.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-brand-espresso flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Google Maps / Directions Link</span>
          </label>
          <Input
            placeholder="https://maps.google.com/?q=..."
            value={mapLocationUrl}
            onChange={(e) => onMapLocationUrlChange(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-brand-espresso flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-plum" />
            <span>Bakery Kitchen / Pickup Address</span>
          </label>
          <Input
            placeholder="e.g. Shop 4, Ground Floor, Sector 27, Pradhikaran, Akurdi, Pune - 411044"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </div>
      </div>
    </Card>
  );
};
