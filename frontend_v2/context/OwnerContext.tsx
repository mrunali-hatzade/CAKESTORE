'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { ShopSettings } from '@/types/owner';
import { ownerApi } from '@/lib/api/owner';
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
}

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export function OwnerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'refreshing' | 'updated' | 'error'>('idle');
  const [refreshError, setRefreshError] = useState<string | null>(null);

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

  // Initial authoritative shop fetch on authentication
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setIsLoadingShop(true);
      fetchShop().finally(() => setIsLoadingShop(false));
    } else if (!authLoading && !isAuthenticated) {
      setShop(null);
      setIsLoadingShop(false);
    }
  }, [authLoading, isAuthenticated, fetchShop]);

  const lastFocusRefreshRef = useRef<number>(0);

  // Throttled window focus / visibility listener: refreshes active page and shop without duplicate calls or loops
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const now = Date.now();
      // Throttle to at most once every 30 seconds
      if (now - lastFocusRefreshRef.current < 30000) return;
      lastFocusRefreshRef.current = now;

      fetchShop().catch(() => {});
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
  }, [isAuthenticated, authLoading, fetchShop]);

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
      // Execute the active page handler if present AND refresh authoritative shop profile
      const promises: Promise<any>[] = [fetchShop()];
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
  }, [isRefreshing, fetchShop]);

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
