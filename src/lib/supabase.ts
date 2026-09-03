import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export interface UserProfile {
  id: string
  email: string
  name: string
  first_name?: string
  last_name?: string
  college: string
  phone: string
  role: 'user' | 'admin'
  avatar_url?: string
  is_premium?: boolean
  age?: number
  branch?: string
  current_semester?: number
  semester_sgpa?: Record<string, number>
  year_of_study?: string
  bio?: string
  created_at?: string
  updated_at?: string
}

export interface UserEnrollmentSummary {
  id: string
  courseId: string
  courseTitle?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  amount: number
  paymentStatus: 'pending' | 'paid' | 'free'
  status: string
  createdAt: string
}

export interface UserWithEnrollmentDetails extends UserProfile {
  enrollments: UserEnrollmentSummary[]
  hasPaidCourses: boolean
  paidCoursesCount: number
  totalAmountPaid: number
  freeCoursesCount: number
  totalCoursesCount: number
}

function splitName(fullName: string) {
  const parts = (fullName || '').trim().split(' ')
  const firstName = parts[0] || ''
  const lastName = parts.slice(1).join(' ') || ''
  return { firstName, lastName }
}

/** Supabase Auth Helpers **/
export async function signUpUser(
  email: string,
  password: string,
  name: string,
  college: string,
  phone: string = '',
  avatarUrl: string = ''
) {
  const { firstName, lastName } = splitName(name)
  const redirectTo = `${window.location.origin}/login?verified=true`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        name,
        first_name: firstName,
        last_name: lastName,
        college,
        phone,
        role: 'user',
        avatar_url: avatarUrl,
        is_premium: false,
      },
    },
  })
  if (error) throw error

  // Best-effort profile upsert into public.profiles
  if (data.user) {
    try {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email || email,
          name: name,
          college: college || 'Student Institution',
          phone,
          role: 'user',
          avatar_url: avatarUrl,
          is_premium: false,
        },
        { onConflict: 'id' }
      )
    } catch (profileErr) {
      console.warn('Could not auto-insert profile row:', profileErr)
    }
  }

  return data
}

