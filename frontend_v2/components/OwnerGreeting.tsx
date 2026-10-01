'use client';

import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

interface OwnerGreetingProps {
  businessName?: string | null;
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function formatDateBadge(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function OwnerGreeting({ businessName: _businessName }: OwnerGreetingProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!mounted || !now) {
    // Stable SSR placeholder – same card shape, no visible layout shift
    return (
      <div className="bg-white rounded-3xl border border-owner-border shadow-soft px-6 py-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xl font-bold font-serif text-owner-heading">&nbsp;</p>
          <p className="text-xs text-owner-muted">&nbsp;</p>
        </div>
      </div>
    );
  }

  const greeting = getGreeting(now.getHours());
  const dateBadge = formatDateBadge(now);
  const timeStr = formatTime(now);

  return (
    <div className="bg-white rounded-3xl border border-owner-border shadow-soft px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left – dynamic time-based greeting + subtitle */}
      <div className="space-y-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold font-serif text-owner-heading leading-snug truncate">
          {greeting}{_businessName ? `, ${_businessName}` : ''} 👋
        </h1>
        <p className="text-xs text-owner-muted">
          Here&apos;s what&apos;s happening with your bakery today.
        </p>
      </div>

      {/* Right – formatted date + live time badge */}
      <div className="self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-owner-border bg-owner-canvas text-xs font-semibold text-owner-muted shadow-2xs">
        <Calendar className="w-3.5 h-3.5 text-brand-plum shrink-0" />
        <span>{dateBadge}</span>
        <span className="opacity-40">·</span>
        <span>{timeStr}</span>
      </div>
    </div>
  );
}
