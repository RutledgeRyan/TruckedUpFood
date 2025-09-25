'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { MenuItem } from '@/types/vendor'
import Link from 'next/link'

type VendorWithMenu = {
  id: string
  business_name: string
  menu_id: string
}

export default function MenuManagementPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState<VendorWithMenu | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    dietary_tags: [] as string[],
  })

  const categories = ['Appetizers', 'Entrees', 'Sides', 'Desserts', 'Drinks', 'Specials']
  const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Spicy', 'Nut-Free']

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const fetchMenuItems = useCallback(async (menuId: string) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('menu_id', menuId)
      .order('category', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching menu items:', error)
      return
    }

    setMenuItems(data || [])
  }, [])

  const fetchVendorAndMenu = useCallback(async () => {
    if (!user) return

    try {
      // Get vendor and their menu
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select(`
          id,
          business_name,
          menus!inner(id)
        `)
        .eq('user_id', user.id)
        .single()

      if (vendorError) throw vendorError

      const vendorInfo = {
        id: vendorData.id,
        business_name: vendorData.business_name,
        menu_id: vendorData.menus[0].id,
      }

      setVendor(vendorInfo)

      // Fetch menu items
      await fetchMenuItems(vendorInfo.menu_id)
    } catch (error) {
      console.error('Error fetching vendor:', error)
    } finally {
      setLoading(false)
    }
  }, [user, fetchMenuItems])

  useEffect(() => {
    if (user) {
      fetchVendorAndMenu()
    }
  }, [user, fetchVendorAndMenu])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .insert({
          menu_id: vendor.menu_id,
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          category: formData.category || null,
          dietary_tags: formData.dietary_tags.length > 0 ? formData.dietary_tags : null,
          is_available: true,
        })

      if (error) throw error

      alert('Menu item added successfully!')
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        dietary_tags: [],
      })
      setShowAddForm(false)
      fetchMenuItems(vendor.menu_id)
    } catch (error) {
      console.error('Error adding menu item:', error)
      alert('Failed to add menu item')
    }
  }

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentStatus })
      .eq('id', itemId)

    if (error) {
      console.error('Error updating availability:', error)
      alert('Failed to update availability')
      return
    }

    if (vendor) {
      fetchMenuItems(vendor.menu_id)
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)

    if (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
      return
    }

    if (vendor) {
      fetchMenuItems(vendor.menu_id)
    }
  }

  const toggleDietaryTag = (tag: string) => {
    if (formData.dietary_tags.includes(tag)) {
      setFormData({
        ...formData,
        dietary_tags: formData.dietary_tags.filter(t => t !== tag)
      })
    } else {
      setFormData({
        ...formData,
        dietary_tags: [...formData.dietary_tags, tag]
      })
    }
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

  // Group items by category
  const itemsByCategory = menuItems.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold">Menu Management</h1>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{vendor.business_name} Menu</h2>
                <p className="text-gray-600 mt-1">{menuItems.length} items total</p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                {showAddForm ? 'Cancel' : '+ Add Menu Item'}
              </button>
            </div>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Menu Item</h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Classic Burger"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12.99"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe this delicious item..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dietaryOptions.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleDietaryTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          formData.dietary_tags.includes(tag)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Add Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Menu Items by Category */}
          {menuItems.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500 text-lg">No menu items yet.</p>
              <p className="text-gray-400 mt-2">Click Add Menu Item to get started!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">{category}</h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`flex justify-between items-start p-4 border rounded-lg ${
                          item.is_available ? 'bg-white' : 'bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{item.name}</h4>
                            {!item.is_available && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Sold Out
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          {item.dietary_tags && item.dietary_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {item.dietary_tags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <span className="text-lg font-semibold text-gray-900">
                            ${item.price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => toggleAvailability(item.id, item.is_available)}
                            className={`px-3 py-1 text-sm rounded ${
                              item.is_available
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}