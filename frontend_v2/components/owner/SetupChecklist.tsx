'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ShopSettings, OwnerDashboardStats } from '@/types/owner';
import { DeliverySlot } from '@/types/deliverySlot';

interface SetupChecklistProps {
  shop: ShopSettings | null | undefined;
  stats: OwnerDashboardStats | null | undefined;
  deliverySlots: DeliverySlot[];
}

export function SetupChecklist({ shop, stats, deliverySlots }: SetupChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  const checklistItems = [
    {
      title: 'Complete Business Profile',
      description: 'Add your business description, address, and FSSAI registration.',
      completed: Boolean(shop?.description && (shop?.addressLine1 || shop?.address) && shop?.fssaiRegistration),
      href: '/dashboard/owner/settings',
    },
    {
      title: 'Add Bakery Branding',
      description: 'Upload your bakery logo and storefront cover image.',
      completed: Boolean(shop?.logoUrl || shop?.coverImageUrl),
      href: '/dashboard/owner/website',
    },
    {
      title: 'Set Up Delivery Slots',
      description: 'Configure delivery time slots and ensure at least one is active.',
      completed: deliverySlots.length > 0 && deliverySlots.some(slot => slot.isActive),
      href: '/dashboard/owner/delivery-slots',
    },
    {
      title: 'Add Your First Product',
      description: 'Create your first product so customers can start ordering.',
      completed: (stats?.totalProducts ?? 0) > 0,
      href: '/dashboard/owner/products',
    },
    {
      title: 'Activate Subscription',
      description: 'Select a plan to make your bakery live for customers.',
      completed: shop?.status === 'ACTIVE' || stats?.subscriptionStatus === 'ACTIVE',
      href: '/dashboard/owner/subscription',
    },
  ];

  const completedSteps = checklistItems.filter((i) => i.completed).length;
  const totalSteps = checklistItems.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  if (dismissed && completedSteps === totalSteps) {
    return null;
  }

  return (
    <Card className="p-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-owner-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-owner-heading">Get your bakery ready</h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum">
              {completedSteps} of {totalSteps} completed
            </span>
          </div>
          <p className="text-xs text-owner-muted mt-0.5">
            Completing these steps helps the bakery start accepting orders.
          </p>
        </div>

        <div className="w-full sm:w-48">
          <div className="flex items-center justify-between text-[11px] font-medium text-owner-muted mb-1.5">
            <span>Setup Progress</span>
            <span className="font-bold text-brand-plum">{progressPercent}%</span>
          </div>
          <div className="w-full bg-owner-canvas rounded-full h-2 overflow-hidden border border-owner-border/50">
            <div
              className="bg-brand-plum h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {completedSteps === totalSteps ? (
        <div className="py-8 flex flex-col items-center justify-center text-center relative">
          <button 
            onClick={() => setDismissed(true)}
            className="absolute top-0 right-0 p-2 text-owner-muted hover:text-owner-heading transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h4 className="text-lg font-bold text-owner-heading">Your bakery is ready! 🎉</h4>
          <p className="text-sm text-owner-muted mt-1 max-w-md">
            Congratulations! You have completed all the necessary steps to configure your digital storefront.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-owner-border/60 pt-2">
          {checklistItems.map((item, idx) => (
            <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-owner-border flex items-center justify-center text-[10px] font-bold text-owner-muted">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className={`text-sm font-semibold ${item.completed ? 'text-owner-muted line-through' : 'text-owner-heading'}`}>
                    {item.title}
                  </h4>
                  <p className="text-xs text-owner-muted truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>

              {!item.completed && (
                <Link
                  href={item.href}
                  className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-brand-plum hover:text-brand-espresso transition-colors"
                >
                  <span>Configure</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