/**
 * Resends a sign-up verification email to the user's address.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/login?verified=true`
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: {
      emailRedirectTo: redirectTo,
    },
  })
  if (error) throw error
}

export async function signInUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error

  // If user signed in successfully, ensure their profile exists in public.profiles
  if (data.user) {
    try {
      const u = data.user
      const fullName = u.user_metadata?.name || u.email?.split('@')[0] || 'User'

      await supabase.from('profiles').upsert(
        {
          id: u.id,
          email: u.email || email,
          name: fullName,
          college: u.user_metadata?.college || 'Student Institution',
          phone: u.user_metadata?.phone || '',
          role: u.user_metadata?.role || 'user',
          avatar_url: u.user_metadata?.avatar_url || '',
          is_premium: u.user_metadata?.is_premium || false,
        },
        { onConflict: 'id' }
      )
    } catch (e) {
      // ignore
    }
  }

  return data
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** User Profile DB Helpers **/
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.warn('Error fetching profile:', error.message)
      return null
    }
    if (!data) return null

    const fullName =
      data.name ||
      `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
      data.email?.split('@')[0] ||
      'User'

    return {
      id: data.id,
      email: data.email,
      name: fullName,
      college: data.college || 'Student Institution',
      phone: data.phone || '',
      role: data.role || 'user',
      avatar_url: data.avatar_url || '',
      is_premium: Boolean(data.is_premium ?? false),
      age: data.age ?? undefined,
      branch: data.branch ?? '',
      current_semester: data.current_semester ?? undefined,
      semester_sgpa: data.semester_sgpa ?? {},
      year_of_study: data.year_of_study ?? '',
      bio: data.bio ?? '',
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  } catch (err) {
    console.warn('Profile fetch exception:', err)
    return null
  }
}

export async function upsertUserProfile(
  profile: Partial<UserProfile> & { id: string }
): Promise<UserProfile | null> {
  const fullName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim()

  const payload: any = {
    id: profile.id,
    email: profile.email,
    name: fullName,
    phone: profile.phone || '',
    role: profile.role || 'user',
  }

  if (profile.avatar_url !== undefined) {
    payload.avatar_url = profile.avatar_url
  }
  if (profile.is_premium !== undefined) {
    payload.is_premium = profile.is_premium
  }
  if (profile.college) {
    payload.college = profile.college
  }
  if (profile.age !== undefined) {
    payload.age = profile.age
  }
  if (profile.branch !== undefined) {
    payload.branch = profile.branch
  }
  if (profile.current_semester !== undefined) {
    payload.current_semester = profile.current_semester
  }
  if (profile.semester_sgpa !== undefined) {
    payload.semester_sgpa = profile.semester_sgpa
  }
  if (profile.year_of_study !== undefined) {
    payload.year_of_study = profile.year_of_study
  }
  if (profile.bio !== undefined) {
    payload.bio = profile.bio
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .maybeSingle()

    if (error) {
      // If avatar_url column does not exist yet in public.profiles table, fallback without avatar_url
      if (error.message?.includes('avatar_url') || error.code === 'PGRST204') {
        const fallbackPayload = { ...payload }
        delete fallbackPayload.avatar_url
        const { data: fallbackData } = await supabase
          .from('profiles')
          .upsert(fallbackPayload, { onConflict: 'id' })
          .select('*')
          .maybeSingle()

        return {
          id: fallbackData?.id || profile.id,
          email: fallbackData?.email || profile.email || '',
          name: fallbackData?.name || fullName,
          college: fallbackData?.college || profile.college || 'Student Institution',
          phone: fallbackData?.phone || '',
          role: fallbackData?.role || 'user',
          avatar_url: profile.avatar_url || '',
          is_premium: Boolean(fallbackData?.is_premium ?? false),
          created_at: fallbackData?.created_at,
          updated_at: fallbackData?.updated_at,
        }
      }
      console.warn(`Upsert profile non-critical note: ${error.message}`)
    }

    const nameResolved = data?.name || data?.email?.split('@')[0] || fullName

    return {
      id: data?.id || profile.id,
      email: data?.email || profile.email || '',
      name: nameResolved,
      college: data?.college || profile.college || 'Student Institution',
      phone: data?.phone || '',
      role: data?.role || 'user',
      avatar_url: data?.avatar_url || profile.avatar_url || '',
      is_premium: Boolean(data?.is_premium ?? false),
      age: data?.age ?? profile.age,
      branch: data?.branch ?? profile.branch ?? '',
      current_semester: data?.current_semester ?? profile.current_semester,
      semester_sgpa: data?.semester_sgpa ?? profile.semester_sgpa ?? {},
      year_of_study: data?.year_of_study ?? profile.year_of_study ?? '',
      bio: data?.bio ?? profile.bio ?? '',
      created_at: data?.created_at,
      updated_at: data?.updated_at,
    }
  } catch (err: any) {
    console.warn('upsertUserProfile error:', err)
    return null
  }
}

/**
 * Uploads a user avatar image to Supabase Storage.
 * Falls back across buckets and provides clean public URLs.
 */
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png'
  const fileName = `avatar_${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  // 1. Try 'avatars' bucket first
  try {
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: true })

    if (!uploadErr) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      if (data?.publicUrl) return data.publicUrl
    } else {
      console.warn('Avatars bucket upload notice:', uploadErr.message)
    }
  } catch (e) {
    console.warn('Avatars upload exception:', e)
  }

  // 2. Fallback to 'resources' bucket if 'avatars' is not created yet
  try {
    const fallbackPath = `avatars/${filePath}`
    const { error: fallbackErr } = await supabase.storage
      .from('resources')
      .upload(fallbackPath, file, { cacheControl: '3600', upsert: true })

    if (!fallbackErr) {
      const { data } = supabase.storage.from('resources').getPublicUrl(fallbackPath)
      if (data?.publicUrl) return data.publicUrl
    }
  } catch (e) {
    // fallback
  }

  // 3. Guaranteed immediate fallback: convert to base64 Data URL so avatar always displays
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

export async function toggleUserPremiumStatus(userId: string, isPremium: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: isPremium, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Failed to update premium status:', err)
    return false
  }
}

export async function updateUserAuthPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
}

/**
 * Sends a Supabase password-reset email to the given address.
 * The link in the email redirects to the app's /reset-password route.
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

/**
 * Verifies that a live Supabase session exists and returns the user's role
 * from the public.profiles table. Returns null if there is no active session.
 * Use this in route guards instead of trusting localStorage.
 */
export async function verifySessionAndGetRole(): Promise<{ userId: string; role: 'user' | 'admin' } | null> {
  try {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr || !session?.user) return null

    const userId = session.user.id
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr || !profile) return null

    return { userId, role: (profile.role as 'user' | 'admin') || 'user' }
  } catch {
    return null
  }
}

