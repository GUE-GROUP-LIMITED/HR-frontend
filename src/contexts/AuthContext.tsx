import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserRole } from '@/types'
import { INITIAL_USERS } from '@/services/mockData'
import {
  GROUP_OFFICE_PAYROLL_APPROVER,
  GROUP_HEAD_DEMO_USER,
  PAYROLL_ENTRY_DEMO_USERS,
  SUBSIDIARY_HEAD_DEMO_USERS,
  UNIT_HEAD_DEMO_USERS,
  WORKBOOK_ROLE_DEMO_USERS,
} from '@/services/operationsData'
import { api, USE_MOCK_API, clearAuthSession, getStoredAccessToken } from '@/services/api'

const AUTH_USERS: User[] = [
  ...INITIAL_USERS,
  GROUP_HEAD_DEMO_USER,
  GROUP_OFFICE_PAYROLL_APPROVER,
  ...SUBSIDIARY_HEAD_DEMO_USERS,
  ...PAYROLL_ENTRY_DEMO_USERS,
  ...UNIT_HEAD_DEMO_USERS,
  ...WORKBOOK_ROLE_DEMO_USERS,
]
const SAFE_DEMO_USER = INITIAL_USERS.find((user) => user.role === 'staff') ?? INITIAL_USERS[0]

const BACKEND_GUEST_USER: User = {
  id: 'guest',
  name: 'Guest User',
  email: '',
  role: 'staff',
  is_active: false,
  created_at: new Date(0).toISOString(),
}

interface AuthContextType {
  currentUser: User
  role: UserRole
  isAuthenticated: boolean
  isBackendMode: boolean
  isLoading: boolean
  switchUser: (userId: string) => void
  switchRole: (role: UserRole) => void
  allUsers: User[]
  logout: () => Promise<void> | void
  login: (email: string) => boolean
  loginWithPassword: (email: string, password: string) => Promise<User>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const isDemoUserActive = (user: User) => {
  try {
    const storedUsers = localStorage.getItem('gue_hr_users_v1')
    if (!storedUsers) return user.is_active
    const users = JSON.parse(storedUsers) as User[]
    return users.find((item) => item.id === user.id)?.is_active ?? user.is_active
  } catch (error) {
    console.error('Unable to verify demo user status:', error)
    return false
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isBackendMode = !USE_MOCK_API
  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (isBackendMode) return BACKEND_GUEST_USER
    const saved = localStorage.getItem('gue_hr_active_user')
    if (saved) {
      try {
        const user = JSON.parse(saved) as User
        if (isDemoUserActive(user)) return user
        localStorage.removeItem('gue_hr_active_user')
        return SAFE_DEMO_USER
      } catch {
        console.error('Unable to restore the saved demo user')
      }
    }
    return INITIAL_USERS[1]
  })
  const [isAuthenticated, setIsAuthenticated] = useState(!isBackendMode)
  const [isLoading, setIsLoading] = useState(isBackendMode)

  useEffect(() => {
    if (!isBackendMode) {
      localStorage.setItem('gue_hr_active_user', JSON.stringify(currentUser))
    }
  }, [currentUser, isBackendMode])

  useEffect(() => {
    if (!isBackendMode) return
    let cancelled = false
    const restoreSession = async () => {
      if (!getStoredAccessToken()) {
        setIsLoading(false)
        return
      }
      try {
        const user = await api.auth.me()
        if (!cancelled) {
          setCurrentUser(user)
          setIsAuthenticated(true)
        }
      } catch {
        if (!cancelled) {
          clearAuthSession()
          setCurrentUser(BACKEND_GUEST_USER)
          setIsAuthenticated(false)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    restoreSession()
    return () => {
      cancelled = true
    }
  }, [isBackendMode])

  useEffect(() => {
    if (isBackendMode) return
    const handleStaffDeactivated = (event: Event) => {
      const { userId } = (event as CustomEvent<{ userId: string }>).detail
      if (currentUser.id !== userId) return
      localStorage.removeItem('gue_hr_active_user')
      setCurrentUser(SAFE_DEMO_USER)
    }
    window.addEventListener('gue:staff-deactivated', handleStaffDeactivated)
    return () => window.removeEventListener('gue:staff-deactivated', handleStaffDeactivated)
  }, [currentUser.id, isBackendMode])

  const switchUser = (userId: string) => {
    if (isBackendMode) return
    const found = AUTH_USERS.find((u) => u.id === userId)
    if (found && isDemoUserActive(found)) {
      setCurrentUser(found)
    }
  }

  const switchRole = (role: UserRole) => {
    if (isBackendMode) return
    const found = AUTH_USERS.find((u) => u.role === role && isDemoUserActive(u))
    if (found) {
      setCurrentUser(found)
    }
  }

  const login = (email: string): boolean => {
    if (isBackendMode) return false
    const found = AUTH_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (found && isDemoUserActive(found)) {
      setCurrentUser(found)
      return true
    }
    return false
  }

  const loginWithPassword = async (email: string, password: string): Promise<User> => {
    const session = await api.auth.login(email, password)
    setCurrentUser(session.user)
    setIsAuthenticated(true)
    return session.user
  }

  const logout = async () => {
    if (isBackendMode) {
      try {
        await api.auth.logout()
      } catch {
        clearAuthSession()
      }
      setCurrentUser(BACKEND_GUEST_USER)
      setIsAuthenticated(false)
      return
    }
    setCurrentUser(SAFE_DEMO_USER)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        isAuthenticated,
        isBackendMode,
        isLoading,
        switchUser,
        switchRole,
        allUsers: isBackendMode ? (isAuthenticated ? [currentUser] : []) : AUTH_USERS,
        logout,
        login,
        loginWithPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

