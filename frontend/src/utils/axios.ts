/*
  ============================================================
  AXIOS INSTANCES

  'use client' not needed here — this is utility code
  imported by client components

  Access token stored in memory (not localStorage)
  Refresh token in httpOnly cookie (sent automatically)
  ============================================================
*/

import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios'

// ─── Token in memory ──────────────────────────────────────────────────────────

let accessToken: string | null = null

export const setAccessToken = (token: string): void => {
  console.log('[axios] access token set')
  accessToken = token
}

export const getAccessToken = (): string | null => accessToken

export const clearAccessToken = (): void => {
  console.log('[axios] access token cleared')
  accessToken = null
}

// ─── Instances ────────────────────────────────────────────────────────────────

export const authApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_AUTH_URL    || 'http://localhost:4001',
  withCredentials: true
})

export const userApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_USER_URL    || 'http://localhost:4002',
  withCredentials: true
})

export const listingApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_LISTING_URL || 'http://localhost:4003',
  withCredentials: true
})

export const matchApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_MATCH_URL   || 'http://localhost:4005',
  withCredentials: true
})

export const claimApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_CLAIM_URL || 'http://localhost:4006',
  withCredentials: true
})

export const chatApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_CHAT_URL || 'http://localhost:4007',
  withCredentials: true
})
export const notificationApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_NOTIFICATION_URL || 'http://localhost:4008',
  withCredentials: true
})

export const adminApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:4010',
  withCredentials: true
})

export const mediaApi: AxiosInstance = axios.create({
  baseURL:         process.env.NEXT_PUBLIC_MEDIA_URL   || 'http://localhost:4004',
  withCredentials: true
})

const allInstances: AxiosInstance[] = [
  authApi, userApi, listingApi, matchApi,
  claimApi, chatApi, notificationApi, adminApi, mediaApi
]

// ─── Request interceptor ──────────────────────────────────────────────────────

const addAuthHeader = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
    console.log('[axios] auth header added:', config.url)
  }
  return config
}

// ─── Response interceptor ─────────────────────────────────────────────────────

const createResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (error) => {
      const original = error.config

      if (error.response?.status === 401 && !original._retry) {
        // Prevent retry loop on the refresh endpoint itself
        if (original.url?.includes('/auth/refresh')) {
          clearAccessToken()
          return Promise.reject(error)
        }

        original._retry = true
        console.log('[axios] 401 — refreshing token...')

        try {
          const res      = await authApi.post('/api/auth/refresh')
          const newToken = res.data.data.accessToken
          setAccessToken(newToken)
          original.headers.Authorization = `Bearer ${newToken}`
          return instance(original)
        } catch {
          clearAccessToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }

      return Promise.reject(error)
    }
  )
}

// apply to all
allInstances.forEach(instance => {
  instance.interceptors.request.use(addAuthHeader, (e) => Promise.reject(e))
  createResponseInterceptor(instance)
})