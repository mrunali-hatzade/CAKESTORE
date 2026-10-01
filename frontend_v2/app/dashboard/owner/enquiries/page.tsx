'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OwnerEnquiriesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/owner/custom-cakes');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-plum border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
