import React from 'react';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ShopStorefrontSettings } from '@/types/storefrontManagement';

interface FulfillmentSectionProps {
  settings: ShopStorefrontSettings;
  onChange: (settings: ShopStorefrontSettings) => void;
}

export const FulfillmentSection: React.FC<FulfillmentSectionProps> = ({
  settings,
  onChange,
}) => {
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base text-owner-heading">Fulfillment & Lead Time</h2>
            <p className="text-[11px] text-owner-muted">
              Inform customers in advance of the required preparation and booking window.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-brand-espresso cursor-pointer">
          <input
            type="checkbox"
            checked={settings.fulfillmentEnabled}
            onChange={(e) =>
              onChange({
                ...settings,
                fulfillmentEnabled: e.target.checked,
              })
            }
            className="rounded text-brand-plum focus:ring-brand-plum"
          />
          <span>Show on Storefront</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <Input
          label="Lead Time (Days)"
          type="number"
          min="0"
          max="30"
          value={settings.leadTimeDays ?? 2}
          onChange={(e) =>
            onChange({
              ...settings,
              leadTimeDays: Math.max(0, parseInt(e.target.value, 10) || 0),
            })
          }
          helperText="Minimum advance days required."
        />

        <div className="sm:col-span-2">
          <Input
            label="Customer Notice Message"
            placeholder="e.g. Freshly handcrafted orders require 2 days advance notice."
            value={settings.leadTimeMessage || ''}
            onChange={(e) =>
              onChange({
                ...settings,
                leadTimeMessage: e.target.value,
              })
            }
            helperText="Banner note shown on checkout and product pages."
          />
        </div>
      </div>
    </Card>
  );
};
