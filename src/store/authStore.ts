import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  college: string
  phone?: string
  enrolledCourses?: string[]
  joinedDate?: string
}

interface RegisterData {
  name: string
  email: string
  password: string
  college: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => boolean
  logout: () => void
  register: (data: RegisterData) => boolean
  updateProfile: (data: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (email: string, password: string): boolean => {
        const users = JSON.parse(localStorage.getItem('skills021_users') || '[]')
        const user = users.find(
          (u: User & { password: string; disabled?: boolean }) =>
            u.email === email && u.password === password && !u.disabled
        )
        if (user) {
          const { password: _pwd, ...userWithoutPassword } = user
          set({ user: userWithoutPassword, isAuthenticated: true })
          return true
        }
        return false
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      register: (data: RegisterData): boolean => {
        const users = JSON.parse(localStorage.getItem('skills021_users') || '[]')
        const exists = users.find((u: User) => u.email === data.email)
        if (exists) return false

        const newUser = {
          id: `user-${Date.now()}`,
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'user' as const,
          college: data.college,
          phone: '',
          joinedDate: new Date().toISOString().split('T')[0],
          enrolledCourses: [],
          disabled: false,
        }

        users.push(newUser)
        localStorage.setItem('skills021_users', JSON.stringify(users))

        const { password: _pwd, ...userWithoutPassword } = newUser
        set({ user: userWithoutPassword, isAuthenticated: true })
        return true
      },

      updateProfile: (data: Partial<User>) => {
        const current = get().user
        if (!current) return

        const updated = { ...current, ...data }
        set({ user: updated })

        // Also update in localStorage users array
        const users = JSON.parse(localStorage.getItem('skills021_users') || '[]')
        const idx = users.findIndex((u: User) => u.id === current.id)
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...data }
          localStorage.setItem('skills021_users', JSON.stringify(users))
        }
      },
    }),
    {
      name: 'skills021_auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
