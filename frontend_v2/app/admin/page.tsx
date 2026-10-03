'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Mail,
  Store,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  ArrowRight,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { getPlatformStats, getAllShops } from '@/lib/api/admin';
import { DashboardStats, AdminShopSummary } from '@/types/admin';
import { communicationApi } from '@/lib/api/communication';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/common/Toast';
import { LoadingState } from '@/components/ui/LoadingState';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentShops, setRecentShops] = useState<AdminShopSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('All Time');
  const [dateFilter, setDateFilter] = useState<{ start?: string; end?: string }>({ start: undefined, end: undefined });
  const toast = useToast();

  const loadData = useCallback(async (isManual = false) => {
    if (!isManual) setIsLoading(true);

    try {
      const [statsData, shopsData] = await Promise.all([
        getPlatformStats(dateFilter.start, dateFilter.end),
        getAllShops(0, 5), // Only need top 5 for the dashboard
      ]);
      setStats(statsData);
      setRecentShops(shopsData.content || []);
    } catch (err: any) {
      console.warn('Failed to load admin stats:', err);
      toast.error(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [toast, dateFilter.start, dateFilter.end]);

  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      loadData(true);
    };

    window.addEventListener('adminGlobalRefresh', handleRefresh);
    return () => {
      window.removeEventListener('adminGlobalRefresh', handleRefresh);
    };
  }, [loadData]);

  if (isLoading) {
    return <LoadingState message="Loading platform intelligence..." />;
  }

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const range = e.target.value;
    setDateRange(range);
    
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    let start: string | undefined = undefined;
    let end: string | undefined = undefined;

    if (range === 'Last 7 Days') {
      const d = new Date(today);
      d.setDate(today.getDate() - 7);
      start = formatDate(d);
      end = formatDate(today);
    } else if (range === 'Last 30 Days') {
      const d = new Date(today);
      d.setDate(today.getDate() - 30);
      start = formatDate(d);
      end = formatDate(today);
    } else if (range === 'This Month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatDate(d);
      end = formatDate(today);
    } else if (range === 'This Year') {
      const d = new Date(today.getFullYear(), 0, 1);
      start = formatDate(d);
      end = formatDate(today);
    }

    setDateFilter({ start, end });
  };

  const formatCurrency = (val?: number) => {
    return `₹${(val || 0).toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE • STORE LIVE
        </span>
      );
    }
    if (s === 'PENDING' || s === 'PENDING_APPROVAL') return <Badge variant="warning" size="sm">Pending Approval</Badge>;
    if (s === 'SUSPENDED') return <Badge variant="error" size="sm">Suspended</Badge>;
    return <Badge variant="default" size="sm">{status}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-slate-900">
            Platform Intelligence & Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-tenant health, GMV volume, and bakery compliance status
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <select
            value={dateRange}
            onChange={handleDateRangeChange}
            className="text-sm border-slate-200 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="All Time">All Time</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Month">This Month</option>
            <option value="This Year">This Year</option>
          </select>
        </div>
      </div>

      {/* Pending Approval Action Alert Banner */}
      {(stats?.pendingShops ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                {stats?.pendingShops} {stats?.pendingShops === 1 ? 'Bakery' : 'Bakeries'} Awaiting Verification
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                New bakery registrations require administrative verification and compliance review.
              </p>
            </div>
          </div>
          <Link href="/admin/shops">
            <Button variant="primary" size="sm" className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 border-amber-700">
              Review Applications
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Bakeries */}
        <Card className="p-6 border-slate-200/80 shadow-soft hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Bakeries
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-serif text-slate-900 mt-3">
            {stats?.totalShops ?? 0}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
            <span className="text-emerald-700 font-medium">{stats?.activeShops ?? 0} active</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-700 font-medium">{stats?.pendingShops ?? 0} pending</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-700 font-medium">{stats?.suspendedShops ?? 0} suspended</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{stats?.inactiveShops ?? 0} inactive</span>
          </div>
        </Card>

        {/* Subscriptions & Accounts */}
        <Card className="p-6 border-slate-200/80 shadow-soft hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-serif text-slate-900 mt-3">
            {stats?.activeSubscriptions ?? 0}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-rose-600 font-medium">
              {stats?.expiredSubscriptions ?? 0} expired
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">
              {stats?.totalUsers ?? 0} users total
            </span>
          </div>
        </Card>

        {/* Today's Platform Activity */}
        <Card className="p-6 border-slate-200/80 shadow-soft hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today&apos;s Activity
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold font-serif text-slate-900 mt-3">
            {stats?.todayRegistrations ?? 0}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-purple-700 font-medium">New registrations</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-medium">{stats?.todayPayments ?? 0} payments</span>
          </div>
        </Card>

        {/* Financials: Platform Revenue & Network GMV */}
        <Card className="p-6 border-slate-200/80 shadow-soft hover:shadow-card transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Financials
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[10px] text-slate-500 font-bold tracking-wide">PLATFORM REVENUE (SAAS)</p>
              <p className="text-2xl font-bold font-serif text-emerald-700">
                {formatCurrency(stats?.monthlyPlatformRevenue)}
              </p>
              <p className="text-[11px] text-emerald-600/80 font-medium mt-0.5">
                {formatCurrency(stats?.totalPlatformRevenue)} lifetime
              </p>
            </div>
            
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold tracking-wide">NETWORK GMV (CAKE SALES)</p>
              <p className="text-xl font-bold font-serif text-slate-700">
                {formatCurrency(stats?.monthlyGmv)}
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {formatCurrency(stats?.totalGmv)} lifetime processed
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Administration Modules Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link href="/admin/shops" className="group">
          <Card className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-card transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Bakery Moderation
                </h4>
                <p className="text-xs text-slate-500">Approve, reject, or audit bakeries</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>

        <Link href="/admin/plans" className="group">
          <Card className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-card transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  SaaS Subscription Plans
                </h4>
                <p className="text-xs text-slate-500">Configure tiers, pricing & quotas</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>

        <Link href="/admin/messages" className="group">
          <Card className="p-5 border-slate-200 hover:border-indigo-300 hover:shadow-card transition-all flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  System Broadcasts
                </h4>
                <p className="text-xs text-slate-500">Dispatch alerts & announcements</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </Card>
        </Link>
      </div>

      
      {/* Secondary Operational Communication Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="p-5 border-slate-200/90 bg-gradient-to-br from-white to-indigo-50/20 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Platform Feedback</h4>
              <p className="text-xs text-slate-500">Suggestions & reviews from bakery owners</p>
            </div>
          </div>
          <Link href="/admin/feedback">
            <Button variant="outline" size="sm" className="text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <span>View Feedback</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </Card>

        <Card className="p-5 border-slate-200/90 bg-gradient-to-br from-white to-blue-50/20 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Contact Enquiries</h4>
              <p className="text-xs text-slate-500">Visitor messages from public Contact Us page</p>
            </div>
          </div>
          <Link href="/admin/enquiries">
            <Button variant="outline" size="sm" className="text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50">
              <span>View Enquiries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Recent Bakery Registrations Table */}
      <Card className="p-6 border-slate-200/80 shadow-soft">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif font-bold text-lg text-slate-900">
              Recent Bakery Registrations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest tenants requesting access to the CakeStore marketplace
            </p>
          </div>
          <Link href="/admin/shops">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <span>View All Bakeries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-medium">
                <th className="py-3 px-4 rounded-l-xl">Bakery</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentShops.map((shop) => (
                <tr key={shop.shopId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {shop.businessName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{shop.businessName}</p>
                        <p className="text-[11px] text-slate-400">ID #{shop.shopId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-700">{shop.ownerName || '—'}</p>
                    <p className="text-[11px] text-slate-400">{shop.ownerEmail || '—'}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {shop.registeredAt
                      ? new Date(shop.registeredAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(shop.shopStatus)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/shop/${shop.shopId}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-indigo-600 gap-1">
                          <Store className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Storefront</span>
                        </Button>
                      </Link>
                      <Link href={`/admin/shops/${shop.shopId}`}>
                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold text-xs">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
