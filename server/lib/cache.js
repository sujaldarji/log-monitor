/**
 * Simple in-memory TTL cache.
 * Default TTL: 30s (CACHE_TTL_MS env var)
 * Custom TTL: pass as third argument to set()
 */

const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_MS, 10) || 30_000

const store = new Map()

// Get cached value — returns null if missing or expired
const get = (key) => {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value
}

// Set value with optional custom TTL in ms
const set = (key, value, ttl = DEFAULT_TTL) => {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  })
}

module.exports = { get, set }