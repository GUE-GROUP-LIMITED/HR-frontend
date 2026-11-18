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

interface AuthContextType {
  currentUser: User
  role: UserRole
  switchUser: (userId: string) => void
  switchRole: (role: UserRole) => void
  allUsers: User[]
  logout: () => void
  login: (email: string) => boolean
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
  const [currentUser, setCurrentUser] = useState<User>(() => {
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
    // Default to Elena Rostova (HR) or Lucas Graham (Super Admin)
    return INITIAL_USERS[1] // Elena Rostova (HR)
  })

  useEffect(() => {
    localStorage.setItem('gue_hr_active_user', JSON.stringify(currentUser))
  }, [currentUser])

  useEffect(() => {
    const handleStaffDeactivated = (event: Event) => {
      const { userId } = (event as CustomEvent<{ userId: string }>).detail
      if (currentUser.id !== userId) return
      localStorage.removeItem('gue_hr_active_user')
      setCurrentUser(SAFE_DEMO_USER)
    }
    window.addEventListener('gue:staff-deactivated', handleStaffDeactivated)
    return () => window.removeEventListener('gue:staff-deactivated', handleStaffDeactivated)
  }, [currentUser.id])

  const switchUser = (userId: string) => {
    const found = AUTH_USERS.find((u) => u.id === userId)
    if (found && isDemoUserActive(found)) {
      setCurrentUser(found)
    }
  }

  const switchRole = (role: UserRole) => {
    const found = AUTH_USERS.find((u) => u.role === role && isDemoUserActive(u))
    if (found) {
      setCurrentUser(found)
    }
  }

  const login = (email: string): boolean => {
    const found = AUTH_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (found && isDemoUserActive(found)) {
      setCurrentUser(found)
      return true
    }
    return false
  }

  const logout = () => {
    setCurrentUser(SAFE_DEMO_USER)
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        switchUser,
        switchRole,
        allUsers: AUTH_USERS,
        logout,
        login,
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

