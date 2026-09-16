'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Plus, Trash2, Clock, CheckCircle2, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
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

const DAYS_OF_WEEK = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

export default function OwnerDeliverySlotsPage() {
  const { registerRefreshHandler } = useOwner();
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  // Form fields
  const [dayOfWeek, setDayOfWeek] = useState('MONDAY');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('14:00');
  const [maxOrders, setMaxOrders] = useState('10');
  const [isActive, setIsActive] = useState(true);

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

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert('Start time must be before end time');
      return;
    }

    setIsSubmitting(true);
    try {
      await deliverySlotsApi.createSlot({
        dayOfWeek,
        startTime: startTime.length === 5 ? `${startTime}:00` : startTime,
        endTime: endTime.length === 5 ? `${endTime}:00` : endTime,
        maxOrders: Number(maxOrders) || 10,
        isActive,
      });
      setIsModalOpen(false);
      fetchSlots();
    } catch (err: any) {
      alert(err?.message || 'Failed to create delivery slot');
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
    } catch (err: any) {
      alert(err?.message || 'Failed to update slot status');
    }
  };

  const handleDeleteSlot = async (id: number) => {
    if (!confirm('Are you sure you want to remove this delivery window?')) return;
    try {
      await deliverySlotsApi.deleteSlot(id);
      fetchSlots();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete slot');
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
          <h1 className="font-serif font-bold text-2xl text-owner-heading">Delivery Windows & Capacity</h1>
          <p className="text-xs text-owner-muted mt-0.5">
            Define daily fulfillment windows and set maximum cake order capacities to manage kitchen workload
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> Add Delivery Window
        </Button>
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
          description="Create scheduled delivery windows (e.g. Morning 10 AM - 2 PM, max 8 orders) so customers can select slots at checkout."
          action={
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Delivery Window
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-owner-border bg-owner-canvas/40 text-owner-muted">
                  <th className="py-3.5 px-4">Day of Week</th>
                  <th className="py-3.5 px-4">Time Window</th>
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
                        <span className="font-bold text-owner-heading capitalize">
                          {s.dayOfWeek?.toLowerCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-owner-heading">
                          <Clock className="w-3.5 h-3.5 text-brand-plum" />
                          <span>{formatTimeStr(s.startTime)} – {formatTimeStr(s.endTime)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-owner-heading">
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
                        <button
                          onClick={() => handleDeleteSlot(s.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete delivery slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Slot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Configure Delivery Window"
      >
        <form onSubmit={handleCreateSlot} className="space-y-4 text-xs">
          <Select
            label="Day of the Week"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            options={DAYS_OF_WEEK}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time (24h)"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="End Time (24h)"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <Input
            label="Maximum Order Capacity"
            type="number"
            min="1"
            max="100"
            required
            placeholder="10"
            value={maxOrders}
            onChange={(e) => setMaxOrders(e.target.value)}
          />

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
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Delivery Window
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
