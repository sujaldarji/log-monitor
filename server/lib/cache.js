/**
 * Simple in-memory cache for dashboard stat endpoints.
 * Avoids hammering Elasticsearch on every 30s chart refresh.
 * TTL is read from ENV (default 30 seconds).
 */

const TTL = parseInt(process.env.CACHE_TTL_MS, 10) || 30_000

const store = new Map()

/**
 * Get a cached value by key.
 * Returns null if missing or expired.
 */
const get = (key) => {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value
}

/**
 * Store a value with TTL.
 */
const set = (key, value) => {
  store.set(key, {
    value,
    expiresAt: Date.now() + TTL,
  })
}

module.exports = { get, set }