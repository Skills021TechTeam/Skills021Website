import { supabase } from './supabase'

export interface KnownAccount {
  email: string
  name: string
  avatarUrl?: string
  role?: 'user' | 'admin'
  lastLogin?: number
}

const STORAGE_KEY = 'skills021_known_accounts'

/**
 * Reads the list of cached accounts on this device/browser.
 */
export function getKnownAccounts(): Record<string, KnownAccount> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

/**
 * Saves or updates an account in the local device cache.
 */
export function saveKnownAccount(account: {
  email: string
  name: string
  avatarUrl?: string
  role?: 'user' | 'admin'
}) {
  try {
    if (!account.email) return
    const key = account.email.trim().toLowerCase()
    const accounts = getKnownAccounts()
    const current = accounts[key]

    const resolvedName = account.name || current?.name || deriveNameFromEmail(key)
    const resolvedAvatar =
      account.avatarUrl !== undefined
        ? (account.avatarUrl || '').trim()
        : (current?.avatarUrl || '').trim()

    accounts[key] = {
      email: key,
      name: resolvedName,
      avatarUrl: resolvedAvatar,
      role: account.role || current?.role || 'user',
      lastLogin: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } catch (err) {
    console.warn('Could not save known account to localStorage:', err)
  }
}

/**
 * Generates an Admin verified persona avatar.
 */
export function getAdminAvatarUrl(): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=Skills021Admin&backgroundColor=18181b`
}

/**
 * Generates a clean human-readable name from an email address (e.g. "anubhav.bhatt@gmail.com" -> "Anubhav Bhatt")
 */
export function deriveNameFromEmail(email: string): string {
  const prefix = (email || '').split('@')[0] || 'User'
  // Replace dots, underscores, hyphens, and strip numbers
  const cleaned = prefix.replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim()
  if (!cleaned) return prefix.charAt(0).toUpperCase() + prefix.slice(1)
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Multi-layer profile & avatar lookup by email:
 * 1. Configured Admin credentials check -> Returns verified admin persona avatar
 * 2. Local device account cache & current auth store (instant)
 * 3. Supabase RPC get_public_profile_preview (works for all devices & anon visitors)
 * 4. Supabase profiles table query (fallback)
 * 5. If no avatar exists, returns empty string so nothing is shown.
 */
export async function lookupUserPublicProfile(email: string): Promise<{
  name: string
  avatarUrl: string
  role: 'user' | 'admin'
  isAdmin: boolean
  isCached: boolean
}> {
  const cleanEmail = email.trim().toLowerCase()
  const configuredAdminId = ((import.meta.env.VITE_ADMIN_ID as string) || '').trim().toLowerCase()
  const isAdminEmail =
    (Boolean(configuredAdminId) &&
      (cleanEmail === configuredAdminId ||
        (configuredAdminId.includes('@') && cleanEmail === configuredAdminId.split('@')[0]) ||
        cleanEmail === `${configuredAdminId}@skills021.com`)) ||
    cleanEmail === 'admin@skills021.com'

  if (isAdminEmail) {
    return {
      name: 'System Administrator',
      avatarUrl: getAdminAvatarUrl(),
      role: 'admin',
      isAdmin: true,
      isCached: true,
    }
  }

  // 1. Check local device account cache first
  const knownAccounts = getKnownAccounts()
  const cached = knownAccounts[cleanEmail]

  let resolvedName = cached?.name || deriveNameFromEmail(cleanEmail)
  let resolvedAvatar = (cached?.avatarUrl || '').trim()
  let resolvedRole: 'user' | 'admin' = cached?.role || 'user'
  let isCached = Boolean(cached && (cached.avatarUrl || cached.name))

  // 2. Also check skills021_auth in localStorage if cached avatar was empty
  if (!resolvedAvatar) {
    try {
      const rawAuth = localStorage.getItem('skills021_auth')
      if (rawAuth) {
        const parsed = JSON.parse(rawAuth)
        const u = parsed?.state?.user
        if (u && u.email && u.email.trim().toLowerCase() === cleanEmail) {
          if (u.avatarUrl && typeof u.avatarUrl === 'string' && u.avatarUrl.trim() !== '') {
            resolvedAvatar = u.avatarUrl.trim()
          }
          if (u.name) resolvedName = u.name
          if (u.role === 'admin') resolvedRole = 'admin'
        }
      }
    } catch {}
  }

  // 3. Try Supabase RPC get_public_profile_preview (allows public cross-device access)
  let foundFromRemote = false
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_public_profile_preview',
      { p_email: cleanEmail }
    )

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const row = rpcData[0]
      if (row.name) resolvedName = row.name
      if (row.avatar_url && typeof row.avatar_url === 'string' && row.avatar_url.trim() !== '') {
        resolvedAvatar = row.avatar_url.trim()
      }
      if (row.role === 'admin') resolvedRole = 'admin'
      foundFromRemote = true
      isCached = true
    }
  } catch {
    // RPC may not be installed yet, fallback to table query
  }

  // 4. Fallback: Query Supabase public.profiles table directly
  if (!foundFromRemote) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, first_name, last_name, avatar_url, role, email')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (!error && data) {
        const dbName =
          data.name ||
          `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
          resolvedName
        if (dbName) resolvedName = dbName
        if (data.avatar_url && typeof data.avatar_url === 'string' && data.avatar_url.trim() !== '') {
          resolvedAvatar = data.avatar_url.trim()
        }
        if (data.role === 'admin') resolvedRole = 'admin'
        isCached = true
      }
    } catch {
      // Non-critical, fallback to cached or derived profile
    }
  }

  // Save to cache so next lookup is instantaneous
  if (cleanEmail) {
    saveKnownAccount({
      email: cleanEmail,
      name: resolvedName,
      avatarUrl: resolvedAvatar,
      role: resolvedRole,
    })
  }

  return {
    name: resolvedName,
    avatarUrl: resolvedAvatar,
    role: resolvedRole,
    isAdmin: resolvedRole === 'admin',
    isCached,
  }
}
