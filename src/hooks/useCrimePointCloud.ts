/**
 * Crime point cloud hook with Level-of-Detail (LOD) sampling.
 * Creates THREE.BufferGeometry optimized for rendering millions of points.
 * 
 * Key features:
 * - LOD sampling based on zoom level (reduces point count for performance)
 * - Crime type-based coloring using palette
 * - Efficient BufferGeometry with Float32Array attributes
 * - Uses useMemo to avoid unnecessary geometry regeneration
 */
import { useMemo } from 'react'
import * as THREE from 'three'
import { PALETTES, DEFAULT_THEME } from '@/lib/palettes'

/**
 * Crime point data structure for point cloud rendering.
 * Extracted from CrimeRecord with x,z coordinates for Three.js.
 */
export interface CrimePoint {
  timestamp: number
  lat: number
  lon: number
  x: number
  z: number
  type: string
}

/**
 * Result from useCrimePointCloud hook.
 * Contains the Three.js geometry and material for rendering.
 */
export interface CrimePointCloudResult {
  geometry: THREE.BufferGeometry | null
  material: THREE.PointsMaterial | null
  /** Number of points in the geometry after LOD sampling */
  pointCount: number
  /** Original data count before sampling */
  originalCount: number
}

/**
 * Convert a crime record to CrimePoint with x,z coordinates.
 * 
 * @param record - Crime record from API
 * @returns CrimePoint with x,z coordinates
 */
function recordToCrimePoint(record: {
  date: number
  latitude: number
  longitude: number
  type: string
}): CrimePoint {
  // Convert lat/lon to x,z coordinates for Three.js
  // Chicago bounds: lon -87.9 to -87.5, lat 41.6 to 42.1
  // Normalize to -500 to 500 range for each axis
  const MIN_LON = -87.9
  const MAX_LON = -87.5
  const MIN_LAT = 41.6
  const MAX_LAT = 42.1
  const RANGE = 1000 // -500 to 500

  const x = ((record.longitude - MIN_LON) / (MAX_LON - MIN_LON)) * RANGE - RANGE / 2
  const z = ((record.latitude - MIN_LAT) / (MAX_LAT - MIN_LAT)) * RANGE - RANGE / 2

  return {
    timestamp: record.date,
    lat: record.latitude,
    lon: record.longitude,
    x,
    z,
    type: record.type,
  }
}

/**
 * Get color for a crime type.
 * 
 * @param crimeType - Crime type string
 * @returns THREE.Color for the point
 */
function getCrimeTypeColor(crimeType: string): THREE.Color {
  const palette = PALETTES[DEFAULT_THEME]
  const normalized = crimeType.toUpperCase()
  
  // Try to find exact match first
  if (palette.categoryColors[normalized]) {
    return new THREE.Color(palette.categoryColors[normalized])
  }
  
  // Try partial match for common crime types
  const typeKey = Object.keys(palette.categoryColors).find(key => 
    normalized.includes(key) || key.includes(normalized)
  )
  
  if (typeKey) {
    return new THREE.Color(palette.categoryColors[typeKey])
  }
  
  // Default to white for unknown types
  return new THREE.Color(palette.categoryColors['OTHER'] || '#FFFFFF')
}

/**
 * Determine sample rate based on zoom level.
 * 
 * @param zoom - Current zoom level (0-1)
 * @returns Sample rate (1 = show all, 10 = every 10th, etc.)
 */
function getSampleRate(zoom: number): number {
  if (zoom < 0.3) {
    // Zoomed out: density heatmap mode - show 1% of points
    return 100
  } else if (zoom < 0.7) {
    // Medium zoom: show 10% of points
    return 10
  } else {
    // Zoomed in: show all points
    return 1
  }
}

/**
 * Hook to create THREE.BufferGeometry from crime data with LOD sampling.
 * 
 * @param data - Array of crime records
 * @param zoom - Current zoom level (0-1)
 * @returns Geometry and material for THREE.Points
 */
export function useCrimePointCloud(
  data: Array<{ id: string; date: number; type: string; latitude: number; longitude: number }> | undefined,
  zoom: number
): CrimePointCloudResult {
  return useMemo(() => {
    // Handle undefined or empty data
    if (!data || data.length === 0) {
      return {
        geometry: null,
        material: null,
        pointCount: 0,
        originalCount: 0,
      }
    }

    const originalCount = data.length
    const sampleRate = getSampleRate(zoom)
    
    // Apply LOD sampling
    const sampledData: CrimePoint[] = []
    for (let i = 0; i < data.length; i += sampleRate) {
      const record = data[i]
      sampledData.push(recordToCrimePoint(record))
    }

    const pointCount = sampledData.length

    // If no points after sampling, return empty result
    if (pointCount === 0) {
      return {
        geometry: null,
        material: null,
        pointCount: 0,
        originalCount,
      }
    }

    // Create position array (x, y, z for each point)
    const positions = new Float32Array(pointCount * 3)
    
    // Create color array (r, g, b for each point)
    const colors = new Float32Array(pointCount * 3)

    // Fill positions and colors
    sampledData.forEach((point, i) => {
      // Position: x, y (0), z
      // We use y=0 for a flat 2D projection, or could use timestamp for 3D
      positions[i * 3] = point.x
      positions[i * 3 + 1] = 0 // Flat on y=0 plane
      positions[i * 3 + 2] = point.z

      // Color based on crime type
      const color = getCrimeTypeColor(point.type)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    })

    // Create BufferGeometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Determine point size based on zoom
    // Smaller when zoomed out, larger when zoomed in
    const size = zoom < 0.3 ? 1.5 : zoom < 0.7 ? 2 : 2.5

    // Create PointsMaterial with vertex colors
    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    })

    return {
      geometry,
      material,
      pointCount,
      originalCount,
    }
  }, [data, zoom])
}
