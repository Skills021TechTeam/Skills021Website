/**
 * Cookie and Storage Management Service for Skill021
 * Handles GDPR/privacy compliance, user personalization preferences,
 * and persistent browser session cookies.
 */

export interface CookiePreferences {
  necessary: boolean // Always true (auth, security, route protection)
  preferences: boolean // Dark mode, video player speed/volume, haptics
  analytics: boolean // Engagement tracking, video completion metrics, quiz stats
  marketing: boolean // Live webinar alerts, hackathon notifications
  timestamp: string
  version: string
}

export const COOKIE_CONSENT_KEY = 'skills021_cookie_consent'
export const COOKIE_CONSENT_VERSION = 'v1.0'

export const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  preferences: true,
  analytics: true,
  marketing: true,
  timestamp: new Date().toISOString(),
  version: COOKIE_CONSENT_VERSION,
}

export const ESSENTIAL_ONLY_PREFERENCES: CookiePreferences = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
  timestamp: new Date().toISOString(),
  version: COOKIE_CONSENT_VERSION,
}

/**
 * Sets a cookie in the browser
 */
export function setCookie(name: string, value: string, days = 365, path = '/'): void {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    const isSecure = window.location.protocol === 'https:'
    const secureFlag = isSecure ? '; SameSite=Lax; Secure' : '; SameSite=Lax'
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=${path}${secureFlag}`
  } catch (err) {
    console.warn(`[CookieService] Failed to set cookie ${name}:`, err)
  }
}

/**
 * Gets a cookie value by name
 */
export function getCookie(name: string): string | null {
  try {
    const nameEQ = encodeURIComponent(name) + '='
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i].trim()
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length))
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Deletes a cookie
 */
export function deleteCookie(name: string, path = '/'): void {
  try {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`
  } catch (err) {
    console.warn(`[CookieService] Failed to delete cookie ${name}:`, err)
  }
}

/**
 * Retrieves the saved cookie preferences. Returns null if user hasn't made a choice yet.
 */
export function getStoredCookiePreferences(): CookiePreferences | null {
  try {
    // Check localStorage first
    const local = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (local) {
      const parsed = JSON.parse(local)
      if (parsed && typeof parsed.necessary === 'boolean') {
        return parsed
      }
    }

    // Check cookie fallback
    const cookieVal = getCookie(COOKIE_CONSENT_KEY)
    if (cookieVal) {
      const parsed = JSON.parse(cookieVal)
      if (parsed && typeof parsed.necessary === 'boolean') {
        return parsed
      }
    }
  } catch (err) {
    console.warn('[CookieService] Error reading stored preferences:', err)
  }
  return null
}

/**
 * Saves user cookie preferences both in localStorage and in a cookie.
 */
export function saveCookiePreferences(prefs: Partial<CookiePreferences>): CookiePreferences {
  const fullPrefs: CookiePreferences = {
    necessary: true,
    preferences: prefs.preferences ?? false,
    analytics: prefs.analytics ?? false,
    marketing: prefs.marketing ?? false,
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  }

  try {
    const serialized = JSON.stringify(fullPrefs)
    localStorage.setItem(COOKIE_CONSENT_KEY, serialized)
    setCookie(COOKIE_CONSENT_KEY, serialized, 365)

    // Clean up preferences if disabled
    if (!fullPrefs.preferences) {
      // Keep essential, remove non-essential custom preferences if necessary
    }
    if (!fullPrefs.analytics) {
      deleteCookie('skills021_analytics_session')
    }

    // Dispatch global event so components can react immediately
    window.dispatchEvent(
      new CustomEvent('skills021_cookie_preferences_updated', { detail: fullPrefs })
    )
  } catch (err) {
    console.error('[CookieService] Error saving cookie preferences:', err)
  }

  return fullPrefs
}

/**
 * Checks if user has given consent for a specific category
 */
export function hasCookieConsent(category: keyof Omit<CookiePreferences, 'timestamp' | 'version'>): boolean {
  if (category === 'necessary') return true
  const prefs = getStoredCookiePreferences()
  if (!prefs) return true // Default to optimistic or wait until decided
  return Boolean(prefs[category])
}

/**
 * Triggers the Cookie Preferences modal from anywhere in the app (e.g. Footer link)
 */
export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent('skills021_open_cookie_settings'))
}

/**
 * Gets a diagnostic list of current active cookies and storage keys
 */
export function getActiveStorageDiagnostics(): { name: string; type: 'cookie' | 'localStorage'; size: string; category: string }[] {
  const items: { name: string; type: 'cookie' | 'localStorage'; size: string; category: string }[] = []

  try {
    // Parse cookies
    if (document.cookie) {
      const cookies = document.cookie.split(';')
      cookies.forEach((c) => {
        const parts = c.trim().split('=')
        if (parts[0]) {
          const name = parts[0]
          let category = 'Necessary'
          if (name.includes('theme') || name.includes('pref')) category = 'Preferences'
          if (name.includes('analytics') || name.includes('metric')) category = 'Analytics'
          if (name.includes('popup') || name.includes('promo')) category = 'Marketing'

          items.push({
            name,
            type: 'cookie',
            size: `${(c.length / 1024).toFixed(2)} KB`,
            category,
          })
        }
      })
    }

    // Parse localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const val = localStorage.getItem(key) || ''
        let category = 'Necessary'
        if (key.includes('theme') || key.includes('speed') || key.includes('volume')) category = 'Preferences'
        if (key.includes('analytics') || key.includes('quiz') || key.includes('progress')) category = 'Analytics'
        if (key.includes('webinar') || key.includes('banner')) category = 'Marketing'

        items.push({
          name: key,
          type: 'localStorage',
          size: `${((key.length + val.length) / 1024).toFixed(2)} KB`,
          category,
        })
      }
    }
  } catch (err) {
    console.warn('[CookieService] Failed to gather diagnostics:', err)
  }

  return items
}

/**
 * Resets non-essential cached cookies & storage
 */
export function clearNonEssentialStorage(): void {
  try {
    const keysToRemove = [
      'skills021_webinar_visit_popup_seen',
      'skills021_analytics_session',
      'skills021_dismissed_alerts',
    ]
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
      deleteCookie(k)
    })
  } catch (err) {
    console.warn('[CookieService] Failed clearing storage:', err)
  }
}
