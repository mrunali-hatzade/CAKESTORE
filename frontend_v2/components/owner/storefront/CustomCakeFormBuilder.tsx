import React, { useState } from 'react';
import { Sliders, Plus, Trash2, GripVertical, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShopCustomFormField, ShopStorefrontSettings } from '@/types/storefrontManagement';
import { ownerStorefrontApi } from '@/lib/api/ownerStorefront';

interface CustomCakeFormBuilderProps {
  fields: ShopCustomFormField[];
  settings: ShopStorefrontSettings;
  onFieldsChange: (fields: ShopCustomFormField[]) => void;
  onSettingsChange: (settings: ShopStorefrontSettings) => void;
}

export const CustomCakeFormBuilder: React.FC<CustomCakeFormBuilderProps> = ({
  fields,
  settings,
  onFieldsChange,
  onSettingsChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New field state
  const [newLabel, setNewLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<'TEXT' | 'SELECT' | 'RADIO' | 'TEXTAREA' | 'FILE'>('TEXT');
  const [newIsRequired, setNewIsRequired] = useState(false);
  const [newOptionsText, setNewOptionsText] = useState('');

  const isFormEnabled = Boolean(settings.customCakesEnabled);

  const handleToggleMaster = () => {
    onSettingsChange({
      ...settings,
      customCakesEnabled: !settings.customCakesEnabled,
    });
  };

  const handleAddField = async () => {
    if (!newLabel.trim()) {
      setErrorMessage('Field label is required.');
      return;
    }

    const fieldKey = newFieldKey.trim() || newLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const optionsJson =
      ['SELECT', 'RADIO'].includes(newFieldType) && newOptionsText.trim()
        ? JSON.stringify(newOptionsText.split(',').map((s) => s.trim()).filter(Boolean))
        : undefined;

    try {
      setIsSaving(true);
      setErrorMessage(null);
      const created = await ownerStorefrontApi.createCustomFormField({
        fieldKey,
        fieldLabel: newLabel.trim(),
        fieldType: newFieldType,
        isRequired: newIsRequired,
        isEnabled: true,
        optionsJson,
        displayOrder: fields.length,
      });

      onFieldsChange([...fields, created]);
      setNewLabel('');
      setNewFieldKey('');
      setNewFieldType('TEXT');
      setNewIsRequired(false);
      setNewOptionsText('');
      setIsAdding(false);
    } catch (err: any) {
      console.error('Failed to create custom field', err);
      setErrorMessage(err.message || 'Failed to create field');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleField = async (field: ShopCustomFormField) => {
    if (!field.id) return;
    try {
      const updated = await ownerStorefrontApi.updateCustomFormField(field.id, {
        isEnabled: !field.isEnabled,
      });
      onFieldsChange(fields.map((f) => (f.id === field.id ? updated : f)));
    } catch (err: any) {
      console.error('Failed to toggle field', err);
      setErrorMessage(err.message || 'Failed to update field');
    }
  };

  const handleDeleteField = async (fieldId?: number) => {
    if (!fieldId) return;
    if (!confirm('Are you sure you want to delete this custom field?')) return;
    try {
      await ownerStorefrontApi.deleteCustomFormField(fieldId);
      onFieldsChange(fields.filter((f) => f.id !== fieldId));
    } catch (err: any) {
      console.error('Failed to delete field', err);
      setErrorMessage(err.message || 'Failed to delete field');
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-blush text-brand-plum flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-base text-owner-heading">Custom Cake Inquiry Builder</h2>
            <p className="text-[11px] text-owner-muted">
              Enable custom order inquiries and manage fields customers must fill out.
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isFormEnabled}
            onChange={handleToggleMaster}
            className="w-4 h-4 text-brand-plum rounded border-brand-border focus:ring-brand-plum"
          />
          <span className="text-xs font-bold text-owner-heading">
            {isFormEnabled ? 'Form Enabled' : 'Form Disabled'}
          </span>
        </label>
      </div>

      {isFormEnabled && (
        <div className="space-y-4 pt-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {errorMessage}
            </div>
          )}

          {/* Predefined Standard Fields Status */}
          <div className="p-4 rounded-2xl bg-brand-cream-light/50 border border-brand-border/60">
            <span className="text-xs font-bold text-owner-heading block mb-2">Standard In-built Fields</span>
            <div className="flex flex-wrap gap-2 text-xs">
              {['Event Date', 'Estimated Servings / Weight', 'Flavour Preference', 'Reference Cake Photo', 'Message on Cake'].map((std) => (
                <span key={std} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-brand-border/70 text-owner-heading font-medium text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {std}
                </span>
              ))}
            </div>
          </div>

          {/* Dynamic Custom Fields List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-owner-muted">
                Additional Custom Fields ({fields.length})
              </span>
              {!isAdding && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Field</span>
                </Button>
              )}
            </div>

            {isAdding && (
              <div className="p-4 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60 space-y-3">
                <h4 className="text-xs font-bold text-owner-heading">Add Dynamic Form Field</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Field Label *"
                    placeholder="e.g. Dietary Restrictions or Delivery Time"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-owner-heading block">Field Type</label>
                    <select
                      className="w-full text-xs px-3 py-2 border rounded-xl bg-white border-brand-border focus:outline-none focus:ring-1 focus:ring-brand-plum"
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as any)}
                    >
                      <option value="TEXT">Short Text</option>
                      <option value="TEXTAREA">Multi-line Text (Paragraph)</option>
                      <option value="SELECT">Dropdown Menu</option>
                      <option value="RADIO">Single Choice (Radio)</option>
                      <option value="FILE">Photo Upload</option>
                    </select>
                  </div>
                </div>

                {['SELECT', 'RADIO'].includes(newFieldType) && (
                  <Input
                    label="Options (Comma separated)"
                    placeholder="e.g. Tier 1, Tier 2, Tier 3"
                    value={newOptionsText}
                    onChange={(e) => setNewOptionsText(e.target.value)}
                    helperText="Enter choices separated by commas."
                  />
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsRequired}
                      onChange={(e) => setNewIsRequired(e.target.checked)}
                      className="w-4 h-4 text-brand-plum rounded border-brand-border focus:ring-brand-plum"
                    />
                    <span className="text-xs text-owner-heading font-medium">Required Field</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAdding(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddField}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Adding...' : 'Save Field'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {fields.length === 0 && !isAdding ? (
              <div className="py-6 text-center text-xs text-owner-muted border border-dashed rounded-2xl border-brand-border">
                No custom fields added yet. The standard fields above will be used.
              </div>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      field.isEnabled
                        ? 'bg-white border-brand-border/70'
                        : 'bg-gray-50/70 border-brand-border/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-owner-muted" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-owner-heading">
                            {field.fieldLabel}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-cream-light text-owner-muted">
                            {field.fieldType}
                          </span>
                          {field.isRequired && (
                            <span className="text-[10px] font-bold text-red-500">Required</span>
                          )}
                        </div>
                        {field.optionsJson && (
                          <p className="text-[10px] text-owner-muted truncate max-w-sm mt-0.5">
                            Options: {field.optionsJson}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleField(field)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-brand-border hover:bg-brand-cream-light/60 transition-all"
                      >
                        {field.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteField(field.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition-all"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
