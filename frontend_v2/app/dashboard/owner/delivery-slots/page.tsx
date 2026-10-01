'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit2,
  ShieldCheck,
  Layers,
  Activity,
} from 'lucide-react';
import { deliverySlotsApi } from '@/lib/api/deliverySlots';
import { DeliverySlot } from '@/types/deliverySlot';
import { useOwner } from '@/context/OwnerContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/common/Toast';

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

/** Formats 24h time strings (e.g. "14:00:00" or "14:00") into 12-hour AM/PM format (e.g. "2:00 PM") */
function formatTo12Hour(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export default function OwnerDeliverySlotsPage() {
  const toast = useToast();
  const { registerRefreshHandler } = useOwner();
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<DeliverySlot | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  // Form fields
  const [dayOfWeek, setDayOfWeek] = useState('MONDAY');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('14:00');
  const [maxOrders, setMaxOrders] = useState('10');
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setEditingSlot(null);
    setFormError(null);
    setDayOfWeek('MONDAY');
    setStartTime('10:00');
    setEndTime('14:00');
    setMaxOrders('10');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (slot: DeliverySlot) => {
    setEditingSlot(slot);
    setFormError(null);
    setDayOfWeek((slot.dayOfWeek || 'MONDAY').toUpperCase());
    setStartTime((slot.startTime || '10:00').substring(0, 5));
    setEndTime((slot.endTime || '14:00').substring(0, 5));
    setMaxOrders(String(slot.maxOrders || slot.maxOrdersPerDay || 10));
    setIsActive(slot.isActive !== false);
    setIsModalOpen(true);
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedDeliverySlotsExample = async () => {
    setIsSeeding(true);
    try {
      await deliverySlotsApi.createSlot({
        name: 'Morning Rush (Example)',
        dayOfWeek: 'MONDAY',
        startTime: '09:00:00',
        endTime: '12:00:00',
        maxOrders: 10,
        isActive: false
      });
      toast.success('Example delivery slot generated!');
      await fetchSlots();
    } catch (err: any) {
      toast.error('Failed to generate example: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSeeding(false);
    }
  };

  const fetchSlots = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await deliverySlotsApi.getOwnerSlots();
      // Sort chronologically by day of week then time
      const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const sorted = (data || []).sort((a, b) => {
        const diff = dayOrder.indexOf(a.dayOfWeek?.toUpperCase()) - dayOrder.indexOf(b.dayOfWeek?.toUpperCase());
        if (diff !== 0) return diff;
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
      setSlots(sorted);
    } catch {
      setSlots([]);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    const unregister = registerRefreshHandler(async () => {
      await fetchSlots(true);
    });
    return unregister;
  }, [registerRefreshHandler, fetchSlots]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalSlots = slots.length;
    const activeSlots = slots.filter((s) => s.isActive).length;
    const uniqueDaysCovered = new Set(
      slots.filter((s) => s.isActive).map((s) => s.dayOfWeek?.toUpperCase())
    ).size;

    // Calculate maximum daily capacity across any single day
    const dayTotals: Record<string, number> = {};
    slots
      .filter((s) => s.isActive)
      .forEach((s) => {
        const day = s.dayOfWeek?.toUpperCase() || 'OTHER';
        dayTotals[day] = (dayTotals[day] || 0) + (Number(s.maxOrders) || 10);
      });
    const peakDailyCapacity = Object.values(dayTotals).length > 0 ? Math.max(...Object.values(dayTotals)) : 0;

    return {
      totalSlots,
      activeSlots,
      uniqueDaysCovered,
      peakDailyCapacity,
    };
  }, [slots]);

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (startTime >= endTime) {
      setFormError('Start time must be earlier than end time');
      return;
    }

    const orderCap = Number(maxOrders);
    if (!orderCap || orderCap <= 0) {
      setFormError('Capacity limit must be at least 1 order');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        dayOfWeek,
        startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
        endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
        maxOrders: orderCap,
        isActive,
      };

      if (editingSlot) {
        await deliverySlotsApi.updateSlot(editingSlot.id, payload);
        toast.success('Delivery window updated successfully!');
      } else {
        await deliverySlotsApi.createSlot(payload);
        toast.success('New delivery window published!');
      }

      setIsModalOpen(false);
      setEditingSlot(null);
      fetchSlots(true);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save delivery slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (slot: DeliverySlot) => {
    try {
      const newStatus = !slot.isActive;
      await deliverySlotsApi.toggleSlotStatus(slot.id, newStatus);
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, isActive: newStatus } : s))
      );
      toast.success(newStatus ? 'Delivery window activated' : 'Delivery window paused');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update slot status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSlot) return;
    setIsDeleting(true);
    try {
      await deliverySlotsApi.deleteSlot(deletingSlot.id);
      toast.success('Delivery window removed successfully');
      setDeletingSlot(null);
      fetchSlots(true);
    } catch (err: any) {
      toast.error(err?.message || 'Cannot delete slot. It may be linked to existing orders.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading bakery delivery schedules..." />;

  const filteredSlots = selectedDayFilter === 'ALL'
    ? slots
    : slots.filter((s) => s.dayOfWeek?.toUpperCase() === selectedDayFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-blush text-brand-plum text-[11px] font-semibold mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Kitchen Workload & Fulfillment Control</span>
          </div>
          <h1 className="font-serif font-bold text-2xl text-owner-heading">Delivery Windows & Capacity</h1>
          <p className="text-xs text-owner-muted mt-0.5">
            Define daily fulfillment windows and set maximum cake order capacities to prevent kitchen overload.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button onClick={handleSeedDeliverySlotsExample} isLoading={isSeeding} size="sm" variant="outline" className="text-brand-plum border-brand-plum/30 hover:bg-brand-cream hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Example
          </Button>
          <Button onClick={openCreateModal} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Delivery Window
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-white border-brand-border/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-blush text-brand-plum flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-owner-muted font-medium block">Total Windows</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-owner-heading">{kpis.totalSlots}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">({kpis.activeSlots} active)</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-brand-border/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-owner-muted font-medium block">Days Covered</span>
            <span className="text-lg font-bold text-owner-heading">
              {kpis.uniqueDaysCovered} <span className="text-xs font-normal text-owner-muted">/ 7 Days</span>
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-brand-border/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-owner-muted font-medium block">Peak Daily Capacity</span>
            <span className="text-lg font-bold text-owner-heading">
              {kpis.peakDailyCapacity} <span className="text-xs font-normal text-owner-muted">cakes/day</span>
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-brand-border/70 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-owner-muted font-medium block">Overbooking Protection</span>
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" /> Live Enforced
            </span>
          </div>
        </Card>
      </div>

      {/* Day Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedDayFilter('ALL')}
          className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
            selectedDayFilter === 'ALL'
              ? 'bg-brand-plum text-white border-brand-plum shadow-soft'
              : 'bg-white text-owner-muted border-owner-border hover:border-brand-plum/40 hover:text-owner-heading'
          }`}
        >
          All Days ({slots.length})
        </button>
        {DAYS_OF_WEEK.map((d) => {
          const count = slots.filter((s) => s.dayOfWeek?.toUpperCase() === d.value).length;
          return (
            <button
              key={d.value}
              onClick={() => setSelectedDayFilter(d.value)}
              className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-semibold border transition-all cursor-pointer ${
                selectedDayFilter === d.value
                  ? 'bg-brand-plum text-white border-brand-plum shadow-soft'
                  : 'bg-white text-owner-muted border-owner-border hover:border-brand-plum/40 hover:text-owner-heading'
              }`}
            >
              {d.label} {count > 0 ? `(${count})` : ''}
            </button>
          );
        })}
      </div>

      {filteredSlots.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-6 h-6" />}
          title={selectedDayFilter === 'ALL' ? 'No Delivery Slots Configured' : `No Slots for ${selectedDayFilter}`}
          description="Create scheduled delivery windows (e.g. Morning 10:00 AM – 2:00 PM, max 10 orders) so customers can select slots at checkout."
          action={
            <Button onClick={openCreateModal} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Delivery Window
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden shadow-soft border-brand-border/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Day of Week</th>
                  <th className="py-3.5 px-4">Fulfillment Window</th>
                  <th className="py-3.5 px-4">Order Capacity Limit</th>
                  <th className="py-3.5 px-4">Availability</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-owner-border">
                {filteredSlots.map((s) => {
                  const formatTimeStr = (t?: string) => (t ? t.substring(0, 5) : '--:--');
                  return (
                    <tr key={s.id} className="hover:bg-owner-canvas/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-owner-heading capitalize text-xs">
                          {s.dayOfWeek?.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-owner-heading">
                            <Clock className="w-3.5 h-3.5 text-brand-plum shrink-0" />
                            <span>
                              {formatTo12Hour(s.startTime)} – {formatTo12Hour(s.endTime)}
                            </span>
                          </div>
                          <span className="text-[10px] text-owner-muted block pl-5">
                            24h: {formatTimeStr(s.startTime)} – {formatTimeStr(s.endTime)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-owner-heading">
                          Max {s.maxOrders || s.maxOrdersPerDay || 10} orders
                        </span>
                        <span className="text-[10px] text-owner-muted block mt-0.5">per delivery window</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className="flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to toggle availability"
                        >
                          <Badge variant={s.isActive ? 'success' : 'default'} size="sm">
                            {s.isActive ? 'Active Window' : 'Paused / Inactive'}
                          </Badge>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 text-owner-muted hover:text-brand-plum hover:bg-brand-blush/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit delivery window"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSlot(s)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete delivery slot"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Slot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSlot(null);
          setFormError(null);
        }}
        maxWidth="2xl"
        title={editingSlot ? 'Edit Delivery Window' : 'Configure Delivery Window'}
        description="Set your fulfillment schedule and maximum cake orders per delivery window."
      >
        <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Day of the Week"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              options={DAYS_OF_WEEK}
            />

            <Input
              label="Maximum Order Capacity"
              type="number"
              min="1"
              max="100"
              required
              placeholder="10"
              value={maxOrders}
              onChange={(e) => setMaxOrders(e.target.value)}
              helperText="Cap orders to avoid kitchen overload"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Start Time (24h)"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <span className="text-[10px] text-owner-muted mt-1 block">
                Preview: {formatTo12Hour(startTime)}
              </span>
            </div>
            <div>
              <Input
                label="End Time (24h)"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <span className="text-[10px] text-owner-muted mt-1 block">
                Preview: {formatTo12Hour(endTime)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveSlot"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded text-brand-plum focus:ring-brand-plum cursor-pointer"
            />
            <label htmlFor="isActiveSlot" className="font-semibold text-owner-heading cursor-pointer">
              Enable this slot immediately on live checkout
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-owner-border">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingSlot(null);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingSlot ? 'Save Changes' : 'Save Delivery Window'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingSlot)}
        onClose={() => setDeletingSlot(null)}
        maxWidth="md"
        title="Remove Delivery Window?"
        description="Are you sure you want to remove this fulfillment window?"
      >
        <div className="space-y-4 text-xs">
          {deletingSlot && (
            <div className="p-3.5 rounded-2xl bg-brand-cream-light/60 border border-brand-border/60 space-y-1">
              <p className="font-bold text-owner-heading capitalize text-sm">
                {deletingSlot.dayOfWeek?.toLowerCase()} Window
              </p>
              <p className="text-owner-muted text-xs">
                {formatTo12Hour(deletingSlot.startTime)} – {formatTo12Hour(deletingSlot.endTime)} • Max {deletingSlot.maxOrders} orders
              </p>
            </div>
          )}

          <p className="text-owner-muted leading-relaxed">
            Customers will no longer be able to select this window for future orders. If there are active orders attached to this slot, the system will prevent deletion and advise you to pause it instead.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-owner-border">
            <Button variant="ghost" onClick={() => setDeletingSlot(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
