'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type VendorWithLocation = {
  id: string
  business_name: string
  description: string
  cuisine_types: string[]
  logo_url?: string
  operational_status: 'offline' | 'live' | 'closing_soon'
  location?: {
    latitude: number
    longitude: number
    address?: string
    notes?: string
  }
  distance_miles?: number
}

// Utility functions outside component
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959 // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function SearchPage() {
  const [vendors, setVendors] = useState<VendorWithLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [showLiveOnly, setShowLiveOnly] = useState(false)

  const cuisineOptions = [
    'American', 'Mexican', 'Italian', 'Asian', 'BBQ', 
    'Seafood', 'Vegetarian', 'Vegan', 'Desserts', 'Coffee/Beverages'
  ]

  const fetchVendors = useCallback(async (userLat: number, userLng: number) => {
    setLoading(true)
    try {
      // Fetch all approved vendors
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, business_name, description, cuisine_types, logo_url')
        .eq('is_approved', true)
  
      if (vendorsError) throw vendorsError
  
      // Fetch all vendor statuses
      const { data: statusData, error: statusError } = await supabase
        .from('vendor_status')
        .select('vendor_id, operational_status, current_location_id')
  
      if (statusError) throw statusError
  
      // Create a map of vendor statuses for quick lookup
      const statusMap = new Map(
        statusData?.map(status => [status.vendor_id, status]) || []
      )
  
      // Fetch locations for vendors that are live or closing soon
      const vendorsWithLocation: VendorWithLocation[] = []
      
      for (const vendor of vendorsData || []) {
        const status = statusMap.get(vendor.id)
        if (!status) continue // Skip vendors without status
      
      let location: { latitude: number; longitude: number; address?: string; notes?: string } | undefined = undefined
      let distance: number | undefined = undefined

      if (status.current_location_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('latitude, longitude, address, notes')
          .eq('id', status.current_location_id)
          .single()

        if (locationData) {
          location = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            address: locationData.address || undefined,
            notes: locationData.notes || undefined,
          }
          // Calculate distance using Haversine formula
          distance = calculateDistance(
            userLat,
            userLng,
            locationData.latitude,
            locationData.longitude
          )
        }
      }

      vendorsWithLocation.push({
        id: vendor.id,
        business_name: vendor.business_name,
        description: vendor.description,
        cuisine_types: vendor.cuisine_types || [],
        logo_url: vendor.logo_url || undefined,
        operational_status: status.operational_status as 'offline' | 'live' | 'closing_soon',
        location,
        distance_miles: distance,
      })
    }

    // Sort by distance (live trucks first, then by distance)
    const sorted = vendorsWithLocation.sort((a, b) => {
      // Prioritize live/closing trucks
      const aIsLive = a.operational_status !== 'offline'
      const bIsLive = b.operational_status !== 'offline'
      
      if (aIsLive && !bIsLive) return -1
      if (!aIsLive && bIsLive) return 1
      
      // Then sort by distance
      const aDist = a.distance_miles ?? Infinity
      const bDist = b.distance_miles ?? Infinity
      return aDist - bDist
    })

    setVendors(sorted)
  } catch (error) {
    console.error('Error fetching vendors:', error)
  } finally {
    setLoading(false)
  }
}, [])

  const requestLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          fetchVendors(position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.error('Geolocation error:', error)
          // Default to Indianapolis if geolocation fails
          const defaultLocation = { lat: 39.7684, lng: -86.1581 }
          setUserLocation(defaultLocation)
          fetchVendors(defaultLocation.lat, defaultLocation.lng)
        }
      )
    } else {
      // Default location
      const defaultLocation = { lat: 39.7684, lng: -86.1581 }
      setUserLocation(defaultLocation)
      fetchVendors(defaultLocation.lat, defaultLocation.lng)
    }
  }, [fetchVendors])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  const toggleCuisine = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine))
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine])
    }
  }

  // Filter vendors based on selected criteria
  const filteredVendors = vendors.filter(vendor => {
    // Filter by live status
    if (showLiveOnly && vendor.operational_status === 'offline') {
      return false
    }

    // Filter by cuisine
    if (selectedCuisines.length > 0) {
      const hasMatchingCuisine = vendor.cuisine_types.some(type =>
        selectedCuisines.includes(type)
      )
      if (!hasMatchingCuisine) return false
    }

    return true
  })

  const statusConfig = {
    live: { label: 'Live Now', color: 'bg-green-500', textColor: 'text-green-700' },
    closing_soon: { label: 'Closing Soon', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
    offline: { label: 'Offline', color: 'bg-gray-400', textColor: 'text-gray-500' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🚚 FueledUp Food</h1>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Home
            </Link>
          </div>
          {userLocation && (
            <p className="text-sm text-gray-500 mt-1">
              📍 Searching near {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          
          {/* Live Only Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLiveOnly}
                onChange={(e) => setShowLiveOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium">Show Live Trucks Only</span>
            </label>
          </div>

          {/* Cuisine Filters */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Cuisine Types</p>
            <div className="flex flex-wrap gap-2">
              {cuisineOptions.map(cuisine => (
                <button
                  key={cuisine}
                  onClick={() => toggleCuisine(cuisine)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCuisines.includes(cuisine)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600">Finding food trucks near you...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-xl text-gray-600">No food trucks found matching your criteria.</p>
            <p className="text-gray-500 mt-2">Try adjusting your filters!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Found {filteredVendors.length} food truck{filteredVendors.length !== 1 ? 's' : ''}
            </p>
            
            {filteredVendors.map(vendor => {
              const config = statusConfig[vendor.operational_status]
              const isLive = vendor.operational_status !== 'offline'

              return (
                <Link
                  key={vendor.id}
                  href={`/vendor/${vendor.id}`}
                  className="block bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{vendor.business_name}</h3>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${config.color} ${isLive ? 'animate-pulse' : ''}`} />
                          <span className={`text-sm font-medium ${config.textColor}`}>
                            {config.label}
                          </span>
                        </div>
                      </div>

                      {vendor.description && (
                        <p className="text-gray-600 text-sm mb-3">{vendor.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {vendor.cuisine_types.map(type => (
                          <span
                            key={type}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>

                      {isLive && vendor.location && (
                        <div className="text-sm text-gray-700 space-y-1">
                          {vendor.distance_miles !== undefined && (
                            <p className="font-medium">
                              📍 {vendor.distance_miles.toFixed(1)} miles away
                            </p>
                          )}
                          {vendor.location.address && (
                            <p className="text-gray-600">{vendor.location.address}</p>
                          )}
                          {vendor.location.notes && (
                            <p className="text-gray-600 italic">{vendor.location.notes}</p>
                          )}
                        </div>
                      )}

                      {!isLive && (
                        <p className="text-sm text-gray-500 italic">Currently not serving</p>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Menu →
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}