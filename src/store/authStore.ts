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
import { saveKnownAccount } from '../lib/accountLookup'

// ─── Rate Limiter ────────────────────────────────────────────────────────────
// Strict security rate limiting to protect against brute-force attacks:
// - 3 failed attempts: 90-second lockout (90,000 ms)
// - 4 failed attempts: 3-minute lockout (180,000 ms)
// - 5+ failed attempts: 5-minute lockout (300,000 ms)
// Persisted in localStorage so page reloads do not bypass the countdown.

const RATE_LIMIT_STORAGE_KEY = 'skills021_login_rate_limits'

interface RateLimitState {
  attempts: number
  lockedUntil: number | null
  lastAttemptAt?: number
}

function getStoredRateLimits(): Record<string, RateLimitState> {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function persistRateLimit(key: string, state: RateLimitState | null) {
  try {
    const map = getStoredRateLimits()
    if (state === null) {
      delete map[key]
    } else {
      map[key] = state
    }
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn('Could not persist rate limit state:', e)
  }
}

function getRateLimitKey(identifier: string) {
  return identifier.trim().toLowerCase()
}

export function getLockoutDuration(attempts: number): number {
  if (attempts >= 5) return 5 * 60 * 1000  // 5 minutes
  if (attempts >= 4) return 3 * 60 * 1000  // 3 minutes
  if (attempts >= 3) return 90 * 1000      // 90 seconds
  return 0
}

export function checkRateLimit(identifier: string): {
  blocked: boolean
  remainingMs: number
  attemptsLeft: number
  totalAttempts: number
} {
  const key = getRateLimitKey(identifier)
  const map = getStoredRateLimits()
  const state = map[key] ?? { attempts: 0, lockedUntil: null }

  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const remainingMs = state.lockedUntil - Date.now()
    return { blocked: true, remainingMs, attemptsLeft: 0, totalAttempts: state.attempts }
  }

  // 3 attempts maximum before lockout
  const attemptsLeft = Math.max(0, 3 - state.attempts)
  return { blocked: false, remainingMs: 0, attemptsLeft, totalAttempts: state.attempts }
}

export function recordFailedAttempt(identifier: string): {
  blocked: boolean
  remainingMs: number
  attemptsLeft: number
  totalAttempts: number
} {
  const key = getRateLimitKey(identifier)
  const map = getStoredRateLimits()
  const state = map[key] ?? { attempts: 0, lockedUntil: null }
  const newAttempts = state.attempts + 1
  const lockoutMs = getLockoutDuration(newAttempts)

  const newState: RateLimitState = {
    attempts: newAttempts,
    lockedUntil: lockoutMs > 0 ? Date.now() + lockoutMs : null,
    lastAttemptAt: Date.now(),
  }
  persistRateLimit(key, newState)

  const attemptsLeft = lockoutMs > 0 ? 0 : Math.max(0, 3 - newAttempts)
  return {
    blocked: lockoutMs > 0,
    remainingMs: lockoutMs,
    attemptsLeft,
    totalAttempts: newAttempts,
  }
}

