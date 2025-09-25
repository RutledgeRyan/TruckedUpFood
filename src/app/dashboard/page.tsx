'use client'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import GoLiveButton from '@/components/GoLiveButton'

type VendorProfile = {
  id: string
  business_name: string
  description: string
  cuisine_types: string[]
  subscription_tier: string
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState<VendorProfile | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchVendorProfile = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name, description, cuisine_types, subscription_tier')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching vendor:', error)
      }

      if (!data) {
        router.push('/vendor/onboarding')
      } else {
        setVendor(data)
      }
      
      setLoading(false)
    }

    if (user) {
      fetchVendorProfile()
    }
  }, [user, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  if (!user || !vendor) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold">FueledUp Food - Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Welcome, {vendor.business_name}! 🚚</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Go Live Section */}
            <GoLiveButton vendorId={vendor.id} />

            {/* Business Info */}
            <div className="border rounded-lg p-6 bg-white">
              <h3 className="font-semibold text-gray-700 mb-4">Business Info</h3>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Subscription:</span> {vendor.subscription_tier}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Cuisines:</span> {vendor.cuisine_types.join(', ')}
              </p>
              
              <div className="mt-4 space-y-2">
  <Link
    href="/menu"
    className="block w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm text-center font-medium"
  >
    🍔 Manage Menu
  </Link>
  <button className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">
    📝 Edit Profile
  </button>
</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}