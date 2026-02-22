'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

/**
 * QueryProvider wraps the application with TanStack Query's client.
 * 
 * Default caching configuration:
 * - staleTime: 5 minutes (data considered fresh for 5 min)
 * - gcTime: 10 minutes (unused data cached for 10 min)
 * - refetchOnWindowFocus: false (prevent unwanted refetches)
 */
interface QueryProviderProps {
  children: ReactNode
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
