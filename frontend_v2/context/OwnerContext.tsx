'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { ShopSettings } from '@/types/owner';
import { ownerApi } from '@/lib/api/owner';
import { notificationsApi } from '@/lib/api/notifications';
import { useAuth } from '@/lib/auth/AuthContext';

interface OwnerContextType {
  shop: ShopSettings | null;
  isLoadingShop: boolean;
  isRefreshing: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'updated' | 'error';
  refreshError: string | null;
  refreshDashboard: () => Promise<void>;
  refreshShop: () => Promise<ShopSettings | null>;
  updateShop: (newShop: ShopSettings) => void;
  registerRefreshHandler: (handler: () => Promise<void>) => () => void;
  pendingOrdersCount: number;
  pendingEnquiriesCount: number;
  pendingReviewsCount: number;
  refreshSidebarCounts: () => Promise<void>;
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'updated' | 'error'>('idle');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [pendingEnquiriesCount, setPendingEnquiriesCount] = useState<number>(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);

  // Active page-level refresh handler (e.g. registered by OwnerOverviewPage)
  const refreshHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const fetchShop = useCallback(async (): Promise<ShopSettings | null> => {
    try {
      const data = await ownerApi.getShopSettings();
      setShop(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const fetchSidebarCounts = useCallback(async () => {
    try {
      const summary = await notificationsApi.getUnreadSummary();
      const byType = summary?.byType || {};

      const newOrders = byType['NEW_ORDER'] || 0;
      const newEnquiries = (byType['CUSTOM_ORDER_REQUEST'] || 0) + (byType['NEW_ENQUIRY'] || 0);
      const newReviews = byType['NEW_FEEDBACK'] || 0;

      setPendingOrdersCount(newOrders);
      setPendingEnquiriesCount(newEnquiries);
      setPendingReviewsCount(newReviews);
    } catch {
      // Quiet background failure
    }
  }, []);

  // Initial authoritative shop fetch on authentication
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setIsLoadingShop(true);
      fetchShop().finally(() => setIsLoadingShop(false));
      fetchSidebarCounts();
    } else if (!authLoading && !isAuthenticated) {
      setShop(null);
      setIsLoadingShop(false);
      setPendingOrdersCount(0);
      setPendingEnquiriesCount(0);
      setPendingReviewsCount(0);
    }
  }, [authLoading, isAuthenticated, fetchShop, fetchSidebarCounts]);

  // Periodic live background poll for sidebar badges every 20s
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    const interval = setInterval(() => {
      fetchSidebarCounts();
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authLoading, fetchSidebarCounts]);

  const lastFocusRefreshRef = useRef<number>(0);

  // Throttled window focus / visibility listener: refreshes active page, counts and shop without duplicate calls or loops
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      // Throttle to at most once every 15 seconds
      if (now - lastFocusRefreshRef.current < 15000) return;
      lastFocusRefreshRef.current = now;

      fetchShop().catch(() => {});
      fetchSidebarCounts().catch(() => {});
      if (refreshHandlerRef.current) {
        refreshHandlerRef.current().catch(() => {});
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [isAuthenticated, authLoading, fetchShop, fetchSidebarCounts]);

  const updateShop = useCallback((newShop: ShopSettings) => {
    setShop(newShop);
  }, []);

  const registerRefreshHandler = useCallback((handler: () => Promise<void>) => {
    refreshHandlerRef.current = handler;
    return () => {
      if (refreshHandlerRef.current === handler) {
        refreshHandlerRef.current = null;
      }
    };
  }, []);

  const refreshDashboard = useCallback(async () => {
    if (isRefreshing) return; // Prevent concurrent repeated clicks
    setIsRefreshing(true);
    setRefreshStatus('refreshing');
    setRefreshError(null);

    try {
      // Execute the active page handler if present AND refresh authoritative shop profile and counts
      const promises: Promise<any>[] = [fetchShop(), fetchSidebarCounts()];
      if (refreshHandlerRef.current) {
        promises.push(refreshHandlerRef.current());
      }
      await Promise.all(promises);

      setRefreshStatus('updated');
      setTimeout(() => {
        setRefreshStatus('idle');
      }, 2500);
    } catch (err: any) {
      setRefreshStatus('error');
      setRefreshError(err?.message || 'Failed to refresh dashboard data');
      setTimeout(() => {
        setRefreshStatus('idle');
      }, 4000);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, fetchShop, fetchSidebarCounts]);

  return (
    <OwnerContext.Provider
      value={{
        shop,
        isLoadingShop,
        isRefreshing,
        refreshStatus,
        refreshError,
        refreshDashboard,
        refreshShop: fetchShop,
        updateShop,
        registerRefreshHandler,
        pendingOrdersCount,
        pendingEnquiriesCount,
        pendingReviewsCount,
        refreshSidebarCounts: fetchSidebarCounts,
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner(): OwnerContextType {
  const context = useContext(OwnerContext);
  if (!context) {
    throw new Error('useOwner must be used within an OwnerProvider');
  }
  return context;
}