export function clearRateLimit(identifier: string) {
  const key = getRateLimitKey(identifier)
  persistRateLimit(key, null)
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
  age?: number
  branch?: string
  currentSemester?: number
  semesterSGPA?: Record<string, number>
  yearOfStudy?: string
  bio?: string
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
  loginWithSupabase: (email: string, password: string) => Promise<{ success: boolean; error?: string; isUnverifiedEmail?: boolean; rateLimitInfo?: { blocked: boolean; remainingMs: number; attemptsLeft: number } }>
  registerWithSupabase: (data: RegisterData) => Promise<{ success: boolean; error?: string; needsEmailVerification?: boolean; email?: string }>
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
          const isEmailConfirmed = Boolean(
            u.email_confirmed_at ||
            u.confirmed_at ||
            (u.app_metadata?.provider !== 'email' && u.app_metadata?.provider)
          )

          if (!isEmailConfirmed && u.app_metadata?.provider === 'email') {
            await supabase.auth.signOut().catch(() => {})
            set({ user: null, isAuthenticated: false, isAdminAuthenticated: false, adminUser: null })
            return
          }

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
            age: profile?.age ?? u.user_metadata?.age,
            branch: profile?.branch ?? u.user_metadata?.branch ?? '',
            currentSemester: profile?.current_semester ?? u.user_metadata?.current_semester,
            semesterSGPA: profile?.semester_sgpa ?? u.user_metadata?.semester_sgpa ?? {},
            yearOfStudy: profile?.year_of_study ?? u.user_metadata?.year_of_study ?? '',
            bio: profile?.bio ?? u.user_metadata?.bio ?? '',
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

            // Check if email confirmation is required and unconfirmed
            const isEmailConfirmed = Boolean(
              u.email_confirmed_at ||
              u.confirmed_at ||
              (u.app_metadata?.provider !== 'email' && u.app_metadata?.provider)
            )

            if (!isEmailConfirmed && u.app_metadata?.provider === 'email') {
              await signOutUser().catch(() => {})
              return {
                success: false,
                isUnverifiedEmail: true,
                error: 'Please verify your email before logging in. We sent a verification link to your inbox.',
              }
            }

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
              age: profile?.age ?? u.user_metadata?.age,
              branch: profile?.branch ?? u.user_metadata?.branch ?? '',
              currentSemester: profile?.current_semester ?? u.user_metadata?.current_semester,
              semesterSGPA: profile?.semester_sgpa ?? u.user_metadata?.semester_sgpa ?? {},
              yearOfStudy: profile?.year_of_study ?? u.user_metadata?.year_of_study ?? '',
              bio: profile?.bio ?? u.user_metadata?.bio ?? '',
            }

            clearRateLimit(cleanEmail)

            saveKnownAccount({
              email: mappedUser.email,
              name: mappedUser.name,
              avatarUrl: mappedUser.avatarUrl,
              role: mappedUser.role,
            })

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
          const rawMessage = err?.message || ''
          const isEmailNotConfirmed =
            err?.code === 'email_not_confirmed' ||
            /email not confirmed/i.test(rawMessage) ||
            /confirm your email/i.test(rawMessage) ||
            /verify your email/i.test(rawMessage)

          if (isEmailNotConfirmed) {
            return {
              success: false,
              isUnverifiedEmail: true,
              error: 'Please verify your email address before logging in. Check your inbox for the confirmation link.',
            }
          }

          const rlInfo = recordFailedAttempt(cleanEmail)
          const message = rawMessage || 'Invalid email or password. Please check your credentials.'
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

          saveKnownAccount({
            email: data.email,
            name: data.name,
            avatarUrl: data.avatarUrl || '',
            role: 'user',
          })

          // Ensure session is cleared so user is not logged in automatically before email verification
          try {
            await signOutUser()
          } catch {
            // ignore
          }

          if (res?.user) {
            return {
              success: true,
              needsEmailVerification: true,
              email: data.email,
            }
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

        saveKnownAccount({
          email: current.email,
          name: nextName,
          avatarUrl: nextAvatar,
          role: current.role,
        })

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
              age: data.age ?? current.age,
              branch: data.branch ?? current.branch,
              current_semester: data.currentSemester ?? current.currentSemester,
              semester_sgpa: data.semesterSGPA ?? current.semesterSGPA,
              year_of_study: data.yearOfStudy ?? current.yearOfStudy,
              bio: data.bio ?? current.bio,
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
            age: data.age ?? current.age,
            branch: data.branch ?? current.branch,
            current_semester: data.currentSemester ?? current.currentSemester,
            semester_sgpa: data.semesterSGPA ?? current.semesterSGPA,
            year_of_study: data.yearOfStudy ?? current.yearOfStudy,
            bio: data.bio ?? current.bio,
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
                age: profile.age ?? current.age,
                branch: profile.branch ?? current.branch,
                currentSemester: profile.current_semester ?? current.currentSemester,
                semesterSGPA: profile.semester_sgpa ?? current.semesterSGPA,
                yearOfStudy: profile.year_of_study ?? current.yearOfStudy,
                bio: profile.bio ?? current.bio,
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

          saveKnownAccount({
            email: adminEmail,
            name: 'System Administrator',
            avatarUrl: '',
            role: 'admin',
          })

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
                saveKnownAccount({
                  email: res.user.email || adminId.trim(),
                  name: profile?.name || 'System Administrator',
                  avatarUrl: profile?.avatar_url || '',
                  role: 'admin',
                })
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