/** Admin / Aggregate queries for users and paid courses from Supabase **/
export async function fetchAllUsersWithEnrollments(): Promise<UserWithEnrollmentDetails[]> {
  try {
    // 1. Fetch all profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (profilesError) {
      console.warn('Could not load profiles from table, falling back to enrollments aggregation:', profilesError.message)
    }

    // 2. Fetch all enrollments
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false })

    if (enrollmentsError) {
      console.warn('Could not load enrollments:', enrollmentsError.message)
    }

    // 3. Fetch courses title lookup
    const { data: coursesData } = await supabase
      .from('site_courses')
      .select('id, title, price')

    const courseTitleMap = new Map<string, string>()
    if (coursesData) {
      for (const c of coursesData) {
        courseTitleMap.set(String(c.id), c.title)
      }
    }

    const enrollments = enrollmentsData ?? []
    const profiles = profilesData ?? []

    // Group enrollments by user_id or email
    const enrollmentsByUserId = new Map<string, UserEnrollmentSummary[]>()
    const enrollmentsByEmail = new Map<string, UserEnrollmentSummary[]>()

    for (const row of enrollments) {
      const summary: UserEnrollmentSummary = {
        id: row.id,
        courseId: String(row.item_id),
        courseTitle: courseTitleMap.get(String(row.item_id)) || `Course #${row.item_id}`,
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        email: row.email || '',
        phone: row.phone || '',
        amount: Number(row.amount || 0),
        paymentStatus: row.payment_status || 'free',
        status: row.status || 'active',
        createdAt: row.created_at,
      }

      if (row.user_id) {
        const list = enrollmentsByUserId.get(row.user_id) || []
        list.push(summary)
        enrollmentsByUserId.set(row.user_id, list)
      }
      if (row.email) {
        const list = enrollmentsByEmail.get(row.email.toLowerCase()) || []
        list.push(summary)
        enrollmentsByEmail.set(row.email.toLowerCase(), list)
      }
    }

    const processedUserIds = new Set<string>()
    const results: UserWithEnrollmentDetails[] = []

    // Add users from profiles table
    for (const p of profiles) {
      processedUserIds.add(p.id)
      const userEnrolls =
        enrollmentsByUserId.get(p.id) ||
        (p.email ? enrollmentsByEmail.get(p.email.toLowerCase()) : []) ||
        []

      const paidEnrolls = userEnrolls.filter(
        (e) => e.paymentStatus === 'paid' || (e.amount > 0 && e.paymentStatus !== 'pending')
      )
      const freeEnrolls = userEnrolls.filter((e) => e.paymentStatus === 'free' || e.amount === 0)
      const totalAmount = paidEnrolls.reduce((sum, e) => sum + (e.amount || 0), 0)

      const fullName =
        p.name ||
        `${p.first_name || ''} ${p.last_name || ''}`.trim() ||
        p.email?.split('@')[0] ||
        'User'

      results.push({
        id: p.id,
        email: p.email,
        name: fullName,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        avatar_url: p.avatar_url || p.avatarUrl || '',
        college: p.college || 'Student Institution',
        phone: p.phone || (userEnrolls[0]?.phone ?? ''),
        branch: p.branch || '',
        current_semester: p.current_semester,
        semester_sgpa: p.semester_sgpa || {},
        year_of_study: p.year_of_study || '',
        bio: p.bio || '',
        age: p.age,
        role: p.role || 'user',
        is_premium: Boolean(p.is_premium ?? false),
        created_at: p.created_at,
        updated_at: p.updated_at,
        enrollments: userEnrolls,
        hasPaidCourses: paidEnrolls.length > 0,
        paidCoursesCount: paidEnrolls.length,
        freeCoursesCount: freeEnrolls.length,
        totalCoursesCount: userEnrolls.length,
        totalAmountPaid: totalAmount,
      })
    }

    // Also include any user who enrolled via email/user_id even if profile trigger hasn't fired yet
    for (const e of enrollments) {
      if (e.user_id && !processedUserIds.has(e.user_id)) {
        processedUserIds.add(e.user_id)
        const userEnrolls = enrollmentsByUserId.get(e.user_id) || []
        const paidEnrolls = userEnrolls.filter(
          (item) => item.paymentStatus === 'paid' || (item.amount > 0 && item.paymentStatus !== 'pending')
        )
        const freeEnrolls = userEnrolls.filter((item) => item.paymentStatus === 'free' || item.amount === 0)
        const totalAmount = paidEnrolls.reduce((sum, item) => sum + (item.amount || 0), 0)

        const fullName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email?.split('@')[0] || 'User'

        results.push({
          id: e.user_id,
          email: e.email || 'N/A',
          name: fullName,
          avatar_url: '',
          college: 'Student Institution',
          phone: e.phone || '',
          role: 'user',
          is_premium: false,
          created_at: e.created_at,
          updated_at: e.created_at,
          enrollments: userEnrolls,
          hasPaidCourses: paidEnrolls.length > 0,
          paidCoursesCount: paidEnrolls.length,
          freeCoursesCount: freeEnrolls.length,
          totalCoursesCount: userEnrolls.length,
          totalAmountPaid: totalAmount,
        })
      }
    }

    return results
  } catch (err) {
    console.error('Failed to fetch users and enrollments:', err)
    return []
  }
}
