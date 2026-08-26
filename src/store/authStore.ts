import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  supabase,
  signInUser,
  signUpUser,
  signOutUser,
  getUserProfile,
  upsertUserProfile,
} from '../lib/supabase'
import { getEnrollmentsForUser } from '../lib/videoEngagementService'

// ─── Rate Limiter ────────────────────────────────────────────────────────────
// In-memory rate limiting to protect against brute-force attacks.
// 5 failed attempts: 30s lockout. 8 failed attempts: 2 min lockout. 10+ attempts: 5 min lockout.
interface RateLimitState {
  attempts: number
  lockedUntil: number | null
}

const rateLimitMap: Record<string, RateLimitState> = {}

function getRateLimitKey(identifier: string) {
  return identifier.trim().toLowerCase()
}

function getLockoutDuration(attempts: number): number {
  if (attempts >= 10) return 5 * 60 * 1000 // 5 minutes
  if (attempts >= 8) return 2 * 60 * 1000  // 2 minutes
  if (attempts >= 5) return 30 * 1000       // 30 seconds
  return 0
}

export function checkRateLimit(identifier: string): { blocked: boolean; remainingMs: number; attemptsLeft: number } {
  const key = getRateLimitKey(identifier)
  const state = rateLimitMap[key] ?? { attempts: 0, lockedUntil: null }

  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return { blocked: true, remainingMs: state.lockedUntil - Date.now(), attemptsLeft: 0 }
  }

  // Max attempts before lockout
  const attemptsLeft = Math.max(0, 10 - state.attempts)
  return { blocked: false, remainingMs: 0, attemptsLeft }
}

export function recordFailedAttempt(identifier: string): { blocked: boolean; remainingMs: number; attemptsLeft: number } {
  const key = getRateLimitKey(identifier)
  const state = rateLimitMap[key] ?? { attempts: 0, lockedUntil: null }
  const newAttempts = state.attempts + 1
  const lockoutMs = getLockoutDuration(newAttempts)
  rateLimitMap[key] = {
    attempts: newAttempts,
    lockedUntil: lockoutMs > 0 ? Date.now() + lockoutMs : null,
  }
  const attemptsLeft = Math.max(0, 10 - newAttempts)
  return { blocked: lockoutMs > 0, remainingMs: lockoutMs, attemptsLeft }
}

export function clearRateLimit(identifier: string) {
  const key = getRateLimitKey(identifier)
  delete rateLimitMap[key]
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  college: string
  phone?: string
  avatarUrl?: string
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
  avatarUrl?: string
}

