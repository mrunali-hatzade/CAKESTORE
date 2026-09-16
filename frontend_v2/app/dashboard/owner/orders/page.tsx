'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag, Search, Printer, ChevronDown, Download, Eye,
  Phone, Mail, MapPin, MessageCircle
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
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { registerRefreshHandler } = useOwner();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await ordersApi.getOwnerOrders();
      setOrders(data || []);
    } catch {
      setOrders([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchOrders(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchOrders]);

  const handleStatusChange = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await ordersApi.updateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated, status: (updated.orderStatus || updated.status || status) as OrderStatus } : o)));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updated, status: (updated.orderStatus || updated.status || status) as OrderStatus });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
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
    win.document.write(`
      <html><head><title>KOT - ${ord.orderNumber}</title>
      <style>
        body { font-family: monospace; padding: 20px; font-size: 13px; color: #000; }
        h2 { text-align: center; font-size: 16px; margin-bottom: 2px; }
        .center { text-align: center; }
        hr { border: 1px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; margin: 4px 0; }
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
        <div class="row"><span><b>Payment:</b></span><span>${ord.paymentStatus || 'PENDING'}</span></div>
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

  const filtered = orders.filter((o) => {
    const s = (o.orderStatus || o.status || '').toUpperCase();
    const matchesFilter = filterStatus === 'ALL' || s === filterStatus || (filterStatus === 'NEW' && s === 'PENDING');
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.customerPhone?.includes(q);
    return matchesFilter && matchesSearch;
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
          <Badge variant="default" size="md">
            {orders.length} Total Orders
          </Badge>
        </div>
      </div>

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
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Delivery Date</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-owner-border">
                {filtered.map((ord) => {
                  const currentStatus = (ord.orderStatus || ord.status || 'NEW').toUpperCase();
                  const customerDigits = (ord.customerPhone || '').replace(/\D/g, '');

                  return (
                    <tr key={ord.id} className="hover:bg-owner-canvas/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="font-bold text-brand-plum hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          #{ord.orderNumber}
                        </button>
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
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-owner-heading">{ord.deliveryDate || '-'}</p>
                        <p className="text-[10px] text-owner-muted">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-owner-heading">₹{Number(ord.totalAmount).toLocaleString('en-IN')}</p>
                        <span className={`text-[10px] font-semibold uppercase ${
                          (ord.paymentStatus || '').toUpperCase() === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {ord.paymentStatus || 'PENDING'}
                        </span>
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
        </Card>
      )}

      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.orderNumber}`}
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <span className="text-[10px] text-owner-muted font-medium">Status</span>
                <div className="mt-1">
                  <StatusBadge status={(selectedOrder.orderStatus || selectedOrder.status) as OrderStatus} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <span className="text-[10px] text-owner-muted font-medium">Payment</span>
                <p className="mt-1 font-bold text-owner-heading uppercase">
                  {selectedOrder.paymentStatus || 'PENDING'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <span className="text-[10px] text-owner-muted font-medium">Delivery Date</span>
                <p className="mt-1 font-bold text-owner-heading">
                  {selectedOrder.deliveryDate || 'Standard'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-owner-canvas border border-owner-border">
                <span className="text-[10px] text-owner-muted font-medium">Total Amount</span>
                <p className="mt-1 font-bold text-brand-plum text-sm">
                  ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-owner-border space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-sm text-owner-heading">Customer Information</h4>
                {selectedOrder.customerPhone && (
                  <a
                    href={`https://wa.me/91${selectedOrder.customerPhone.replace(/\D/g, '').slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp Customer
                  </a>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-owner-muted">
                <p className="flex items-center gap-2">
                  <span className="font-medium text-owner-heading">{selectedOrder.customerName || 'Guest'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-owner-muted" />
                  <span>{selectedOrder.customerPhone || 'No phone provided'}</span>
                </p>
                <p className="flex items-center gap-2 sm:col-span-2">
                  <Mail className="w-3.5 h-3.5 text-owner-muted" />
                  <span>{selectedOrder.customerEmail || 'No email provided'}</span>
                </p>
                <p className="flex items-start gap-2 sm:col-span-2">
                  <MapPin className="w-3.5 h-3.5 text-owner-muted shrink-0 mt-0.5" />
                  <span>{selectedOrder.deliveryAddress || 'Self Pickup from Bakery'}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-serif font-bold text-sm text-owner-heading">Celebration Cakes & Items</h4>
              <div className="border border-owner-border rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted">
                      <th className="py-2.5 px-3">Item Details</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-owner-border">
                    {(selectedOrder.items && selectedOrder.items.length > 0) ? (
                      selectedOrder.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3">
                            <p className="font-bold text-owner-heading">{it.productName || it.productNameSnapshot || 'Artisan Cake'}</p>
                            {(it.cakeMessage || it.customMessage) && (
                              <p className="text-[11px] text-brand-plum italic mt-0.5">
                                Message: &ldquo;{it.cakeMessage || it.customMessage}&rdquo;
                              </p>
                            )}
                            {it.dietaryPreference && (
                              <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                                {it.dietaryPreference}
                              </span>
                            )}
                            {it.photoReferenceUrl && (
                              <div className="mt-2 flex items-center gap-2">
                                <img src={it.photoReferenceUrl} alt="Design reference" className="w-12 h-12 object-cover rounded-lg border border-owner-border" />
                                <span className="text-[10px] text-owner-muted">Customer reference photo</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold">{it.quantity}</td>
                          <td className="py-3 px-3">₹{it.unitPrice}</td>
                          <td className="py-3 px-3 text-right font-bold">₹{it.quantity * it.unitPrice}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 px-3 text-center text-owner-muted">
                          Celebration cake order (Total: ₹{selectedOrder.totalAmount})
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-owner-canvas border border-owner-border space-y-2">
              <span className="text-[11px] font-bold text-owner-heading block">Update Order Status:</span>
              <div className="flex flex-wrap gap-2">
                {ALL_STATUSES.map((s) => {
                  const currentStatus = (selectedOrder.orderStatus || selectedOrder.status || '').toUpperCase();
                  const isCurrent = currentStatus === s;
                  return (
                    <button
                      key={s}
                      disabled={updatingId === selectedOrder.id}
                      onClick={() => handleStatusChange(selectedOrder.id, s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-brand-plum text-white shadow-soft'
                          : 'bg-white text-owner-heading border border-owner-border hover:border-brand-plum/50'
                      }`}
                    >
                      {STATUS_LABELS[s] || s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-owner-border flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintKOT(selectedOrder)}
                className="gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Kitchen Ticket (KOT)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadInvoice(selectedOrder)}
                  disabled={downloadingId === selectedOrder.id}
                  className="gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Invoice
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