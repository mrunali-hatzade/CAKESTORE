'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  UserCheck,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Plus,
  ArrowLeft,
  Smartphone
} from 'lucide-react';
import { sendAdminMessage, getAdminBroadcastHistory } from '@/lib/api/admin';
import { SentBroadcastRecord } from '@/types/admin';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/common/Toast';


export default function AdminMessagesPage() {
  const [broadcasts, setBroadcasts] = useState<SentBroadcastRecord[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [specificOwnerId, setSpecificOwnerId] = useState<string>('');
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    fetchHistory();

    const handleRefresh = () => {
      fetchHistory();
    };
    window.addEventListener('adminGlobalRefresh', handleRefresh);
    return () => {
      window.removeEventListener('adminGlobalRefresh', handleRefresh);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getAdminBroadcastHistory();
      setBroadcasts(data || []);
    } catch (err) {
      console.error('Failed to load broadcast history', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error('Please complete both the title and message fields');
      return;
    }

    if (targetType === 'SPECIFIC' && !specificOwnerId) {
      toast.error('Please specify a valid Owner User ID');
      return;
    }

    setIsSending(true);
    try {
      const response = await sendAdminMessage({
        title,
        message,
        specificOwnerId: targetType === 'SPECIFIC' ? Number(specificOwnerId) : null,
        sendEmail,
      });

      toast.success(response || 'Broadcast dispatched successfully. Processing in background.');

      // Reset form
      setTitle('');
      setMessage('');
      setSpecificOwnerId('');
      fetchHistory();
      setIsComposing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch broadcast');
    } finally {
      setIsSending(false);
    }
  };

  if (isComposing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setIsComposing(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to History
          </Button>
          <div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-slate-900">
              Compose Broadcast
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create a new announcement for bakery owners
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Form Controls */}
          <div>
            <Card className="p-6 border-slate-200 shadow-soft space-y-5">
              <form id="broadcast-form" onSubmit={handleSend} className="space-y-4">
                <Input
                  label="Announcement Title"
                  required
                  placeholder="e.g. Festival Surge Orders Preparation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Target Audience
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('ALL')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        targetType === 'ALL'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>All Owners</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetType('SPECIFIC')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        targetType === 'SPECIFIC'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Specific Owner</span>
                    </button>
                  </div>
                </div>

                {targetType === 'SPECIFIC' && (
                  <Input
                    label="Owner User ID"
                    type="number"
                    required
                    placeholder="e.g. 5"
                    value={specificOwnerId}
                    onChange={(e) => setSpecificOwnerId(e.target.value)}
                    helperText="User ID of the bakery owner registered in the database."
                  />
                )}

                <Textarea
                  label="Broadcast Message Body"
                  required
                  rows={4}
                  placeholder="Write your platform announcement or operational alert here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="sendEmail" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dispatch Email Copy to Owner Inbox</span>
                  </label>
                </div>
              </form>
            </Card>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setIsComposing(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="broadcast-form"
                variant="primary"
                disabled={isSending}
                className="bg-indigo-600 hover:bg-indigo-700 border-indigo-700 gap-2"
              >
                <Send className={`w-4 h-4 ${isSending ? 'animate-pulse' : ''}`} />
                <span>{isSending ? 'Dispatching...' : 'Dispatch Broadcast'}</span>
              </Button>
            </div>
          </div>

          {/* Right Column: Live Preview */}
          <div>
            <Card className="p-6 border-slate-200 shadow-soft bg-slate-50/50 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-slate-500" />
                <h3 className="font-serif font-bold text-sm text-slate-700">Live Preview</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Megaphone className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="space-y-1 w-full">
                      <h4 className="text-sm font-bold text-slate-900 break-words">
                        {title || 'Your Title Here'}
                      </h4>
                      <p className="text-xs text-slate-600 break-words whitespace-pre-wrap">
                        {message || 'Your message content will appear here...'}
                      </p>
                      <p className="text-[10px] text-slate-400 pt-2">Just now</p>
                    </div>
                  </div>
                </div>

                {sendEmail && (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                    <div className="border-b border-slate-100 pb-2 mb-2">
                      <p className="text-[10px] text-slate-400">Subject: {title || 'Your Title Here'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-600 break-words whitespace-pre-wrap">
                        {message || 'Your email content will appear here...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-slate-900">
            Campaign Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            View history and dispatch new broadcasts to bakery owners
          </p>
        </div>
        <Button onClick={() => setIsComposing(true)} variant="primary" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          Compose Broadcast
        </Button>
      </div>

      {/* Main View: Broadcast History */}
      <Card className="border-slate-200 shadow-soft overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Broadcast History
          </h3>
          <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
            {broadcasts.length} total
          </span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {broadcasts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No broadcasts have been dispatched yet.
            </div>
          ) : (
            broadcasts.map((bcast) => (
              <div key={bcast.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 max-w-3xl">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-sm text-slate-900">{bcast.title}</h4>
                      <Badge variant="default" className="text-[10px] bg-white">
                        {bcast.targetType === 'SPECIFIC' ? `Owner User #${bcast.targetOwnerId}` : 'All Bakery Owners'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {bcast.message}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div className="space-y-1">
                      <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Delivered
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {new Date(bcast.sentAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
