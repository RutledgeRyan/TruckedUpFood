'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function Home() {
  const { user } = useAuth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 text-gray-900">🚚 FueledUp Food</h1>
        <p className="text-2xl text-gray-600 mb-12">Find amazing food trucks near you</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            href="/search"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
          >
            🔍 Find Food Trucks
          </Link>
          
          {user ? (
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/signup"
              className="px-8 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-lg shadow-lg hover:shadow-xl transition-all"
            >
              List Your Food Truck
            </Link>
          )}
        </div>

        {!user && (
          <p className="text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Login
            </Link>
          </p>
        )}
      </div>
    </main>
  )
}