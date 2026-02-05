'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    // Reset classes
    root.classList.remove('dark', 'light');
    
    // Apply classes based on theme
    if (theme === 'dark' || theme === 'colorblind') {
      root.classList.add('dark');
    } else {
        root.classList.add('light');
    }
    
    // Set data attribute for specific overrides (e.g. colorblind specific UI tweaks)
    root.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
