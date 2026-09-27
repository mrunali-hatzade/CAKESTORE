'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Check, ShieldCheck, Sparkles, HelpCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';

interface Plan {
  id: number;
  name: string;
  description?: string;
  billingCycle: string;
  price: number;
  currency: string;
  durationDays: number;
  features?: string;
  isActive: boolean;
}

export default function PricingPage() {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/storefront/plans`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllPlans(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const {
    monthlyPlan,
    yearlyPlan,
    activePlan,
    displayPrice,
    savingsPercent,
    featureList,
    planName,
    planDescription,
  } = useMemo(() => {
    const mPlan = allPlans.find(p => p.billingCycle === 'monthly');
    const yPlan = allPlans.find(p => p.billingCycle === 'yearly');
    const actPlan = (billing === 'monthly' ? mPlan : yPlan) || mPlan;
    
    let dispPrice = 0;
    if (billing === 'monthly' && mPlan) {
      dispPrice = mPlan.price;
    } else if (billing === 'yearly' && yPlan) {
      dispPrice = Math.round(yPlan.price / 12);
    } else if (mPlan) {
      dispPrice = mPlan.price;
    }

    let savePct = 0;
    if (mPlan && yPlan) {
      const denom = mPlan.price * 12;
      if (denom > 0) {
        savePct = Math.round(((denom - yPlan.price) / denom) * 100);
      }
    }

    let fList: string[] = [];
    if (actPlan?.features) {
      try {
        const parsed = JSON.parse(actPlan.features);
        if (Array.isArray(parsed)) {
          fList = parsed;
        } else {
          fList = [actPlan.features];
        }
      } catch (e) {
        fList = actPlan.features.split(',').map(s => s.trim());
      }
    }

    return {
      monthlyPlan: mPlan,
      yearlyPlan: yPlan,
      activePlan: actPlan,
      displayPrice: dispPrice,
      savingsPercent: savePct,
      featureList: fList,
      planName: actPlan?.name || 'Bakery Plan',
      planDescription: actPlan?.description || 'Everything you need to run a thriving online bakery.',
    };
  }, [allPlans, billing]);

  const faqs = [
    {
      q: 'What is included in the plan?',
      a: 'Everything. You get your own full-featured digital bakery storefront, unlimited cake listings, kitchen order management, 0% transaction fees, and direct customer payments.',
    },
    {
      q: 'Are there any hidden setup fees or commissions?',
      a: 'No hidden charges. You only pay the flat subscription and keep 100% of your cake sales.',
    },
    {
      q: 'How do customer payouts work?',
      a: 'For online orders, customer payments are transferred directly into your linked bank account or UPI ID with zero deductions.',
    },
    {
      q: 'Do I need technical skills to set up my shop?',
      a: 'None at all. Our guided onboarding takes under 10 minutes. Upload your cake photos and prices, and your shop is ready to accept orders.',
    },
  ];

  return (
    <div className="min-h-screen bg-brand-cream-light font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simple, Honest Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-brand-espresso tracking-tight">
            One Plan. <span className="text-brand-plum italic">Everything Included.</span>
          </h1>
          <p className="text-base sm:text-lg text-brand-muted leading-relaxed">
            No complicated tiers. No hidden commissions. Just everything you need to run a thriving online bakery.
          </p>

          <div className="mt-6 inline-flex p-1.5 rounded-2xl bg-white border border-brand-border shadow-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                billing === 'monthly' ? 'bg-brand-plum text-white shadow-sm' : 'text-brand-muted hover:text-brand-espresso'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                billing === 'yearly' ? 'bg-brand-plum text-white shadow-sm' : 'text-brand-muted hover:text-brand-espresso'
              }`}
            >
              Yearly
              {savingsPercent > 0 && !Number.isNaN(savingsPercent) && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  billing === 'yearly' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}>Save {savingsPercent}%</span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mb-16">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-3xl border-2 border-brand-plum/20 shadow-sm p-8 sm:p-10 animate-pulse flex flex-col items-center space-y-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-10 bg-gray-200 rounded w-1/3"></div>
                  <div className="w-full space-y-4 mt-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <div className="w-5 h-5 rounded-full bg-gray-200 shrink-0"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                      </div>
                    ))}
                  </div>
                  <div className="h-12 bg-gray-200 rounded-2xl w-full mt-4"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPlans.filter(p => p.billingCycle === billing).map((plan) => {
                let featureList: string[] = [];
                if (plan.features) {
                  try {
                    const parsed = JSON.parse(plan.features);
                    if (Array.isArray(parsed)) featureList = parsed;
                    else featureList = [plan.features];
                  } catch (e) {
                    featureList = plan.features.split(',').map(s => s.trim());
                  }
                }

                return (
                  <div key={plan.id} className="bg-white rounded-3xl border-2 border-brand-plum shadow-lg p-8 sm:p-10 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-plum">{plan.name}</span>
                          <h2 className="text-xl font-bold font-serif text-brand-espresso mt-1 line-clamp-2">{plan.description}</h2>
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="text-4xl font-extrabold font-serif text-brand-espresso">
                          <span className="text-lg font-bold">₹</span>{plan.price.toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-brand-muted mt-1">/{billing === 'yearly' ? 'year' : 'month'}</div>
                      </div>

                      <div className="space-y-3 mb-8">
                        {featureList.map((f, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="text-sm text-brand-espresso leading-snug">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-6">
                      <Link
                        href="/onboarding"
                        className="w-full inline-flex items-center justify-center px-6 py-4 rounded-2xl bg-brand-plum hover:bg-brand-plum-hover text-white text-base font-bold shadow-sm transition-all active:scale-95"
                      >
                        <span>Get Started</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                      <div className="mt-4 flex flex-col items-center justify-center gap-2 text-xs text-brand-muted">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>No hidden fees</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Cancel anytime</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {allPlans.filter(p => p.billingCycle === billing).length === 0 && (
                <div className="col-span-full text-center py-12 text-brand-muted">
                  No {billing} plans currently available. Please select another billing cycle or check back later.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-brand-espresso">
              Got <span className="text-brand-plum italic">Questions?</span>
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={index} className="bg-white rounded-2xl border border-brand-border overflow-hidden shadow-sm">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-brand-cream-light/50 transition-colors"
                  >
                    <span className="font-bold text-sm text-brand-espresso">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-brand-plum shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-sm text-brand-muted leading-relaxed border-t border-brand-border/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
