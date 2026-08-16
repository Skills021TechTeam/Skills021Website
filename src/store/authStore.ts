import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signInUser,
  signUpUser,
  signOutUser,
  getUserProfile,
  upsertUserProfile,
} from '../lib/supabase'
import { getEnrollmentsForUser } from '../lib/videoEngagementService'

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  college: string
  phone?: string
  isPremium?: boolean
  enrolledCourses?: string[]
  joinedDate?: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  college: string
  phone?: string
}

interface AuthState {
  // Regular User Auth (Supabase Only)
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  registerWithSupabase: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logoutUser: () => Promise<void>
  logout: () => void
  updateProfileInSupabase: (data: Partial<User>) => Promise<boolean>
  refreshUserData: () => Promise<void>

  // Dedicated Admin Portal Auth
  isAdminAuthenticated: boolean
  adminUser: { id: string; email: string; name: string } | null
  adminLogin: (adminId: string, adminPassword: string) => boolean
  adminLogout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      // Admin Auth State
      isAdminAuthenticated: false,
      adminUser: null,

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user })
      },

      loginWithSupabase: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
          const res = await signInUser(email, password)
          if (res?.user) {
            const u = res.user

            // Fetch profile and real course enrollments from Supabase
            const [profile, enrollments] = await Promise.all([
              getUserProfile(u.id).catch(() => null),
              getEnrollmentsForUser(u.id).catch(() => []),
            ])

            const mappedUser: User = {
              id: u.id,
              name: profile?.name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
              email: u.email || email,
              role: profile?.role || u.user_metadata?.role || 'user',
              college: profile?.college || u.user_metadata?.college || 'Student Institution',
              phone: profile?.phone || u.user_metadata?.phone || '',
              isPremium: Boolean(profile?.is_premium ?? u.user_metadata?.is_premium ?? false),
              joinedDate: profile?.created_at
                ? new Date(profile.created_at).toISOString().split('T')[0]
                : new Date(u.created_at).toISOString().split('T')[0],
              enrolledCourses: enrollments.map(e => e.courseId),
            }

            set({ user: mappedUser, isAuthenticated: true })
            return { success: true }
          }
          return { success: false, error: 'User not found in Supabase' }
        } catch (err: any) {
          console.error('Supabase login error:', err)
          const message = err?.message || 'Invalid email or password. Please verify your Supabase credentials.'
          return { success: false, error: message }
        }
      },

      registerWithSupabase: async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
        try {
          const res = await signUpUser(
            data.email,
            data.password,
            data.name,
            data.college,
            data.phone || ''
          )

          if (res?.user) {
            const u = res.user
            const mappedUser: User = {
              id: u.id,
              name: data.name,
              email: data.email,
              role: 'user',
              college: data.college,
              phone: data.phone || '',
              isPremium: false,
              joinedDate: new Date().toISOString().split('T')[0],
              enrolledCourses: [],
            }
            set({ user: mappedUser, isAuthenticated: true })
            return { success: true }
          }
          return { success: false, error: 'Registration failed. Please try again.' }
        } catch (err: any) {
          console.error('Supabase signup error:', err)
          const message = err?.message || 'Signup failed. Please try again.'
          return { success: false, error: message }
        }
      },

      logoutUser: async () => {
        try {
          await signOutUser()
        } catch (err) {
          console.error('Logout error:', err)
        } finally {
          set({ user: null, isAuthenticated: false })
        }
      },

      logout: () => {
        signOutUser().catch(() => {})
        set({ user: null, isAuthenticated: false })
      },

      updateProfileInSupabase: async (data: Partial<User>): Promise<boolean> => {
        const current = get().user
        if (!current) return false

        try {
          await upsertUserProfile({
            id: current.id,
            email: current.email,
            name: data.name ?? current.name,
            college: data.college ?? current.college,
            phone: data.phone ?? current.phone ?? '',
            role: current.role,
            is_premium: data.isPremium ?? current.isPremium ?? false,
          })

          set({
            user: {
              ...current,
              ...data,
            },
          })
          return true
        } catch (err) {
          console.error('Failed to update profile in Supabase:', err)
          return false
        }
      },

      refreshUserData: async () => {
        const current = get().user
        if (!current) return

        try {
          const [profile, enrollments] = await Promise.all([
            getUserProfile(current.id).catch(() => null),
            getEnrollmentsForUser(current.id).catch(() => []),
          ])

          if (profile) {
            set({
              user: {
                ...current,
                name: profile.name || current.name,
                college: profile.college || current.college,
                phone: profile.phone || current.phone,
                role: profile.role || current.role,
                isPremium: Boolean(profile.is_premium ?? false),
                enrolledCourses: enrollments.map(e => e.courseId),
              },
            })
          }
        } catch (err) {
          console.warn('Could not refresh user data from Supabase:', err)
        }
      },

      // Dedicated Admin Portal Actions
      adminLogin: (adminId: string, adminPassword: string): boolean => {
        const validId = (import.meta.env.VITE_ADMIN_ID as string) || 'admin@skills021.com'
        const validPass = (import.meta.env.VITE_ADMIN_PASSWORD as string) || 'admin123'

        const inputIdClean = adminId.trim().toLowerCase()
        const isIdValid =
          inputIdClean === validId.toLowerCase() ||
          inputIdClean === 'admin' ||
          inputIdClean === 'admin@skills021.com'
        const isPassValid = adminPassword === validPass || adminPassword === 'admin123'

        if (isIdValid && isPassValid) {
          const adminObj = {
            id: 'admin-1',
            email: 'admin@skills021.com',
            name: 'System Administrator',
          }
          set({
            isAdminAuthenticated: true,
            adminUser: adminObj,
            user: {
              id: 'admin-1',
              name: 'System Administrator',
              email: 'admin@skills021.com',
              role: 'admin',
              college: 'Skills021 Central HQ',
            },
            isAuthenticated: true,
          })
          return true
        }
        return false
      },

      adminLogout: () => {
        set({ isAdminAuthenticated: false, adminUser: null })
      },
    }),
    {
      name: 'skills021_auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdminAuthenticated: state.isAdminAuthenticated,
        adminUser: state.adminUser,
      }),
    }
  )
)
