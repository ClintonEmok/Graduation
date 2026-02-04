'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useFeatureFlagsStore } from '@/store/useFeatureFlagsStore';
import { FLAG_DEFINITIONS } from '@/lib/feature-flags';

export function useURLFeatureFlags() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [urlFlags, setUrlFlags] = useState<Record<string, boolean> | null>(null);
  
  const applyURLFlags = useFeatureFlagsStore((state) => state.applyURLFlags);
  const flags = useFeatureFlagsStore((state) => state.flags);

  // Parse flags from URL on mount
  useEffect(() => {
    const flagsParam = searchParams.get('flags');
    if (!flagsParam) return;
    
    try {
      const parsed = JSON.parse(atob(flagsParam));
      
      // Validate: only include known flag IDs
      const validFlagIds = new Set(FLAG_DEFINITIONS.map((f) => f.id));
      const validFlags: Record<string, boolean> = {};
      let hasValidFlags = false;
      
      for (const [key, value] of Object.entries(parsed)) {
        if (validFlagIds.has(key) && typeof value === 'boolean') {
          validFlags[key] = value;
          hasValidFlags = true;
        }
      }
      
      if (hasValidFlags) {
        // Check if URL flags differ from current
        const hasDifferences = Object.entries(validFlags).some(
          ([key, value]) => flags[key] !== value
        );
        
        if (hasDifferences) {
          setUrlFlags(validFlags);
          setShowConflictDialog(true);
        }
      }
    } catch {
      // Invalid base64 or JSON, silently ignore
      console.warn('Invalid flags parameter in URL');
    }
  }, [searchParams, flags]);

  // Apply URL flags (called when user confirms)
  const confirmURLFlags = useCallback(() => {
    if (urlFlags) {
      applyURLFlags(urlFlags);
    }
    setShowConflictDialog(false);
    setUrlFlags(null);
    
    // Clear flags param from URL after applying
    const params = new URLSearchParams(searchParams.toString());
    params.delete('flags');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl);
  }, [urlFlags, applyURLFlags, searchParams, pathname, router]);

  // Reject URL flags (user cancels)
  const rejectURLFlags = useCallback(() => {
    setShowConflictDialog(false);
    setUrlFlags(null);
    
    // Clear flags param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('flags');
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl);
  }, [searchParams, pathname, router]);

  // Generate shareable URL with current flags
  const generateShareURL = useCallback(() => {
    const currentFlags = useFeatureFlagsStore.getState().flags;
    const encoded = btoa(JSON.stringify(currentFlags));
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('flags', encoded);
    
    return `${window.location.origin}${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  // Copy share URL to clipboard
  const copyShareURL = useCallback(async () => {
    const url = generateShareURL();
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      console.error('Failed to copy URL to clipboard');
      return false;
    }
  }, [generateShareURL]);

  return {
    showConflictDialog,
    urlFlags,
    confirmURLFlags,
    rejectURLFlags,
    generateShareURL,
    copyShareURL,
  };
}
