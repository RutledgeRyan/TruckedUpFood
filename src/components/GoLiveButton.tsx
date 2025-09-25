'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { VendorOperationalStatus } from '@/types/vendor'
import LocationSearch from './LocationSearch'

type GoLiveButtonProps = {
  vendorId: string
}

type SelectedLocation = {
  address: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  zip?: string
}

export default function GoLiveButton({ vendorId }: GoLiveButtonProps) {
  const [status, setStatus] = useState<VendorOperationalStatus>('offline')
  const [loading, setLoading] = useState(false)
  const [locationNotes, setLocationNotes] = useState('')
  const [showLocationInput, setShowLocationInput] = useState(false)
  const [useManualLocation, setUseManualLocation] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from('vendor_status')
      .select('operational_status')
      .eq('vendor_id', vendorId)
      .single()

    if (data && !error) {
      setStatus(data.operational_status)
    }
  }, [vendorId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleStatusChange = async () => {
    if (status === 'offline') {
      setShowLocationInput(true)
    } else if (status === 'live') {
      await updateStatus('closing_soon')
    } else if (status === 'closing_soon') {
      await updateStatus('offline')
    }
  }

  const goLiveWithGPS = async () => {
    setLoading(true)
    try {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser. Please use manual location entry.')
        setUseManualLocation(true)
        setLoading(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          await createLocationAndGoLive(latitude, longitude)
        },
        (error) => {
          console.error('Geolocation error:', error)
          alert('Could not get your location. Please search for it manually.')
          setUseManualLocation(true)
          setLoading(false)
        }
      )
    } catch (error) {
      console.error('Error going live:', error)
      alert('Failed to go live. Please try again.')
      setLoading(false)
    }
  }

  const goLiveWithSearchedLocation = async () => {
    if (!selectedLocation) {
      alert('Please search and select a location first')
      return
    }

    setLoading(true)
    await createLocationAndGoLive(
      selectedLocation.latitude,
      selectedLocation.longitude,
      selectedLocation.address,
      selectedLocation.city,
      selectedLocation.state,
      selectedLocation.zip
    )
  }

  const createLocationAndGoLive = async (
    latitude: number,
    longitude: number,
    address?: string,
    city?: string,
    state?: string,
    zip?: string
  ) => {
    try {
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert({
          vendor_id: vendorId,
          latitude,
          longitude,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
          notes: locationNotes || undefined,
          is_current_location: true,
        })
        .select()
        .single()

      if (locationError) throw locationError

      const { error: statusError } = await supabase
        .from('vendor_status')
        .update({
          operational_status: 'live',
          went_live_at: new Date().toISOString(),
          current_location_id: location.id,
        })
        .eq('vendor_id', vendorId)

      if (statusError) throw statusError

      setStatus('live')
      setShowLocationInput(false)
      setUseManualLocation(false)
      setLocationNotes('')
      setSelectedLocation(null)
      alert('You are now live! 🎉')
    } catch (error) {
      console.error('Error going live:', error)
      alert('Failed to go live. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: VendorOperationalStatus) => {
    setLoading(true)
    try {
      const updates: {
        operational_status: VendorOperationalStatus
        current_location_id?: string | null
        went_live_at?: string | null
      } = {
        operational_status: newStatus,
      }

      if (newStatus === 'offline') {
        updates.current_location_id = null
        updates.went_live_at = null
      }

      const { error } = await supabase
        .from('vendor_status')
        .update(updates)
        .eq('vendor_id', vendorId)

      if (error) throw error

      setStatus(newStatus)

      if (newStatus === 'closing_soon') {
        alert('Status updated to Closing Soon 🟡')
      } else if (newStatus === 'offline') {
        alert('You are now offline. See you next time! 👋')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = {
    offline: {
      label: 'Offline',
      color: 'bg-gray-400',
      textColor: 'text-gray-700',
      buttonLabel: 'Go Live',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    live: {
      label: 'Live & Serving',
      color: 'bg-green-500',
      textColor: 'text-green-700',
      buttonLabel: 'Begin Closing Up',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    closing_soon: {
      label: 'Closing Soon',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700',
      buttonLabel: 'Go Offline',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
  }

  const currentConfig = statusConfig[status]

  if (showLocationInput) {
    return (
      <div className="border rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold mb-4">Go Live - Share Your Location</h3>
        
        {!useManualLocation ? (
          <>
            <p className="text-sm text-gray-600 mb-4">
              We will use your current GPS location. Customers will see where you are!
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Notes (Optional)
              </label>
              <input
                type="text"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="e.g., Behind City Hall, Next to the park"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={goLiveWithGPS}
                disabled={loading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Getting Location...' : '📍 Use My Current GPS Location'}
              </button>
              
              <button
                onClick={() => setUseManualLocation(true)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                🔍 Search for Location
              </button>
              
              <button
                onClick={() => {
                  setShowLocationInput(false)
                  setLocationNotes('')
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Search for your location using Google Maps autocomplete.
            </p>

            <div className="space-y-4 mb-4">
              <LocationSearch onLocationSelect={setSelectedLocation} />

              {selectedLocation && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">
                    ✓ Location Selected:
                  </p>
                  <p className="text-sm text-green-700">{selectedLocation.address}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={locationNotes}
                  onChange={(e) => setLocationNotes(e.target.value)}
                  placeholder="e.g., Behind City Hall, In the parking lot"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={goLiveWithSearchedLocation}
                disabled={loading || !selectedLocation}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Going Live...' : '✅ Go Live at This Location'}
              </button>
              
              <button
                onClick={() => {
                  setUseManualLocation(false)
                  setSelectedLocation(null)
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                ← Back to GPS
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${currentConfig.color} animate-pulse`} />
          <div>
            <h3 className="text-lg font-semibold">Current Status</h3>
            <p className={`text-sm font-medium ${currentConfig.textColor}`}>
              {currentConfig.label}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleStatusChange}
        disabled={loading}
        className={`w-full px-4 py-3 text-white rounded-md font-medium transition-colors disabled:opacity-50 ${currentConfig.buttonColor}`}
      >
        {loading ? 'Updating...' : currentConfig.buttonLabel}
      </button>

      {status !== 'offline' && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          {status === 'live' 
            ? 'Customers can see you! Click when you start wrapping up.' 
            : 'Let customers know you\'re closing soon before going offline.'}
        </p>
      )}
    </div>
  )
}