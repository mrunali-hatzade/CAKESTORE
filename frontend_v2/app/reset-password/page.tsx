'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cake, Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { authApi } from '@/lib/api/auth';

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Parse token from fragment #token=...
    const hash = window.location.hash;
    if (hash && hash.startsWith('#token=')) {
      setToken(hash.substring(7));
    } else {
      setError('Invalid or missing reset token.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return null;
  }

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
            Reset Password
          </h2>
          <p className="text-sm text-brand-muted">
            Choose a new password for your account.
          </p>
        </div>

        {error && <ErrorState message={error} className="text-left" />}

        {success ? (
          <div className="bg-green-50 text-green-800 p-6 rounded-xl text-sm border border-green-200 flex flex-col items-center text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
            <div>
              <h3 className="font-bold text-lg mb-1">Password Reset Successful</h3>
              <p>Your password has been changed successfully.</p>
            </div>
            <Link href="/login" className="mt-4 w-full">
              <Button className="w-full h-12" size="lg">
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-brand-espresso">
                New Password <span className="text-brand-crimson">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-border bg-white text-sm text-brand-espresso placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-espresso transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-brand-espresso">
                Confirm New Password <span className="text-brand-crimson">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-border bg-white text-sm text-brand-espresso placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-plum/20 focus:border-brand-plum transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-espresso transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold shadow-soft transition-all active:scale-[0.99] mt-6"
              size="lg"
              isLoading={isLoading}
              disabled={!token}
            >
              <span>Reset Password</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
