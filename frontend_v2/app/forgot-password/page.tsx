'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cake, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream-light font-sans p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-soft border border-brand-border/40">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-brand-plum text-white flex items-center justify-center shadow-soft">
              <Cake className="w-5 h-5" />
            </div>
            <span className="font-serif text-2xl font-bold text-brand-espresso">CakeStore</span>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-espresso tracking-tight mb-2">
            Forgot Password?
          </h2>
          <p className="text-sm text-brand-muted">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {error && <ErrorState message={error} className="text-left" />}

        {success ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-xl text-sm border border-green-200 flex flex-col items-center text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <p>If an account exists for this email, you&apos;ll receive a password reset link shortly.</p>
            <Link href="/login" className="mt-4 w-full">
              <Button variant="outline" className="w-full" size="sm">
                Return to Login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-brand-espresso">
                Email Address <span className="text-brand-crimson">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="email"
                  required
                  placeholder="owner@bakery.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm text-brand-espresso placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold shadow-soft transition-all active:scale-[0.99]"
              size="lg"
              isLoading={isLoading}
            >
              <span>Send Reset Link</span>
            </Button>
            
            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-plum hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
