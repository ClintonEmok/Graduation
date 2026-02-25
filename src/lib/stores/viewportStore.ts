/**
 * Viewport store for timeline-based crime data fetching.
 * Uses fine-grained selectors to prevent full-app re-renders.
 * 
 * Key pattern: Components subscribe to specific slices of state,
 * not the entire store. This prevents cascade re-renders when
 * unrelated state changes.
 */
import { create } from 'zustand'

// Crime data types
export interface CrimeFilters {
  crimeTypes: string[]
  districts: string[]
}

export interface ViewportState {
  // Viewport bounds (epoch seconds)
  startDate: number
  endDate: number
  zoom: number
  
  // Filter state
  filters: CrimeFilters
  
  // Actions
  setStartDate: (date: number) => void
  setEndDate: (date: number) => void
  setViewport: (start: number, end: number) => void
  setZoom: (zoom: number) => void
  setCrimeTypes: (crimeTypes: string[]) => void
  setDistricts: (districts: string[]) => void
  setFilters: (filters: Partial<CrimeFilters>) => void
}

// Default state: start with first year (2001) for better initial load performance
// Full date range is 2001-2026
const DEFAULT_START_DATE = 978307200  // 2001-01-01T00:00:00Z
const DEFAULT_END_DATE = 1011878400   // 2002-01-01T00:00:00Z (one year later)

export const useViewportStore = create<ViewportState>((set) => ({
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  zoom: 0.5,
  filters: {
    crimeTypes: [],
    districts: [],
  },
  
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setViewport: (startDate, endDate) => set({ startDate, endDate }),
  setZoom: (zoom) => set({ zoom }),
  setCrimeTypes: (crimeTypes) => set((state) => ({ 
    filters: { ...state.filters, crimeTypes } 
  })),
  setDistricts: (districts) => set((state) => ({ 
    filters: { ...state.filters, districts } 
  })),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
}))

// Fine-grained selectors - each returns primitives or specific shapes
// These selectors ensure components only re-render when their specific data changes

/**
 * Returns zoom level only.
 * Component re-renders only when zoom changes.
 */
export const useViewportZoom = () => 
  useViewportStore((state) => state.zoom)

/**
 * Returns crime filters only.
 * Component re-renders only when crimeTypes OR districts change.
 */
export const useCrimeFilters = () => 
  useViewportStore((state) => state.filters)

/**
 * Returns start date only.
 * Component re-renders only when startDate changes.
 */
export const useViewportStart = () => 
  useViewportStore((state) => state.startDate)

/**
 * Returns end date only.
 * Component re-renders only when endDate changes.
 */
export const useViewportEnd = () => 
  useViewportStore((state) => state.endDate)

/**
 * Returns crime types array only.
 * Component re-renders only when crimeTypes changes.
 */
export const useCrimeTypes = () => 
  useViewportStore((state) => state.filters.crimeTypes)

/**
 * Returns districts array only.
 * Component re-renders only when districts changes.
 */
export const useDistricts = () => 
  useViewportStore((state) => state.filters.districts)
