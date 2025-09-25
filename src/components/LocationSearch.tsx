'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

type LocationResult = {
  address: string
  latitude: number
  longitude: number
  city?: string
  state?: string
  zip?: string
}

type LocationSearchProps = {
  onLocationSelect: (location: LocationResult) => void
}

// Track if script is already loaded/loading globally
let isScriptLoaded = false
let isScriptLoading = false
const scriptCallbacks: (() => void)[] = []

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isReady, setIsReady] = useState(false)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google || autocompleteRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'geometry', 'formatted_address'],
      types: ['address'],
    })

    autocompleteRef.current = autocomplete

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (!place.geometry || !place.geometry.location) {
        alert('No details available for this location')
        return
      }

      let city = ''
      let state = ''
      let zip = ''

      place.address_components?.forEach((component) => {
        const types = component.types
        if (types.includes('locality')) {
          city = component.long_name
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.short_name
        }
        if (types.includes('postal_code')) {
          zip = component.long_name
        }
      })

      const location: LocationResult = {
        address: place.formatted_address || '',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        city,
        state,
        zip,
      }

      onLocationSelect(location)
    })
  }, [onLocationSelect])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey) {
      console.error('Google Maps API key is missing')
      return
    }

    const loadGoogleMaps = () => {
      // If already loaded, initialize immediately
      if (window.google?.maps?.places) {
        setIsReady(true)
        initAutocomplete()
        return
      }

      // If currently loading, queue the callback
      if (isScriptLoading) {
        scriptCallbacks.push(() => {
          setIsReady(true)
          initAutocomplete()
        })
        return
      }

      // If not loaded and not loading, load the script
      if (!isScriptLoaded && !isScriptLoading) {
        isScriptLoading = true
        
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => {
          isScriptLoaded = true
          isScriptLoading = false
          setIsReady(true)
          initAutocomplete()
          
          // Execute any queued callbacks
          scriptCallbacks.forEach(callback => callback())
          scriptCallbacks.length = 0
        }
        script.onerror = () => {
          isScriptLoading = false
          console.error('Failed to load Google Maps script')
        }
        document.head.appendChild(script)
      }
    }

    loadGoogleMaps()
  }, [initAutocomplete])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Search for Your Location
      </label>
      <input
        ref={inputRef}
        type="text"
        placeholder={isReady ? "Start typing an address..." : "Loading..."}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={!isReady}
      />
      {!isReady && (
        <p className="text-xs text-gray-500 mt-1">Loading location search...</p>
      )}
      {isReady && (
        <p className="text-xs text-gray-500 mt-1">
          💡 Start typing your address and select from the dropdown
        </p>
      )}
    </div>
  )
}