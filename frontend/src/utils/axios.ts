import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig
} from 'axios'

let accessToken: string | null = null

export const setAccessToken = (token: string): void => {
  accessToken = token
}

export const getAccessToken = (): string | null => accessToken

export const clearAccessToken = (): void => {
  accessToken = null
}

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

// Singleton refresh — all concurrent 401s share one refresh call.
// If a refresh is in flight, every new caller waits for the same promise
// instead of firing a second refresh (which would trigger token-reuse detection
// on the server and wipe the entire session).
let refreshPromise: Promise<string> | null = null

export const doRefresh = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post<{ success: boolean; data: { accessToken: string } }>('/api/auth/refresh')
      .then(res => {
        const token = res.data.data.accessToken
        setAccessToken(token)
        return token
      })
      .catch(err => {
        clearAccessToken()
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

const allInstances: AxiosInstance[] = [
  authApi, userApi, listingApi, matchApi,
  claimApi, chatApi, notificationApi, adminApi, mediaApi
]

const addAuthHeader = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
}

const createResponseInterceptor = (instance: AxiosInstance): void => {
  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (error) => {
      const original = error.config

      if (error.response?.status === 401 && !original._retry) {
        // Don't retry the refresh call itself
        if (original.url?.includes('/auth/refresh')) {
          return Promise.reject(error)
        }

        original._retry = true

        try {
          const newToken = await doRefresh()
          original.headers.Authorization = `Bearer ${newToken}`
          return instance(original)
        } catch {
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return Promise.reject(error)
        }
      }

      return Promise.reject(error)
    }
  )
}

allInstances.forEach(instance => {
  instance.interceptors.request.use(addAuthHeader, (e) => Promise.reject(e))
  createResponseInterceptor(instance)
})
