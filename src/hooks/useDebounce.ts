/**
 * Debounce hook for filter changes
 * Extracted from useSuggestionGenerator for reuse across components
 */
import { useState, useEffect, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const previousValueRef = useRef<T>(value);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    if (value !== previousValue) {
      previousValueRef.current = value;
      const timer = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, delay]);

  return debouncedValue;
}