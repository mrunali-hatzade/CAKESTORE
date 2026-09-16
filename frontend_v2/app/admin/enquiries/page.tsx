'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  Search,
  Filter,
  Check,
  User,
  Phone,
  Calendar,
  Inbox,
  RefreshCw,
  Eye,
  Reply,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { communicationApi } from '@/lib/api/communication';
import { ContactEnquiry } from '@/types/communication';

export default function AdminContactEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeModalEnquiry, setActiveModalEnquiry] = useState<ContactEnquiry | null>(null);

  const fetchEnquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await communicationApi.getContactEnquiries();
      setEnquiries(data || []);
    } catch {
      setEnquiries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleMarkRead = async (id: string | number) => {
    await communicationApi.markContactEnquiryRead(id);
    setEnquiries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
    if (activeModalEnquiry?.id === id) {
      setActiveModalEnquiry((prev) => (prev ? { ...prev, isRead: true } : null));
    }
  };

  const formatDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime())
        ? 'N/A'
        : d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
    } catch {
      return 'N/A';
    }
  };

  const formatDateTime = (dateVal?: string | Date | null) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime())
        ? 'N/A'
        : d.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
    } catch {
      return 'N/A';
    }
  };

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((item) => {
      if (selectedFilter === 'UNREAD' && item.isRead) return false;
      if (selectedFilter === 'READ' && !item.isRead) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesEmail = (item.email || '').toLowerCase().includes(q);
        const matchesSubj = (item.subject || '').toLowerCase().includes(q);
        const matchesMsg = (item.message || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesSubj && !matchesMsg) return false;
      }
      return true;
    });
  }, [enquiries, selectedFilter, searchQuery]);

  const unreadCount = useMemo(() => {
    return enquiries.filter((e) => !e.isRead).length;
  }, [enquiries]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif font-bold text-2xl text-slate-900">
              Contact Enquiries
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customer inquiries, partnerships, and visitor support messages from the public Contact Us page
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchEnquiries}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter and Search Toolbar */}
      <Card className="p-4 border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                selectedFilter === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All ({enquiries.length})
            </button>
            <button
              onClick={() => setSelectedFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                selectedFilter === 'UNREAD'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setSelectedFilter('READ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                selectedFilter === 'READ'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Read
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </Card>

      {/* Enquiries List Table / Cards */}
      {isLoading ? (
        <LoadingState message="Loading contact enquiries..." />
      ) : filteredEnquiries.length === 0 ? (
        <Card className="p-12 text-center border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Contact Enquiries</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No enquiries match your search criteria.'
              : 'Messages submitted via the public Contact Us page will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEnquiries.map((e) => (
            <Card
              key={e.id}
              className={`p-5 border transition-all ${
                !e.isRead
                  ? 'border-indigo-200 bg-indigo-50/15 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="font-bold text-sm text-slate-900">{e.subject}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        e.isRead
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {e.isRead ? 'Read' : 'Unread'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {e.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <User className="w-3.5 h-3.5" />
                      {e.name}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      {e.email}
                    </span>
                    {e.phone && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        {e.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(e.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!e.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkRead(e.id)}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Mark Read
                    </Button>
                  )}
                  <a
                    href={`mailto:${e.email}?subject=Re: ${encodeURIComponent(e.subject)}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply via Email</span>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveModalEnquiry(e);
                      if (!e.isRead) handleMarkRead(e.id);
                    }}
                    className="text-xs gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {activeModalEnquiry && (
        <Modal
          isOpen={!!activeModalEnquiry}
          onClose={() => setActiveModalEnquiry(null)}
          title="Contact Enquiry"
        >
          <div className="space-y-4 pt-1">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {activeModalEnquiry.subject}
              </h3>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{activeModalEnquiry.name}</span>
                <span>•</span>
                <span className="text-indigo-600">{activeModalEnquiry.email}</span>
                {activeModalEnquiry.phone && (
                  <>
                    <span>•</span>
                    <span>{activeModalEnquiry.phone}</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                {activeModalEnquiry.message}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Received: {formatDateTime(activeModalEnquiry.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${activeModalEnquiry.email}?subject=Re: ${encodeURIComponent(
                    activeModalEnquiry.subject
                  )}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply via Email</span>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModalEnquiry(null)}
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
