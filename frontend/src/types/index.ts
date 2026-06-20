/*
  ============================================================
  TYPES — all shared TypeScript interfaces

  All data shapes defined here
  Every file imports from here
  These match exactly what backend returns
  ============================================================
*/

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string
  email:  string
  role:   'visitor' | 'user' | 'admin'
}

export interface AuthContextType {
  user:            AuthUser | null
  isLoading:       boolean
  isAuthenticated: boolean
  login:           (email: string, password: string) => Promise<AuthUser>
  loginWithGoogle: (token: string) => Promise<AuthUser>
  logout:          () => Promise<void>
  register:        (email: string, password: string) => Promise<ApiResponse<RegisterResponse>>
  checkAuth:       () => Promise<void>
}

export interface LoginResponse {
  accessToken: string
  user:        AuthUser
}

export interface RegisterResponse {
  user: {
    _id:             string
    email:           string
    role:            string
    isEmailVerified: boolean
  }
  message: string
}

// ─── API wrapper ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success:  boolean
  data?:    T
  message?: string
  error?:   string
  details?: { field: string; message: string }[]
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id:               number
  auth_id:          string
  email:            string
  name:             string | null
  phone:            string | null
  avatar_url:       string | null
  role:             'visitor' | 'user' | 'admin'
  reputation:       number
  daily_post_count: number
  last_post_date:   string | null
  is_banned:        boolean
  ban_reason:       string | null
  created_at:       string
  updated_at:       string
}

export interface PublicProfile {
  id:         number
  name:       string | null
  avatar_url: string | null
  role:       string
  reputation: number
  created_at: string
}

// ─── Listing ──────────────────────────────────────────────────────────────────

export type ListingType     = 'lost' | 'found'
export type ListingStatus   = 'active' | 'resolved' | 'removed' | 'expired'
export type ListingCategory =
  | 'electronics' | 'wallet' | 'keys' | 'pets'
  | 'bags' | 'documents' | 'clothing' | 'other'

export interface ListingImage {
  id:          number
  storageType: 's3' | 'db'
  url:         string | null
}

export interface Listing {
  id:             number
  user_id:        string
  type:           ListingType
  title:          string
  description:    string
  category:       ListingCategory
  date_occurred:  string
  location_label: string
  reward_offered: boolean
  reward_note:    string | null
  status:         ListingStatus
  created_at:     string
  updated_at:     string
  images?:        ListingImage[]
}

export interface ListingsResponse {
  listings:   Listing[]
  total:      number
  page:       number
  totalPages: number
}

export interface ListingFilters {
  type?:           string
  category?:       string
  keyword?:        string
  reward_offered?: boolean
  page?:           number
  limit?:          number
}

// ─── Match ────────────────────────────────────────────────────────────────────

export type MatchStatus = 'pending' | 'accepted' | 'dismissed'

export interface Match {
  id:               number
  lost_listing_id:  number
  found_listing_id: number
  lost_user_id:     string
  found_user_id:    string
  score:            number
  notified_lost:    boolean
  notified_found:   boolean
  status:           MatchStatus
  created_at:       string
  updated_at:       string
}                                                                                                                               