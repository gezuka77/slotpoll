const SAFE_REDIRECT_PATH = '/dashboard'

export function sanitizeCallbackUrl(raw: string | null | undefined, baseUrl?: string) {
  if (!raw) return SAFE_REDIRECT_PATH

  try {
    // Allow relative paths.
    if (raw.startsWith('/') && !raw.startsWith('//')) {
      return raw
    }

    const base = baseUrl ? new URL(baseUrl) : null
    if (!base) return SAFE_REDIRECT_PATH
    const target = new URL(raw)
    if (target.origin === base.origin) {
      return target.pathname + target.search + target.hash
    }
  } catch {
    // ignore
  }

  return SAFE_REDIRECT_PATH
}

export const isValidEmail = (value: string) => {
  if (!value) return false
  if (value.length > 254) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

type RateLimitEntry = { count: number; resetAt: number }

const rateBuckets = new Map<string, RateLimitEntry>()

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const existing = rateBuckets.get(key)
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 }
  }
  existing.count += 1
  return { allowed: true, remaining: Math.max(0, limit - existing.count) }
}