interface AuthState {
  // Regular User Auth (Supabase Only)
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string; rateLimitInfo?: { blocked: boolean; remainingMs: number; attemptsLeft: number } }>
  registerWithSupabase: (data: RegisterData) => Promise<{ success: boolean; error?: string }>
  logoutUser: () => Promise<void>
  logout: () => void
  updateProfileInSupabase: (data: Partial<User>) => Promise<boolean>
  refreshUserData: () => Promise<void>
  /** Re-verify session on app startup and sync user profile */
  hydrateFromSession: () => Promise<void>

  // Dedicated Admin Portal Auth
  isAdminAuthenticated: boolean
  adminUser: { id: string; email: string; name: string } | null
  adminLogin: (adminId: string, adminPassword: string) => Promise<{ success: boolean; error?: string; rateLimitInfo?: { blocked: boolean; remainingMs: number; attemptsLeft: number } }>
  adminLogout: () => Promise<void>
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
        set({ user, isAuthenticated: !!user, isAdminAuthenticated: user?.role === 'admin' })
      },

      hydrateFromSession: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) {
            // Keep local admin auth if user logged in as admin locally
            const current = get()
            if (!current.isAdminAuthenticated) {
              set({ user: null, isAuthenticated: false, isAdminAuthenticated: false, adminUser: null })
            }
            return
          }

          const u = session.user
          const [profile, enrollments] = await Promise.all([
            getUserProfile(u.id).catch(() => null),
            getEnrollmentsForUser(u.id).catch(() => []),
          ])

          const configuredAdminEmail = ((import.meta.env.VITE_ADMIN_ID as string) || '').toLowerCase().trim()
          const isConfiguredAdmin = Boolean(configuredAdminEmail) && (u.email || '').toLowerCase().trim() === configuredAdminEmail
          const isAdmin = profile?.role === 'admin' || u.user_metadata?.role === 'admin' || isConfiguredAdmin

          const mappedUser: User = {
            id: u.id,
            name: profile?.name || u.user_metadata?.name || u.email?.split('@')[0] || (isAdmin ? 'System Administrator' : 'User'),
            email: u.email || '',
            role: isAdmin ? 'admin' : 'user',
            college: profile?.college || u.user_metadata?.college || (isAdmin ? 'Skills021 Central HQ' : 'Student Institution'),
            phone: profile?.phone || u.user_metadata?.phone || '',
            avatarUrl: profile?.avatar_url || u.user_metadata?.avatar_url || '',
            isPremium: Boolean(profile?.is_premium ?? u.user_metadata?.is_premium ?? isAdmin),
            joinedDate: profile?.created_at
              ? new Date(profile.created_at).toISOString().split('T')[0]
              : new Date(u.created_at).toISOString().split('T')[0],
            enrolledCourses: enrollments.map(e => e.courseId),
          }

          set({
            user: mappedUser,
            isAuthenticated: true,
            isAdminAuthenticated: isAdmin,
            adminUser: isAdmin ? { id: mappedUser.id, email: mappedUser.email, name: mappedUser.name } : null,
          })
        } catch {
          // Fail gracefully without crashing
        }
      },

      loginWithSupabase: async (email: string, password: string) => {
        const cleanEmail = email.trim()
        const preCheck = checkRateLimit(cleanEmail)
        if (preCheck.blocked) {
          return { success: false, error: `Too many failed attempts. Try again in ${Math.ceil(preCheck.remainingMs / 1000)}s.`, rateLimitInfo: preCheck }
        }

        try {
          const res = await signInUser(cleanEmail, password)
          if (res?.user) {
            const u = res.user

            const [profile, enrollments] = await Promise.all([
              getUserProfile(u.id).catch(() => null),
              getEnrollmentsForUser(u.id).catch(() => []),
            ])

            const configuredAdminEmail = ((import.meta.env.VITE_ADMIN_ID as string) || '').toLowerCase().trim()
            const isConfiguredAdmin = Boolean(configuredAdminEmail) && (u.email || '').toLowerCase().trim() === configuredAdminEmail
            const isAdmin = profile?.role === 'admin' || u.user_metadata?.role === 'admin' || isConfiguredAdmin

            const mappedUser: User = {
              id: u.id,
              name: profile?.name || u.user_metadata?.name || u.email?.split('@')[0] || (isAdmin ? 'System Administrator' : 'User'),
              email: u.email || cleanEmail,
              role: isAdmin ? 'admin' : 'user',
              college: profile?.college || u.user_metadata?.college || (isAdmin ? 'Skills021 Central HQ' : 'Student Institution'),
              phone: profile?.phone || u.user_metadata?.phone || '',
              avatarUrl: profile?.avatar_url || u.user_metadata?.avatar_url || '',
              isPremium: Boolean(profile?.is_premium ?? u.user_metadata?.is_premium ?? isAdmin),
              joinedDate: profile?.created_at
                ? new Date(profile.created_at).toISOString().split('T')[0]
                : new Date(u.created_at).toISOString().split('T')[0],
              enrolledCourses: enrollments.map(e => e.courseId),
            }

            clearRateLimit(cleanEmail)

            set({
              user: mappedUser,
              isAuthenticated: true,
              isAdminAuthenticated: isAdmin,
              adminUser: isAdmin ? { id: mappedUser.id, email: mappedUser.email, name: mappedUser.name } : null,
            })
            return { success: true }
          }
          const rlInfo = recordFailedAttempt(cleanEmail)
          return { success: false, error: 'User not found. Please check your credentials.', rateLimitInfo: rlInfo }
        } catch (err: any) {
          console.error('Login error:', err)
          const rlInfo = recordFailedAttempt(cleanEmail)
          const message = err?.message || 'Invalid email or password. Please check your credentials.'
          return { success: false, error: message, rateLimitInfo: rlInfo }
        }
      },

      registerWithSupabase: async (data: RegisterData) => {
        try {
          const res = await signUpUser(
            data.email,
            data.password,
            data.name,
            data.college,
            data.phone || '',
            data.avatarUrl || ''
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
              avatarUrl: data.avatarUrl || '',
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
          set({ user: null, isAuthenticated: false, isAdminAuthenticated: false, adminUser: null })
        }
      },

      logout: () => {
        // Pure local state reset to prevent recursive onAuthStateChange event loops
        set({ user: null, isAuthenticated: false, isAdminAuthenticated: false, adminUser: null })
      },

      updateProfileInSupabase: async (data: Partial<User>): Promise<boolean> => {
        const current = get().user
        if (!current) return false

        const nextAvatar = data.avatarUrl !== undefined ? data.avatarUrl : current.avatarUrl
        const nextName = data.name ?? current.name
        const nextCollege = data.college ?? current.college
        const nextPhone = data.phone ?? current.phone ?? ''

        // 1. Immediately update local store so avatar & profile reflect instantly on UI
        set({
          user: {
            ...current,
            ...data,
            avatarUrl: nextAvatar,
          },
        })

        // 2. Sync Supabase Auth user metadata
        try {
          await supabase.auth.updateUser({
            data: {
              name: nextName,
              college: nextCollege,
              phone: nextPhone,
              avatar_url: nextAvatar,
            },
          })
        } catch (metaErr) {
          console.warn('Auth user_metadata update notice:', metaErr)
        }

        // 3. Sync public.profiles database table in Supabase
        try {
          await upsertUserProfile({
            id: current.id,
            email: current.email,
            name: nextName,
            college: nextCollege,
            phone: nextPhone,
            role: current.role,
            avatar_url: nextAvatar,
            is_premium: data.isPremium ?? current.isPremium ?? false,
          })
        } catch (err) {
          console.warn('Profile DB upsert notice:', err)
        }

        return true
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
                avatarUrl: profile.avatar_url || current.avatarUrl || '',
                isPremium: Boolean(profile.is_premium ?? current.isPremium ?? false),
                enrolledCourses: enrollments.map(e => e.courseId),
              },
            })
          }
        } catch (err) {
          console.warn('Could not refresh user data from Supabase:', err)
        }
      },

      // ── Admin Portal Auth ────────────────────────────────────────────────────
      adminLogin: async (adminId: string, adminPassword: string) => {
        const configuredAdminId = ((import.meta.env.VITE_ADMIN_ID as string) || '').trim()
        const configuredAdminPass = ((import.meta.env.VITE_ADMIN_PASSWORD as string) || '').trim()

        const inputIdClean = adminId.trim().toLowerCase()
        const isMatchConfiguredId =
          Boolean(configuredAdminId) &&
          (inputIdClean === configuredAdminId.toLowerCase() ||
            (configuredAdminId.includes('@') && inputIdClean === configuredAdminId.split('@')[0].toLowerCase()))
        const isMatchConfiguredPass = Boolean(configuredAdminPass) && adminPassword === configuredAdminPass

        // Rate limit pre-check
        const preCheck = checkRateLimit(adminId)
        if (preCheck.blocked) {
          return {
            success: false,
            error: `Too many failed attempts. Try again in ${Math.ceil(preCheck.remainingMs / 1000)}s.`,
            rateLimitInfo: preCheck,
          }
        }

        // Case 1: Matches the secure configured admin credentials (.env)
        if (isMatchConfiguredId && isMatchConfiguredPass) {
          const adminEmail = configuredAdminId.includes('@') ? configuredAdminId : `${configuredAdminId}@skills021.com`
          let adminUid = 'admin-1'

          // Seamlessly establish a Supabase Auth session for RLS access
          try {
            const res = await signInUser(adminEmail, adminPassword)
            if (res?.user) {
              adminUid = res.user.id
            }
          } catch (authErr) {
            // Auto-provision admin user in Supabase Auth if not yet created
            try {
              const res = await signUpUser(adminEmail, adminPassword, 'System Administrator', 'Skills021 Central HQ', '', '')
              if (res?.user) {
                adminUid = res.user.id
              }
            } catch (signupErr) {
              console.warn('Supabase Auth auto-signup notice:', signupErr)
            }
          }

          // Ensure profile has role: 'admin'
          try {
            await upsertUserProfile({
              id: adminUid,
              email: adminEmail,
              name: 'System Administrator',
              college: 'Skills021 Central HQ',
              role: 'admin',
              is_premium: true,
            })
          } catch (profileErr) {
            console.warn('Admin profile upsert notice:', profileErr)
          }

          clearRateLimit(adminId)

          const adminObj = {
            id: adminUid,
            email: adminEmail,
            name: 'System Administrator',
          }

          set({
            isAdminAuthenticated: true,
            adminUser: adminObj,
            user: {
              id: adminUid,
              name: 'System Administrator',
              email: adminEmail,
              role: 'admin',
              college: 'Skills021 Central HQ',
              isPremium: true,
            },
            isAuthenticated: true,
          })
          return { success: true }
        }

        // Case 2: Attempt standard Supabase auth if someone has another admin account
        if (adminId.includes('@')) {
          try {
            const res = await signInUser(adminId.trim(), adminPassword)
            if (res?.user) {
              const profile = await getUserProfile(res.user.id).catch(() => null)
              if (profile?.role === 'admin' || res.user.user_metadata?.role === 'admin') {
                clearRateLimit(adminId)
                const adminObj = {
                  id: res.user.id,
                  email: res.user.email || adminId.trim(),
                  name: profile?.name || 'System Administrator',
                }
                set({
                  isAdminAuthenticated: true,
                  adminUser: adminObj,
                  user: {
                    id: res.user.id,
                    name: profile?.name || 'System Administrator',
                    email: res.user.email || adminId.trim(),
                    role: 'admin',
                    college: profile?.college || 'Skills021 Central HQ',
                    isPremium: true,
                  },
                  isAuthenticated: true,
                })
                return { success: true }
              }
            }
          } catch {
            // fall through
          }
        }

        const rlInfo = recordFailedAttempt(adminId)
        return {
          success: false,
          error: 'Invalid Admin Credentials. Please check your Admin ID and Password.',
          rateLimitInfo: rlInfo,
        }
      },

      adminLogout: async () => {
        try {
          await signOutUser()
        } catch (err) {
          console.error('Admin logout error:', err)
        } finally {
          set({ isAdminAuthenticated: false, adminUser: null, user: null, isAuthenticated: false })
        }
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
