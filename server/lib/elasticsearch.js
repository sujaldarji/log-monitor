const https = require('https')
const fs    = require('fs')
const axios = require('axios')

/**
 * Elasticsearch client — singleton.
 * Reads connection config from environment variables.
 * Handles self-signed CA cert for HTTPS on VM2.
 */

// Build HTTPS agent only if CA cert path is provided
const buildHttpsAgent = () => {
  const caPath = process.env.ES_CA_CERT
  if (!caPath) return undefined
  try {
    return new https.Agent({ ca: fs.readFileSync(caPath) })
  } catch (err) {
    console.warn(`[ES] Could not read CA cert at ${caPath}:`, err.message)
    return undefined
  }
}

const esClient = axios.create({
  baseURL: process.env.ES_URL,
  auth: {
    username: process.env.ES_USERNAME || 'elastic',
    password: process.env.ES_PASSWORD,
  },
  httpsAgent: buildHttpsAgent(),
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Returns comma-separated index names covering the given time range.
 * e.g. for last 15min on same day → "test-logs-elk-2026.03.05"
 * for ranges spanning midnight   → "test-logs-elk-2026.03.04,test-logs-elk-2026.03.05"
 */
const getIndices = (fromMs, toMs) => {
  const prefix  = process.env.ES_INDEX_PREFIX || 'test-logs-elk'
  const indices = new Set()
  const cursor  = new Date(fromMs)

  while (cursor.getTime() <= toMs) {
    const y = cursor.getUTCFullYear()
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0')
    const d = String(cursor.getUTCDate()).padStart(2, '0')
    indices.add(`${prefix}-${y}.${m}.${d}`)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return [...indices].join(',')
}

module.exports = { esClient, getIndices }