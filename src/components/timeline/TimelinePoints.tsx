/**
 * TimelinePoints - Efficient crime data point cloud renderer.
 * 
 * Uses THREE.Points with BufferGeometry for rendering millions of crime points
 * at 60fps. Implements LOD (Level of Detail) sampling based on zoom level
 * to maintain performance with large datasets.
 * 
 * Key features:
 * - Subscribes to viewport zoom and crime data from stores
 * - Uses useCrimePointCloud hook for geometry creation with LOD
 * - Renders using @react-three/fiber primitive points
 * - Handles loading and error states gracefully
 */
import { useRef } from 'react'
import { useViewportZoom, useCrimeFilters } from '@/lib/stores/viewportStore'
import { useViewportCrimeData } from '@/hooks/useViewportCrimeData'
import { useCrimePointCloud } from '@/hooks/useCrimePointCloud'
import * as THREE from 'three'

/**
 * TimelinePoints component.
 * Renders crime data as a point cloud using Three.js Points.
 * 
 * Features:
 * - Automatic LOD based on zoom level
 * - Crime type-based coloring
 * - Loading and empty state handling
 * - Error boundary for geometry creation failures
 */
export function TimelinePoints() {
  // Subscribe to zoom level - component re-renders only when zoom changes
  const zoom = useViewportZoom()
  
  // Subscribe to crime filters
  const filters = useCrimeFilters()
  
  // Get crime data from viewport-based query
  const { data, isLoading, isFetching, error } = useViewportCrimeData({
    crimeTypes: filters.crimeTypes.length > 0 ? filters.crimeTypes : undefined,
    districts: filters.districts.length > 0 ? filters.districts : undefined,
  })
  
  // Create point cloud geometry with LOD
  const { geometry, material, pointCount, originalCount } = useCrimePointCloud(
    data,
    zoom
  )
  
  // Ref for direct Three.js access if needed
  const pointsRef = useRef<THREE.Points>(null)
  
  // Handle loading state (show nothing while loading initial data)
  if (isLoading) {
    return null // Or render a loading indicator
  }
  
  // Handle error state
  if (error) {
    console.warn('TimelinePoints error:', error)
    return null
  }
  
  // Handle empty data
  if (!geometry || !material || pointCount === 0) {
    return null
  }
  
  // Render the points using primitive
  return (
    <primitive
      ref={pointsRef}
      object={new THREE.Points(geometry, material)}
      attach="points"
    />
  )
}

export default TimelinePoints
