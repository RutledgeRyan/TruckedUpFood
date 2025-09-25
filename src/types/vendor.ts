export type VendorOperationalStatus = 'offline' | 'live' | 'closing_soon'

export type VendorStatus = {
  id: string
  vendor_id: string
  is_live: boolean
  operational_status: VendorOperationalStatus
  went_live_at: string | null
  current_location_id: string | null
  created_at: string
  updated_at: string
}

export type Location = {
  id: string
  vendor_id: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  zip?: string
  notes?: string
  is_current_location: boolean
  created_at: string
}

export type Menu = {
  id: string
  vendor_id: string
  name: string
  description?: string
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type MenuItem = {
  id: string
  menu_id: string
  name: string
  description?: string
  price: number
  image_url?: string
  category?: string
  dietary_tags?: string[]
  is_available: boolean
  display_order: number
  created_at: string
  updated_at: string
}