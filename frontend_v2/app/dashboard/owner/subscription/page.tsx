'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Zap,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  FileText,
  Receipt,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { paymentsService } from '@/lib/services/payments';
import { useAuth } from '@/lib/auth/AuthContext';
import { SubscriptionRecord, OwnerPaymentRecord } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';

import { plansApi, SubscriptionPlan } from '@/lib/api/plans';

export default function OwnerSubscriptionPage() {
  const { user } = useAuth();
  const { registerRefreshHandler, shop, refreshShop, refreshDashboard } = useOwner();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [payments, setPayments] = useState<OwnerPaymentRecord[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const data = await ownerApi.getPayments();
      setPayments(data || []);
    } catch (err: any) {
      console.error('Failed to load payment history', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchSubscription = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorNotice(null);

    try {
      const [data, plansData] = await Promise.all([
        ownerApi.getCurrentSubscription(),
        plansApi.getActivePlans()
      ]);
      setSubscription(data);
      setPlans(plansData);
      
      // Auto-select based on current subscription or first plan
      if (data?.plan?.id) {
        setSelectedPlanId(data.plan.id);
      } else if (plansData.length > 0) {
        setSelectedPlanId(plansData[0].planId);
      }

      await fetchPayments();
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to load subscription details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchSubscription(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchSubscription]);

  const handleRenewPayment = async (planId?: number) => {
    const targetPlanId = planId || selectedPlanId;
    if (!targetPlanId) {
      setErrorNotice('Please select a plan.');
      return;
    }
    const targetPlan = plans.find(p => p.planId === targetPlanId);
    
    setRenewing(true);
    setErrorNotice(null);
    setSuccessNotice(null);

    try {
      const orderData = await ownerApi.initiateSubscriptionPayment(targetPlanId);
      const keyId = orderData.keyId;

      const isLoaded = await paymentsService.loadRazorpayScript();
      if (!isLoaded && keyId && !keyId.includes('placeholder')) {
        setErrorNotice('Unable to load payment gateway. Please check your internet connection.');
        setRenewing(false);
        return;
      }

      if (keyId && !keyId.includes('placeholder') && typeof window !== 'undefined' && (window as any).Razorpay) {
        const rzpOptions = {
          key: keyId,
          amount: orderData.amountPaise,
          currency: orderData.currency || 'INR',
          name: 'CakeStore',
          description: `Platform License for ${shop?.businessName || 'Bakery'}`,
          order_id: orderData.razorpayOrderId, // MUST pass order_id to get a signature back!
          prefill: {
            name: shop?.businessName || '',
            email: user?.email || '',
            contact: shop?.phone || (shop as any)?.businessPhone || '',
          },
          theme: {
            color: '#5C2434',
          },
          handler: async (response: any) => {
            try {
              if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
                throw new Error('Incomplete payment details received from Razorpay.');
              }

              const result = await ownerApi.verifySubscriptionPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planId: targetPlanId,
              });
              setSuccessNotice(
                `Payment verified (${result.providerPaymentId || response.razorpay_payment_id}). Your bakery subscription is now ACTIVE!`
              );
              await Promise.allSettled([
                fetchSubscription(true),
                refreshShop ? refreshShop() : Promise.resolve(),
                refreshDashboard ? refreshDashboard() : Promise.resolve(),
              ]);
            } catch (err: any) {
              setErrorNotice(err?.message || 'Payment verification failed. Please try again.');
            } finally {
              setRenewing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setErrorNotice('Payment was cancelled or closed before completion.');
              setRenewing(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.open();
      } else {
        // Sandbox / test simulation fallback when placeholder keys are active
        const simulatedPaymentId = `pay_test_${Date.now()}`;
        const result = await ownerApi.verifySubscriptionPayment({
          razorpayOrderId: orderData.razorpayOrderId,
          razorpayPaymentId: simulatedPaymentId,
          razorpaySignature: 'simulated_test_sig',
          planId: targetPlanId,
        });
        setSuccessNotice(
          `Payment verified (${result.providerPaymentId || simulatedPaymentId}). Your bakery subscription is now ACTIVE!`
        );
        await Promise.allSettled([
          fetchSubscription(true),
          refreshShop ? refreshShop() : Promise.resolve(),
          refreshDashboard ? refreshDashboard() : Promise.resolve(),
        ]);
        setRenewing(false);
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Payment initiation failed. Please try again.');
      setRenewing(false);
    }
  };

  const handleDownloadInvoice = async (paymentId: number) => {
    setDownloadingInvoiceId(paymentId);
    try {
      await ownerApi.downloadPaymentInvoice(paymentId);
    } catch (err: any) {
      alert(err?.message || 'Failed to download invoice. Please try again.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const isPending = shop?.status === 'PENDING' || subscription?.status === 'PENDING';

  const isExpired =
    shop?.status === 'EXPIRED' ||
    subscription?.status === 'EXPIRED' ||
    subscription?.status === 'SUSPENDED' ||
    (!isPending && subscription?.expiryDate && new Date(subscription.expiryDate).getTime() < Date.now());

  const daysRemaining = subscription?.expiryDate
    ? Math.max(
        0,
        Math.ceil((new Date(subscription.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : 30;

  const filteredPlans = plans.filter(p => p.billingCycle === billingCycle);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Storefront SaaS Platform License</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Subscription & Plans
          </h1>
          <p className="text-xs text-owner-muted">
            Manage your CakeStore merchant license, renewal dates, and commercial studio features
          </p>
        </div>

        <button
          onClick={() => fetchSubscription(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-owner-canvas hover:bg-brand-cream border border-owner-border text-xs font-semibold text-owner-heading transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-plum ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Activate Your Bakery Platform License</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Complete your subscription to activate your bakery, unlock your digital storefront, and start managing orders.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleRenewPayment()}
            isLoading={renewing}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Activate Now
          </Button>
        </div>
      )}

      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Current Active Plan Status Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-plum/30 shadow-card relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant={isPending ? 'warning' : isExpired ? 'error' : 'success'} size="md">
                {isPending ? 'Payment Required' : isExpired ? 'License Expired' : 'Active Plan'}
              </Badge>
              {!isPending && (
                <span className="text-xs text-owner-muted flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-plum" />
                  <span>{daysRemaining} days remaining in billing cycle</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl font-bold font-serif text-owner-heading">
              {subscription?.plan?.name || 'Pro Baker Studio Suite'}
            </h2>
            <p className="text-xs text-owner-muted max-w-xl leading-relaxed">
              Includes full access to custom storefront, unlimited catalog, order invoicing, direct UPI customer payouts, and zero platform sales commission.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="text-right sm:pr-4 sm:border-r border-owner-border">
              <p className="text-2xl font-extrabold font-serif text-brand-espresso">
                ₹{subscription?.plan?.price || '0'}
              </p>
              <p className="text-[11px] text-owner-muted">
                per {subscription?.plan?.durationDays === 365 ? 'year' : 'month'} / 0% commission
              </p>
            </div>

            <Button
              onClick={() => handleRenewPayment()}
              isLoading={renewing}
              size="lg"
              className="gap-2 shadow-soft"
            >
              <Zap className="w-4 h-4" />
              <span>
                {isPending ? 'Activate Bakery' : isExpired ? 'Renew Subscription' : 'Extend License'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="font-serif font-bold text-lg text-owner-heading">Available Studio Plans</h2>
          <p className="text-xs text-owner-muted">Choose the scale that matches your kitchen volume</p>
        </div>

        <div className="inline-flex p-1 rounded-2xl bg-white border border-owner-border shadow-soft">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-brand-plum text-white shadow-soft'
                : 'text-owner-muted hover:text-owner-heading'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-brand-plum text-white shadow-soft'
                : 'text-owner-muted hover:text-owner-heading'
            }`}
          >
            <span>Yearly</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          const isCurrentPlan = subscription?.plan?.id === plan.planId;
          let parsedFeatures: string[] = [];
          try {
            parsedFeatures = JSON.parse(plan.features);
          } catch (e) {
            parsedFeatures = [plan.description];
          }

          return (
            <Card
              key={plan.planId}
              className={`p-6 flex flex-col justify-between transition-all ${
                isCurrentPlan
                  ? 'border-2 border-brand-plum shadow-card ring-2 ring-brand-plum/10'
                  : 'hover:border-owner-border/80'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-plum">
                    {plan.name}
                  </span>
                  {isCurrentPlan && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Current Plan
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold font-serif text-owner-heading">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-serif text-brand-espresso">
                      ₹{plan.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-owner-muted">
                      /{plan.billingCycle}
                    </span>
                  </div>
                  <p className="text-[11px] text-owner-muted mt-1">{plan.description}</p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-owner-border/60">
                  {parsedFeatures.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-owner-heading">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-owner-border/60">
                <Button
                  onClick={() => handleRenewPayment(plan.planId)}
                  isLoading={renewing}
                  className="w-full"
                  size="sm"
                  variant={isCurrentPlan ? "primary" : "outline"}
                >
                  {isCurrentPlan ? (isPending ? 'Activate Bakery' : isExpired ? 'Renew Subscription' : 'Extend License') : 'Switch Plan'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* C3 & C5: Billing & Payment History Section */}
      <div className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-owner-heading">Billing & Payment History</h2>
              <p className="text-xs text-owner-muted">
                Official platform license invoices, tax receipts, and payment transactions
              </p>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          {loadingPayments ? (
            <div className="p-8 text-center text-xs text-owner-muted">
              Loading payment history...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-owner-canvas mx-auto flex items-center justify-center text-owner-muted">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-owner-heading">No payment records yet</p>
              <p className="text-xs text-owner-muted max-w-sm mx-auto">
                Once your license is renewed or upgraded, transaction details and GST tax invoices will be available here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Invoice / ID</th>
                    <th className="py-3.5 px-4">Plan / Description</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-owner-border">
                  {payments.map((p) => {
                    const statusUpper = (p.status || '').toUpperCase();
                    const isCompleted = statusUpper === 'COMPLETED';
                    const isFailed = statusUpper === 'FAILED';
                    const isPending = !isCompleted && !isFailed;
                    const dateStr = p.paidAt || p.createdAt;
                    const formattedDate = dateStr
                      ? new Date(dateStr).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—';

                    return (
                      <tr key={p.id} className="hover:bg-owner-canvas/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-medium text-brand-espresso">
                            {p.providerPaymentId || `#PAY-${p.id}`}
                          </div>
                          {p.providerOrderId && (
                            <div className="text-[10px] text-owner-muted font-mono">{p.providerOrderId}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-owner-heading">
                            {p.subscriptionPlanName || 'Pro Baker Studio'}
                          </div>
                          <div className="text-[10px] text-owner-muted">Platform Commercial License</div>
                        </td>
                        <td className="py-3.5 px-4 text-owner-muted">
                          {formattedDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-owner-heading">
                            ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-owner-muted">{p.currency || 'INR'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isCompleted ? (
                            <Badge variant="success" size="sm">Completed</Badge>
                          ) : isFailed ? (
                            <Badge variant="error" size="sm">Failed</Badge>
                          ) : (
                            <Badge variant="warning" size="sm">Pending</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {p.invoiceAvailable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={downloadingInvoiceId === p.id}
                              onClick={() => handleDownloadInvoice(p.id)}
                              className="gap-1.5 text-brand-plum hover:bg-brand-blush/40"
                            >
                              <Download className={`w-3.5 h-3.5 ${downloadingInvoiceId === p.id ? 'animate-bounce' : ''}`} />
                              <span>{downloadingInvoiceId === p.id ? 'Downloading...' : 'PDF Invoice'}</span>
                            </Button>
                          ) : (
                            <span className="text-owner-muted text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

