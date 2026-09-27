'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag, Search, Printer, ChevronDown, Download, Eye,
  Phone, Mail, MapPin, MessageCircle, Banknote, CreditCard,
  CheckCircle2, AlertCircle, Check, Clock, Cake
} from 'lucide-react';
import { ordersApi } from '@/lib/api/orders';
import { useOwner } from '@/context/OwnerContext';
import { Order, OrderStatus } from '@/types/order';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';

const ALL_STATUSES = ['NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New Order',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Baking / Preparing',
  READY: 'Ready for Pickup',
  COMPLETED: 'Completed',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OwnerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPayment, setFilterPayment] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { registerRefreshHandler, refreshDashboard } = useOwner();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const size = 15;

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await ordersApi.getOwnerOrders(undefined, page, size);
      setOrders(data?.content || []);
      setTotalPages(data?.totalPages || 0);
      setTotalElements(data?.totalElements || 0);
    } catch {
      setOrders([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('payment');
      if (p) setFilterPayment(p);
    }
  }, []);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchOrders(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchOrders]);

  const handlePaymentStatusChange = async (orderId: number, targetStatus: 'PAID' | 'PENDING') => {
    setUpdatingPaymentId(orderId);
    try {
      const updated = await ordersApi.updatePaymentStatus(
        orderId,
        targetStatus,
        targetStatus === 'PAID' ? 'CASH_COLLECTED' : 'PENDING'
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...updated,
                paymentStatus: targetStatus,
                paidAt: targetStatus === 'PAID' ? (updated.paidAt || new Date().toISOString()) : undefined,
              }
            : o
        )
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
                paymentStatus: targetStatus,
                paidAt: targetStatus === 'PAID' ? (updated.paidAt || new Date().toISOString()) : undefined,
              }
            : null
        );
      }
      refreshDashboard().catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Failed to update payment status');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleStatusChange = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await ordersApi.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated, status: (updated.orderStatus || updated.status || status) as OrderStatus } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updated, status: (updated.orderStatus || updated.status || status) as OrderStatus });
      }
    } catch (err: any) {
      alert(err?.message || err?.response?.data?.message || 'Failed to update status. Invalid transition.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDownloadInvoice = async (ord: Order) => {
    setDownloadingId(ord.id);
    try {
      await ordersApi.downloadInvoice(ord.id, ord.orderNumber);
    } catch (err: any) {
      alert(err?.message || 'Failed to download invoice');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintKOT = (ord: Order) => {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const isCod = (ord.paymentMethod || '').toUpperCase() === 'COD' || (ord.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY';
    const isPaid = (ord.paymentStatus || '').toUpperCase() === 'PAID';
    const payModeStr = isCod ? 'CASH ON DELIVERY (COD)' : 'PAID BY RAZORPAY';
    const payStatusStr = isPaid ? 'PAID' : (isCod ? 'PENDING (Rs.' + ord.totalAmount + ')' : 'PENDING');

    win.document.write(`
      <html><head><title>KOT - ${ord.orderNumber}</title>
      <style>
        body { font-family: monospace; padding: 20px; font-size: 13px; color: #000; }
        h2 { text-align: center; font-size: 16px; margin-bottom: 2px; }
        .center { text-align: center; }
        hr { border: 1px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .alert-box { background: #fff3cd; border: 2px dashed #856404; color: #856404; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; margin: 8px 0; border-radius: 4px; }
        .paid-box { background: #d4edda; border: 1px solid #155724; color: #155724; padding: 6px; text-align: center; font-weight: bold; margin: 8px 0; border-radius: 4px; }
        @media print { button { display: none; } }
      </style></head>
      <body>
        <h2>CakeStore Kitchen Ticket</h2>
        <p class="center" style="font-size:11px;">KITCHEN ORDER TICKET (KOT)</p>
        <hr/>
        <div class="row"><span><b>Order Number:</b></span><span>#${ord.orderNumber}</span></div>
        <div class="row"><span><b>Customer:</b></span><span>${ord.customerName || 'Guest'}</span></div>
        <div class="row"><span><b>Phone:</b></span><span>${ord.customerPhone || '-'}</span></div>
        <div class="row"><span><b>Delivery Date:</b></span><span>${ord.deliveryDate || '-'}</span></div>
        <div class="row"><span><b>Order Total:</b></span><span>Rs.${ord.totalAmount}</span></div>
        <div class="row"><span><b>Payment Mode:</b></span><span>${payModeStr}</span></div>
        <div class="row"><span><b>Payment Status:</b></span><span style="font-weight:bold; color: ${isPaid ? '#155724' : '#856404'};">${payStatusStr}</span></div>
        ${!isPaid && isCod ? `<div class="alert-box">💵 COD PAYMENT PENDING: Rs.${ord.totalAmount}</div>` : ''}
        ${isPaid ? `<div class="paid-box">✓ PAYMENT SETTLED (PAID)</div>` : ''}
        <hr/>
        <p><b>Delivery Address:</b><br/>${ord.deliveryAddress || 'Pick up at store'}</p>
        <hr/>
        <p><b>Items:</b></p>
        ${(ord.items || []).map((it) => `
          <div style="margin-bottom: 6px;">
            <div><b>${it.quantity}x ${it.productName || it.productNameSnapshot || 'Artisan Cake'}</b> - Rs.${it.unitPrice}</div>
            ${it.cakeMessage || it.customMessage ? `<div style="font-size:11px; padding-left:10px;">Message: "${it.cakeMessage || it.customMessage}"</div>` : ''}
            ${it.dietaryPreference ? `<div style="font-size:11px; padding-left:10px;">Type: ${it.dietaryPreference}</div>` : ''}
          </div>
        `).join('')}
        <hr/>
        <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; cursor: pointer;">Print Ticket</button>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  if (isLoading) return <LoadingState message="Loading bakery order sheets..." />;

  const codPendingCount = orders.filter(
    (o) =>
      ((o.paymentMethod || '').toUpperCase() === 'COD' || (o.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY') &&
      (o.paymentStatus || '').toUpperCase() !== 'PAID' &&
      (o.orderStatus || o.status || '').toUpperCase() !== 'CANCELLED'
  ).length;

  const paidCount = orders.filter((o) => (o.paymentStatus || '').toUpperCase() === 'PAID').length;

  const filtered = orders.filter((o) => {
    const s = (o.orderStatus || o.status || '').toUpperCase();
    const matchesFilter = filterStatus === 'ALL' || s === filterStatus || (filterStatus === 'NEW' && s === 'PENDING');
    
    const isCod = (o.paymentMethod || '').toUpperCase() === 'COD' || (o.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY';
    const isPaid = (o.paymentStatus || '').toUpperCase() === 'PAID';

    let matchesPayment = true;
    if (filterPayment === 'COD_PENDING') matchesPayment = isCod && !isPaid;
    else if (filterPayment === 'PAID') matchesPayment = isPaid;
    else if (filterPayment === 'COD') matchesPayment = isCod;
    else if (filterPayment === 'ONLINE') matchesPayment = !isCod;

    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.customerPhone?.includes(q);

    return matchesFilter && matchesPayment && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl text-owner-heading">Order Management</h1>
          <p className="text-xs text-owner-muted mt-0.5">
            Process incoming orders, review custom cake messages, print kitchen order tickets, and download tax invoices
          </p>
        </div>
        <div className="flex items-center gap-2">
          {codPendingCount > 0 && (
            <Badge variant="warning" size="md" className="gap-1 bg-amber-100 text-amber-900 border-amber-300">
              <Banknote className="w-3.5 h-3.5 text-amber-700" />
              <span>{codPendingCount} COD Cash Due</span>
            </Badge>
          )}
          <Badge variant="default" size="md">
            {orders.length} Total Orders
          </Badge>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-owner-muted" />
            <input
              type="text"
              placeholder="Search by order #, customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-owner-border bg-white text-owner-heading placeholder:text-owner-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', ...ALL_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                  filterStatus === s
                    ? 'bg-brand-plum text-white border-brand-plum shadow-soft'
                    : 'bg-white text-owner-muted border-owner-border hover:border-brand-plum/40 hover:text-owner-heading'
                }`}
              >
                {s === 'ALL' ? 'All Orders' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="w-6 h-6" />}
          title={search || filterStatus !== 'ALL' ? 'No Matching Orders' : 'No Orders Received'}
          description="Customer orders placed on your live storefront will appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Order Placed</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Delivery Schedule</th>
                  <th className="py-3.5 px-4">Amount & Payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-owner-border">
                {filtered.map((ord) => {
                  const currentStatus = (ord.orderStatus || ord.status || 'NEW').toUpperCase();
                  const customerDigits = (ord.customerPhone || '').replace(/\D/g, '');
                  const isCod = (ord.paymentMethod || '').toUpperCase() === 'COD' || (ord.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY';
                  const isPaid = (ord.paymentStatus || '').toUpperCase() === 'PAID';

                  return (
                    <tr key={ord.id} className="hover:bg-owner-canvas/30 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="font-bold text-brand-plum hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          #{ord.orderNumber}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-owner-heading">
                          {ord.createdAt
                            ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </p>
                        <p className="text-[10px] text-owner-muted flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-owner-muted" />
                          <span>
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-owner-heading">{ord.customerName || 'Guest'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-owner-muted text-[11px]">
                          <span>{ord.customerPhone || '-'}</span>
                          {customerDigits && (
                            <a
                              href={`https://wa.me/91${customerDigits.slice(-10)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-medium text-owner-heading">{ord.deliveryDate || 'Standard'}</p>
                        <p className="text-[10px] text-owner-muted">
                          {ord.deliveryAddress ? 'Doorstep Delivery' : 'Bakery Pickup'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-owner-heading text-sm">₹{Number(ord.totalAmount).toLocaleString('en-IN')}</p>
                        
                        {isCod ? (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                              COD
                            </span>
                            <div className="relative">
                              <select
                                disabled={updatingPaymentId === ord.id}
                                value={isPaid ? 'PAID' : 'PENDING'}
                                onChange={(e) => handlePaymentStatusChange(ord.id, e.target.value as 'PAID' | 'PENDING')}
                                className={`appearance-none pl-2 pr-5 py-0.5 text-[11px] font-bold rounded-lg border cursor-pointer focus:outline-none transition-colors disabled:opacity-50 ${
                                  isPaid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                                }`}
                              >
                                <option value="PENDING">Pending</option>
                                <option value="PAID">Paid</option>
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-owner-muted pointer-events-none" />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Paid by Razorpay</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Razorpay (Pending)</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={currentStatus as OrderStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="relative">
                            <select
                              disabled={updatingId === ord.id}
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                              className="appearance-none pl-2 pr-6 py-1 text-[11px] font-semibold rounded-lg border border-owner-border bg-white text-owner-heading cursor-pointer hover:border-brand-plum/40 focus:outline-none disabled:opacity-50"
                            >
                              <option value="NEW">New</option>
                              <option value="PREPARING">Preparing</option>
                              <option value="READY">Ready</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-owner-muted pointer-events-none" />
                          </div>
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1.5 text-owner-muted hover:text-brand-plum hover:bg-brand-blush/60 rounded-lg transition-colors cursor-pointer"
                            title="View Full Order Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(ord)}
                            disabled={downloadingId === ord.id}
                            className="p-1.5 text-owner-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="Download Tax Invoice PDF"
                          >
                            <Download className={`w-4 h-4 ${downloadingId === ord.id ? 'animate-bounce' : ''}`} />
                          </button>
                          <button
                            onClick={() => handlePrintKOT(ord)}
                            className="p-1.5 text-owner-muted hover:text-owner-heading hover:bg-owner-canvas rounded-lg transition-colors cursor-pointer"
                            title="Print Kitchen Ticket (KOT)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-owner-border bg-white">
              <span className="text-sm text-owner-muted">
                Showing {orders.length} of {totalElements} orders
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="px-3 py-1.5 text-sm font-medium text-owner-heading">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          maxWidth="5xl"
          title={`Order #${selectedOrder.orderNumber}`}
          description={`Placed on ${
            selectedOrder.createdAt
              ? new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A'
          }`}
        >
          <div className="space-y-6 text-xs">
            {/* 2-Column Landscape Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: Customer & Order Fulfillment & Payment (col-span-5) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Meta summary card */}
                <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-2xl bg-owner-canvas/70 border border-owner-border">
                  <div>
                    <span className="text-[10px] text-owner-muted font-bold uppercase tracking-wider block">Order Placed</span>
                    <p className="text-xs font-semibold text-owner-heading mt-0.5">
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </p>
                    <p className="text-[10px] text-owner-muted">
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-owner-muted font-bold uppercase tracking-wider block">Delivery Due</span>
                    <p className="text-xs font-bold text-brand-plum mt-0.5">
                      {selectedOrder.deliveryDate || 'Standard'}
                    </p>
                    <p className="text-[10px] text-owner-muted">
                      {selectedOrder.deliveryAddress ? 'Doorstep Delivery' : 'Bakery Pickup'}
                    </p>
                  </div>
                </div>

                {/* Customer Details Card */}
                <div className="p-4 rounded-2xl bg-white border border-owner-border space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-owner-border/60">
                    <h4 className="font-serif font-bold text-xs text-owner-heading uppercase tracking-wider">
                      Customer Information
                    </h4>
                    {selectedOrder.customerPhone && (
                      <a
                        href={`https://wa.me/91${selectedOrder.customerPhone.replace(/\D/g, '').slice(-10)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                  <div className="space-y-2 text-owner-muted">
                    <p className="font-bold text-sm text-owner-heading">
                      {selectedOrder.customerName || 'Guest Customer'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-brand-plum shrink-0" />
                      <span className="font-medium text-owner-heading">{selectedOrder.customerPhone || 'No phone provided'}</span>
                    </p>
                    {selectedOrder.customerEmail && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-brand-plum shrink-0" />
                        <span>{selectedOrder.customerEmail}</span>
                      </p>
                    )}
                    <p className="flex items-start gap-2 pt-1 border-t border-owner-border/40">
                      <MapPin className="w-3.5 h-3.5 text-brand-plum shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{selectedOrder.deliveryAddress || 'Self Pickup directly at Bakery'}</span>
                    </p>
                  </div>
                </div>

                {/* Payment & Settlement Card */}
                <div className={`p-4 rounded-2xl border ${
                  ((selectedOrder.paymentMethod || '').toUpperCase() === 'COD' || (selectedOrder.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY') && (selectedOrder.paymentStatus || '').toUpperCase() !== 'PAID'
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-white border-owner-border shadow-xs'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-owner-muted">
                        Payment & Settlement
                      </span>
                      <span className="text-base font-bold text-brand-plum">
                        ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        {((selectedOrder.paymentMethod || '').toUpperCase() === 'COD' || (selectedOrder.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY') ? (
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                            <Banknote className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                            <CreditCard className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-xs text-owner-heading">
                            {((selectedOrder.paymentMethod || '').toUpperCase() === 'COD' || (selectedOrder.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY')
                              ? 'Cash on Delivery (COD)'
                              : 'Online Payment (Razorpay)'}
                          </p>
                          <p className="text-[10px] text-owner-muted">
                            {((selectedOrder.paymentMethod || '').toUpperCase() === 'COD' || (selectedOrder.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY')
                              ? (selectedOrder.paymentStatus || '').toUpperCase() === 'PAID'
                                ? 'Cash payment collected & marked paid'
                                : 'Pending cash collection on delivery'
                              : `Ref: ${selectedOrder.transactionId || 'Verified'}`}
                          </p>
                        </div>
                      </div>

                      {/* Dropdown for COD or Paid Badge for Online */}
                      {((selectedOrder.paymentMethod || '').toUpperCase() === 'COD' || (selectedOrder.paymentMethod || '').toUpperCase() === 'CASH_ON_DELIVERY') ? (
                        <div className="relative">
                          <select
                            disabled={updatingPaymentId === selectedOrder.id}
                            value={(selectedOrder.paymentStatus || '').toUpperCase() === 'PAID' ? 'PAID' : 'PENDING'}
                            onChange={(e) => handlePaymentStatusChange(selectedOrder.id, e.target.value as 'PAID' | 'PENDING')}
                            className={`appearance-none pl-2.5 pr-6 py-1 text-xs font-bold rounded-xl border cursor-pointer focus:outline-none transition-colors ${
                              (selectedOrder.paymentStatus || '').toUpperCase() === 'PAID'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            }`}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-owner-muted pointer-events-none" />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="p-4 rounded-2xl bg-owner-canvas border border-owner-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-owner-heading">Order Stage:</span>
                    <StatusBadge status={(selectedOrder.orderStatus || selectedOrder.status) as OrderStatus} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ALL_STATUSES.map((s) => {
                      const currentStatus = (selectedOrder.orderStatus || selectedOrder.status || '').toUpperCase();
                      const isCurrent = currentStatus === s;
                      return (
                        <button
                          key={s}
                          disabled={updatingId === selectedOrder.id}
                          onClick={() => handleStatusChange(selectedOrder.id, s)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-brand-plum text-white shadow-soft ring-2 ring-brand-plum/30'
                              : 'bg-white text-owner-heading border border-owner-border hover:border-brand-plum/50'
                          }`}
                        >
                          {STATUS_LABELS[s] || s}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: Ordered Cakes & Reference Images (col-span-7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-owner-border">
                  <h4 className="font-serif font-bold text-sm text-owner-heading">
                    Celebration Cakes & Items Ordered
                  </h4>
                  <span className="text-[11px] text-owner-muted font-semibold">
                    {selectedOrder.items?.length || 0} {selectedOrder.items?.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="space-y-3">
                  {(selectedOrder.items && selectedOrder.items.length > 0) ? (
                    selectedOrder.items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-white border border-owner-border space-y-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Cake Photo */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-brand-cream border border-brand-border shrink-0">
                            {it.productImageUrl ? (
                              <img
                                src={it.productImageUrl}
                                alt={it.productName || 'Ordered Cake'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-brand-muted p-1">
                                <Cake className="w-6 h-6 text-brand-plum/40 mb-0.5" />
                                <span className="text-[9px] text-center font-medium">Cake</span>
                              </div>
                            )}
                          </div>

                          {/* Cake Info & Pricing */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-owner-heading leading-tight">
                                  {it.productName || it.productNameSnapshot || 'Artisan Cake'}
                                </h5>
                                {it.variantName && (
                                  <p className="text-[11px] font-semibold text-brand-plum mt-0.5">
                                    Variant: {it.variantName}
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-sm text-owner-heading">
                                  ₹{it.quantity * it.unitPrice}
                                </p>
                                <p className="text-[10px] text-owner-muted">
                                  {it.quantity} × ₹{it.unitPrice}
                                </p>
                              </div>
                            </div>

                            {/* Dietary badge & Custom Inscription */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {it.dietaryPreference && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {it.dietaryPreference}
                                </span>
                              )}
                              {it.addonsSummary && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cream text-brand-espresso border border-brand-border">
                                  {it.addonsSummary}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Inscription Message Banner */}
                        {(it.cakeMessage || it.customMessage) && (
                          <div className="p-2.5 rounded-xl bg-brand-blush/30 border border-brand-blush-border text-brand-plum flex items-start gap-2">
                            <span className="text-xs font-bold shrink-0">🎂 Inscription:</span>
                            <span className="text-xs font-serif font-semibold italic text-brand-espresso">
                              &ldquo;{it.cakeMessage || it.customMessage}&rdquo;
                            </span>
                          </div>
                        )}

                        {/* Customer Desired Design Reference Photo */}
                        {it.photoReferenceUrl ? (
                          <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-owner-heading flex items-center gap-1">
                                <span>📸 Customer Design Reference Photo</span>
                              </span>
                              <a
                                href={it.photoReferenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-brand-plum hover:underline"
                              >
                                View Full Size ↗
                              </a>
                            </div>
                            <p className="text-[10px] text-owner-muted">
                              Customer attached this image showing how they want the cake decorated:
                            </p>
                            <div className="relative aspect-video max-h-48 sm:max-h-56 w-full rounded-xl overflow-hidden border border-brand-border bg-black/5">
                              <a
                                href={it.photoReferenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Click to view full resolution"
                              >
                                <img
                                  src={it.photoReferenceUrl}
                                  alt="Customer Desired Cake Reference"
                                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-2 rounded-xl bg-owner-canvas/40 border border-owner-border/60 text-[11px] text-owner-muted">
                            Standard catalog design (no customer reference photo attached)
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-owner-muted border rounded-2xl bg-white">
                      Celebration cake order (Total: ₹{selectedOrder.totalAmount})
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-owner-border flex flex-wrap items-center justify-between gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintKOT(selectedOrder)}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Kitchen Ticket (KOT)</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadInvoice(selectedOrder)}
                  disabled={downloadingId === selectedOrder.id}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Invoice</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}