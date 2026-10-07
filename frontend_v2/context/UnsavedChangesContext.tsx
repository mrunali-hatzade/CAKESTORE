'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface UnsavedChangesContextType {
  setDirty: (formId: string, isDirty: boolean) => void;
  isDirty: boolean;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  setDirty: () => {},
  isDirty: false,
});

export const useUnsavedChanges = () => useContext(UnsavedChangesContext);

export const UnsavedChangesProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(new Set());
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const isDirty = dirtyForms.size > 0;

  const setDirty = useCallback((formId: string, dirty: boolean) => {
    setDirtyForms(prev => {
      const next = new Set(prev);
      if (dirty) next.add(formId);
      else next.delete(formId);
      return next;
    });
  }, []);

  // 1. Native beforeunload protection
  useEffect(() => {
    if (!isDirty) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Required for standard browser prompt
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 2. Global Soft-Navigation Interception for Next.js Links
  useEffect(() => {
    if (!isDirty) return;

    const handleClick = (e: MouseEvent) => {
      // Ignore modifier clicks (open in new tab)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

      // Find closest anchor tag
      const target = (e.target as HTMLElement).closest('a');
      if (!target || !target.href) return;

      // Ignore external links, mailto, or download links
      const href = target.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || target.hasAttribute('download')) {
        return;
      }

      // Ignore if it's the exact same pathname/search
      const url = new URL(target.href);
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      // It's an internal link navigation - intercept it
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigation(href);
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [isDirty]);

  const handleStay = () => {
    setPendingNavigation(null);
  };

  const handleDiscard = () => {
    const href = pendingNavigation;
    setPendingNavigation(null);
    setDirtyForms(new Set()); // Clear dirty state
    
    if (href) {
      router.push(href);
    }
  };

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, isDirty }}>
      {children}
      <Modal
        isOpen={!!pendingNavigation}
        onClose={handleStay}
        title="Unsaved Changes"
      >
        <div className="space-y-6">
          <p className="text-sm text-owner-muted leading-relaxed">
            You have unsaved changes. Are you sure you want to leave? Your changes will be permanently lost.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleStay}>
              Stay on Page
            </Button>
            <Button variant="danger" onClick={handleDiscard}>
              Discard Changes
            </Button>
          </div>
        </div>
      </Modal>
    </UnsavedChangesContext.Provider>
  );
};
