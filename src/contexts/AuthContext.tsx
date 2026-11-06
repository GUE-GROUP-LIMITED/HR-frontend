import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, UserRole } from '@/types'
import { INITIAL_USERS } from '@/services/mockData'

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('gue_hr_active_user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    // Default to Elena Rostova (HR) or Lucas Graham (Super Admin)
    return INITIAL_USERS[1] // Elena Rostova (HR)
  })

  useEffect(() => {
    localStorage.setItem('gue_hr_active_user', JSON.stringify(currentUser))
  }, [currentUser])

  const switchUser = (userId: string) => {
    const found = INITIAL_USERS.find((u) => u.id === userId)
    if (found) {
      setCurrentUser(found)
    }
  }

  const switchRole = (role: UserRole) => {
    const found = INITIAL_USERS.find((u) => u.role === role)
    if (found) {
      setCurrentUser(found)
    }
  }

  const login = (email: string): boolean => {
    const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (found) {
      setCurrentUser(found)
      return true
    }
    return false
  }

  const logout = () => {
    setCurrentUser(INITIAL_USERS[0])
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser.role,
        switchUser,
        switchRole,
        allUsers: INITIAL_USERS,
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

