'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function VendorOnboarding() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasVendorProfile, setHasVendorProfile] = useState(false)

  // Form state
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([])
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const cuisineOptions = [
    'American', 'Mexican', 'Italian', 'Asian', 'BBQ', 
    'Seafood', 'Vegetarian', 'Vegan', 'Desserts', 'Coffee/Beverages'
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // Check if user already has a vendor profile
    const checkVendorProfile = async () => {
      if (!user) return

      const { data } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setHasVendorProfile(true)
        router.push('/dashboard')
      }
    }

    checkVendorProfile()
  }, [user, router])

  const toggleCuisine = (cuisine: string) => {
    if (cuisineTypes.includes(cuisine)) {
      setCuisineTypes(cuisineTypes.filter(c => c !== cuisine))
    } else {
      setCuisineTypes([...cuisineTypes, cuisine])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!user) {
      setError('You must be logged in')
      setLoading(false)
      return
    }

    if (cuisineTypes.length === 0) {
      setError('Please select at least one cuisine type')
      setLoading(false)
      return
    }

    try {
  console.log('Creating vendor profile...')
  
  // Create vendor profile
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .insert({
      user_id: user.id,
      business_name: businessName,
      description,
      cuisine_types: cuisineTypes,
      phone,
      email: email || user.email,
      subscription_tier: 'basic',
      subscription_status: 'trialing',
    })
    .select()
    .single()

  console.log('Vendor creation result:', { vendor, vendorError })
  if (vendorError) {
    console.error('Vendor error details:', vendorError)
    throw vendorError
  }

  console.log('Creating vendor status...')
  
  // Create vendor status entry
  const { error: statusError } = await supabase
    .from('vendor_status')
    .insert({
      vendor_id: vendor.id,
      is_live: false,
      operational_status: 'offline',
    })

  console.log('Status creation result:', { statusError })
  if (statusError) {
    console.error('Status error details:', statusError)
    throw statusError
  }

  console.log('Updating profile role...')
  
  // Update user role in profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'vendor' })
    .eq('id', user.id)

  console.log('Profile update result:', { profileError })
  if (profileError) {
    console.error('Profile error details:', profileError)
    throw profileError
  }

  alert('Vendor profile created successfully!')
  router.push('/dashboard')
} catch (err) {
  console.error('Caught error:', err)
  console.error('Error type:', typeof err)
  console.error('Error keys:', Object.keys(err as object))
  setError(err instanceof Error ? err.message : 'Failed to create vendor profile')
} finally {
      setLoading(false)
    }
  }

  if (authLoading || hasVendorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Vendor Profile
          </h2>
          <p className="text-gray-600 mb-8">
            Lets set up your food truck business on FueledUp Food
          </p>

          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div>
              <label htmlFor="business-name" className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                id="business-name"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Johnny's Tacos"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Business Description *
              </label>
              <textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell customers about your food truck..."
              />
            </div>

            {/* Cuisine Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine Types * (Select all that apply)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {cuisineOptions.map((cuisine) => (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => toggleCuisine(cuisine)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      cuisineTypes.includes(cuisine)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Business Phone *
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Business Email (optional)
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="contact@johnnytacos.com"
              />
              <p className="mt-1 text-sm text-gray-500">
                Defaults to your account email if left blank
              </p>
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating Profile...' : 'Create Vendor Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}