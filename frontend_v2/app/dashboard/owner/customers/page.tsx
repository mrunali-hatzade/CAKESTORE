'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  ShoppingBag,
  DollarSign,
  Calendar,
  MapPin,
  MessageCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { ownerApi } from '@/lib/api/owner';
import { CustomerProfile, CustomerOrderSummary } from '@/types/owner';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function OwnerCustomersPage() {
  const { registerRefreshHandler } = useOwner();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer for modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerProfile | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await ownerApi.getOwnerCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchCustomers(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchCustomers]);

  const handleOpenCustomerDetail = async (c: CustomerProfile) => {
    setSelectedCustomer(c);
    setLoadingDetail(true);
    try {
      const full = await ownerApi.getCustomerProfile(c.email);
      setCustomerDetail(full);
    } catch {
      setCustomerDetail(c);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filtered list
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Derived KPIs
  const totalCustomersCount = customers.length;
  const repeatCustomersCount = customers.filter((c) => (c.totalOrders || 0) > 1).length;
  const totalOrdersCount = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const totalRevenue = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);

  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  const getOrderStatusBadge = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'NEW':
        return <Badge variant="warning">New</Badge>;
      case 'PREPARING':
        return <Badge variant="info">Baking</Badge>;
      case 'READY':
        return <Badge variant="plum">Ready</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (loading) return <LoadingState message="Loading bakery customers CRM..." />;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-owner-border shadow-soft">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bakery Customer CRM & Loyalty</span>
          </div>
          <h1 className="text-2xl font-bold font-serif text-owner-heading tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-owner-muted">
            Track customer relationship profiles, lifetime orders, spending history, and direct WhatsApp touchpoints
          </p>
        </div>

        <button
          onClick={() => fetchCustomers(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-owner-canvas hover:bg-brand-cream border border-owner-border text-xs font-semibold text-owner-heading transition-all disabled:opacity-60 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-brand-plum ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Customers</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalCustomersCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Repeat Celebrants</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{repeatCustomersCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Total Orders Placed</p>
            <p className="text-xl font-bold font-serif text-owner-heading">{totalOrdersCount}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-owner-muted">Lifetime Revenue</p>
            <p className="text-xl font-bold font-serif text-owner-heading">₹{totalRevenue.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-owner-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-owner-border text-xs text-owner-heading bg-white focus:outline-none focus:ring-2 focus:ring-brand-plum/20"
          />
        </div>
        <p className="text-xs text-owner-muted font-medium">
          Showing <strong className="text-owner-heading">{filteredCustomers.length}</strong> customers
        </p>
      </div>

      {/* Customer Table */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No Customers Found"
          description={
            searchQuery
              ? 'No customers match your search criteria.'
              : 'Customers who place orders on your bakery storefront will be automatically indexed here.'
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Last Celebration</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-owner-border">
                {filteredCustomers.map((c, idx) => {
                  const phoneDigits = cleanPhone(c.mobile);
                  const whatsappUrl = phoneDigits
                    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                        `Hello ${c.name}, warm greetings from your favorite bakery on CakeStore!`
                      )}`
                    : null;

                  return (
                    <tr key={idx} className="hover:bg-owner-canvas/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-blush text-brand-plum font-serif font-bold text-sm flex items-center justify-center shrink-0">
                            {c.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div>
                            <p className="font-semibold text-owner-heading">{c.name}</p>
                            {c.totalOrders > 1 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-md">
                                ★ Repeat Customer
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-owner-muted">
                        <p className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-brand-plum" />
                          <span>{c.email}</span>
                        </p>
                        {c.mobile && (
                          <p className="flex items-center gap-1 text-[11px] mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>{c.mobile}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-owner-heading">
                        {c.totalOrders || 0} {c.totalOrders === 1 ? 'order' : 'orders'}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-owner-heading">
                        ₹{(c.totalSpent || 0).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-owner-muted text-[11px]">
                        {c.lastOrderDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-brand-plum" />
                            {new Date(c.lastOrderDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            onClick={() => handleOpenCustomerDetail(c)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View History
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Customer Detail & Order History Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => {
          setSelectedCustomer(null);
          setCustomerDetail(null);
        }}
        title={`Customer Profile: ${selectedCustomer?.name}`}
      >
        {selectedCustomer && (
          <div className="space-y-4">
            {/* Customer Summary Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <p className="text-[10px] text-owner-muted uppercase font-bold">Email Address</p>
                <p className="font-semibold text-owner-heading mt-0.5 truncate">{selectedCustomer.email}</p>
              </div>
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <p className="text-[10px] text-owner-muted uppercase font-bold">Phone Number</p>
                <p className="font-semibold text-owner-heading mt-0.5 truncate">{selectedCustomer.mobile || 'Not provided'}</p>
              </div>
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <p className="text-[10px] text-owner-muted uppercase font-bold">Total Orders</p>
                <p className="font-semibold text-owner-heading mt-0.5">{selectedCustomer.totalOrders} celebrations</p>
              </div>
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <p className="text-[10px] text-owner-muted uppercase font-bold">Total Lifetime Spend</p>
                <p className="font-semibold text-owner-heading mt-0.5">₹{(selectedCustomer.totalSpent || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Order History */}
            <div className="space-y-2 pt-2 border-t border-owner-border">
              <h3 className="font-serif font-bold text-sm text-owner-heading">Celebration Order History</h3>

              {loadingDetail ? (
                <div className="py-6 text-center text-xs text-owner-muted">Loading purchase history...</div>
              ) : customerDetail?.orderHistory && customerDetail.orderHistory.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {customerDetail.orderHistory.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 rounded-xl bg-white border border-owner-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-owner-heading">{order.orderNumber}</span>
                          {getOrderStatusBadge(order.orderStatus)}
                        </div>
                        <p className="text-[11px] text-owner-muted">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-owner-heading">₹{order.totalAmount}</p>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-owner-muted italic p-3 bg-brand-cream/40 rounded-xl">
                  Order history details currently archived.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCustomer(null);
                  setCustomerDetail(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
