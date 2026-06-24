'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  FC
} from 'react'

import {
  authApi,
  setAccessToken,
  clearAccessToken,
  doRefresh
} from '@/utils/axios'

import type {
  AuthUser,
  AuthContextType,
  ApiResponse,
  RegisterResponse
} from '@/types'

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user,            setUser]            = useState<AuthUser | null>(null)
  const [isLoading,       setIsLoading]       = useState<boolean>(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const hasChecked = useRef(false)

  const checkAuth = async (): Promise<void> => {
    try {
      await doRefresh()

      const meRes    = await authApi.get<ApiResponse<AuthUser>>('/api/auth/me')
      const userData = meRes.data.data!
      setUser(userData)
      setIsAuthenticated(true)
    } catch {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true
    checkAuth()
  }, [])

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await authApi.post<ApiResponse<{ accessToken: string; user: AuthUser }>>(
      '/api/auth/login', { email, password }
    )
    const { accessToken, user } = res.data.data!
    setAccessToken(accessToken)
    setUser(user)
    setIsAuthenticated(true)
    return user
  }

  const loginWithGoogle = async (token: string): Promise<AuthUser> => {
    setAccessToken(token)
    const res      = await authApi.get<ApiResponse<AuthUser>>('/api/auth/me')
    const userData = res.data.data!
    setUser(userData)
    setIsAuthenticated(true)
    return userData
  }

  const logout = async (): Promise<void> => {
    try { await authApi.post('/api/auth/logout') } catch {}
    clearAccessToken()
    setUser(null)
    setIsAuthenticated(false)
  }

  const register = async (
    email: string,
    password: string
  ): Promise<ApiResponse<RegisterResponse>> => {
    const res = await authApi.post<ApiResponse<RegisterResponse>>(
      '/api/auth/register', { email, password }
    )
    return res.data
  }

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      login, loginWithGoogle, logout, register, checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
