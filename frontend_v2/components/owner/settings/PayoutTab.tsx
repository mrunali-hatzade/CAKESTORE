import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ownerApi } from '@/lib/api/owner';
import { ShopPayoutDetails } from '@/types/owner';
import { useUnsavedChanges } from '@/context/UnsavedChangesContext';

interface PayoutTabProps {
  initialPayout: ShopPayoutDetails | null;
  isAdminWithoutShop: boolean;
  onUpdate: () => void;
}

export default function PayoutTab({ initialPayout, isAdminWithoutShop, onUpdate }: PayoutTabProps) {
  const [beneficiaryName, setBeneficiaryName] = useState(initialPayout?.beneficiaryName || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(initialPayout?.bankAccountNumber || '');
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [ifscCode, setIfscCode] = useState(initialPayout?.ifscCode || '');
  const [upiId, setUpiId] = useState(initialPayout?.upiId || '');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { setDirty } = useUnsavedChanges();

  // Snapshot for dirty state tracking
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const currentSnapshot = JSON.stringify({
    beneficiaryName, bankAccountNumber, ifscCode, upiId
  });

  useEffect(() => {
    if (initialSnapshot === null) {
      setInitialSnapshot(currentSnapshot);
    } else {
      setDirty('settings-payout', currentSnapshot !== initialSnapshot);
    }
  }, [currentSnapshot, initialSnapshot, setDirty]);

  useEffect(() => {
    return () => setDirty('settings-payout', false);
  }, [setDirty]);

  // Sync state if initialPayout updates
  useEffect(() => {
    if (initialPayout) {
      setBeneficiaryName(initialPayout.beneficiaryName || '');
      setBankAccountNumber(initialPayout.bankAccountNumber || '');
      setIfscCode(initialPayout.ifscCode || '');
      setUpiId(initialPayout.upiId || '');
    }
  }, [initialPayout]);

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminWithoutShop) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await ownerApi.updatePayoutDetails({
        beneficiaryName,
        bankAccountNumber,
        ifscCode,
        upiId,
      });
      setInitialSnapshot(currentSnapshot);
      setDirty('settings-payout', false);
      setSuccessMsg('Bank account & UPI payout coordinates saved securely!');
      onUpdate();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save payout details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSavePayout} className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif font-bold text-base text-owner-heading">Direct Bank Settlement Details</h2>
          <p className="text-xs text-owner-muted">
            Funds from online prepaid cake orders will be disbursed directly to this registered bank account with 0% platform commission.
          </p>
        </div>

        <Input
          label="Account Beneficiary / Legal Name"
          required
          placeholder="e.g. Pune Artisan Bakes LLP or Baker Name"
          value={beneficiaryName}
          onChange={(e) => setBeneficiaryName(e.target.value)}
          disabled={isAdminWithoutShop || isSaving}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="w-full space-y-1.5">
            <label className="block text-sm font-medium text-brand-espresso">
              Bank Account Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showAccountNumber ? 'text' : 'password'}
                required
                placeholder="Enter bank account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                disabled={isAdminWithoutShop || isSaving}
                className="w-full px-3.5 py-2.5 pr-10 bg-white rounded-xl border border-brand-border text-brand-espresso placeholder:text-brand-muted/60 text-sm font-mono tracking-wider transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowAccountNumber(!showAccountNumber)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-owner-muted hover:text-owner-heading transition-colors p-1"
                title={showAccountNumber ? 'Hide account number' : 'Show account number'}
                tabIndex={-1}
              >
                {showAccountNumber ? (
                  <EyeOff className="w-4 h-4 text-brand-plum" />
                ) : (
                  <Eye className="w-4 h-4 text-owner-muted" />
                )}
              </button>
            </div>
          </div>

          <Input
            label="Bank IFSC Code"
            required
            placeholder="e.g. HDFC0001234"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            disabled={isAdminWithoutShop || isSaving}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-serif font-bold text-base text-owner-heading">Instant UPI VPA Handle</h2>
          <p className="text-xs text-owner-muted">
            Used for instant real-time settlement transfers and payment link reconciliation.
          </p>
        </div>

        <Input
          label="UPI ID / VPA"
          placeholder="e.g. yourbakery@okhdfcbank"
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          disabled={isAdminWithoutShop || isSaving}
        />
      </Card>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-brand-blush/60 border border-brand-blush-border text-xs text-brand-plum flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-brand-espresso">Direct Settlement & Zero Commission</p>
          <p className="leading-relaxed text-brand-muted text-[11px]">
            100% of cake sale revenues are credited directly to your registered bank account with 0% platform commission. Banking coordinates are encrypted in transit over TLS and stored securely. CakeStore never requests or retains debit privileges on your account.
          </p>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" isLoading={isSaving} disabled={isAdminWithoutShop}>
        <Save className="w-4 h-4 mr-2" />
        {isAdminWithoutShop ? 'Preview Mode (Read-Only for Admin)' : 'Save Payout Coordinates'}
      </Button>
    </form>
  );
}
