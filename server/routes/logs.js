const express                  = require('express')
const { esClient, getIndices } = require('../lib/elasticsearch')

const router = express.Router()

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE   = 50
const MAX_SIZE    = 100
const MAX_RANGE   = 7 * 24 * 60 * 60 * 1000   // 7 day hard limit

// Only fetch what the table needs — full _source only in raw JSON expand
const SOURCE_FIELDS = ['@timestamp', 'hostname', 'eventid', 'message']

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK = process.env.USE_MOCK_DATA === 'true'

const MOCK_HOSTNAMES = ['server-dc01','server-web02','server-db01','server-app03','workstation-01']
const MOCK_MESSAGES  = [
  'An account was successfully logged on.',
  'An account failed to log on.',
  'A user account was changed.',
  'The Windows Filtering Platform blocked a connection.',
  'Special privileges assigned to new logon.',
  'A scheduled task was created.',
  'System audit policy was changed.',
]

const getMockLogs = (count = 50) => {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id:        `mock-${i}-${Date.now()}`,
    timestamp: new Date(now - i * 18000).toISOString(),
    hostname:  MOCK_HOSTNAMES[i % MOCK_HOSTNAMES.length],
    eventid:   [4624, 4625, 4720, 4732, 4648][i % 5],
    message:   MOCK_MESSAGES[i % MOCK_MESSAGES.length],
  }))
}

// ── Time range helper ──────────────────────────────────────────────────────
const getTimeRange = (range) => {
  const now = Date.now()
  const map = {
    '15m': 15 * 60 * 1000,
    '1h':  60 * 60 * 1000,
    '6h':  6  * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
  }
  const delta = map[range] || map['15m']
  return { from: now - delta, now }
}

// ── Query builder ──────────────────────────────────────────────────────────
// Parses search string into ES query.
// Supports:
//   plain text       → full-text match on message
//   eventid:4624     → term query (integer)
//   hostname:srv01   → term query (keyword)
//   accountname:admin → term query (keyword)
const buildQuery = (search, from, now) => {
  const timeFilter = {
    range: {
      '@timestamp': { gte: from, lte: now, format: 'epoch_millis' }
    }
  }

  if (!search || !search.trim()) {
    return { bool: { filter: [timeFilter] } }
  }

  const trimmed   = search.trim()
  const fieldMatch = trimmed.match(/^(\w+):(.+)$/)

  if (fieldMatch) {
    const [, field, value] = fieldMatch

    // Integer field
    if (field === 'eventid') {
      const num = parseInt(value, 10)
      if (!isNaN(num)) {
        return { bool: { filter: [timeFilter, { term: { eventid: num } }] } }
      }
    }

    // Keyword fields
    if (['hostname', 'accountname', 'domain', 'sourcename'].includes(field)) {
      return { bool: { filter: [timeFilter, { term: { [field]: value } }] } }
    }
  }

  // Plain text → full-text on message
  return {
    bool: {
      filter: [timeFilter],
      must:   [{ match: { message: trimmed } }]
    }
  }
}

// ── GET /api/logs ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  // Return mock data immediately if mock mode is on
  if (MOCK) {
    return res.json({
      total:     500,
      hits:      getMockLogs(50),
      nextAfter: JSON.stringify(['mock-cursor', Date.now()]),
    })
  }

  try {
    const {
      search = '',
      range  = '15m',
      size   = PAGE_SIZE,
      after  = null,
    } = req.query

    const pageSize       = Math.min(parseInt(size, 10) || PAGE_SIZE, MAX_SIZE)
    const { from, now }  = getTimeRange(range)

    if (now - from > MAX_RANGE) {
      return res.status(400).json({ error: 'Time range exceeds 7 day maximum.' })
    }

    const index = getIndices(from, now)
    const query = buildQuery(search, from, now)

    const body = {
      size: pageSize,
      _source: SOURCE_FIELDS,
      query,
      sort: [
        { '@timestamp': { order: 'desc' } },
        { '_id':         { order: 'desc' } },   // tiebreaker for search_after
      ],
    }

    // Pagination cursor from previous page
    if (after) {
      try { body.search_after = JSON.parse(after) }
      catch { return res.status(400).json({ error: 'Invalid pagination cursor.' }) }
    }

    const { data } = await esClient.post(`/${index}/_search`, body)
    const hits      = data.hits.hits

    // Pass cursor for next page — null means no more results
    const nextAfter = hits.length === pageSize
      ? JSON.stringify(hits[hits.length - 1].sort)
      : null

    res.json({
      total:     data.hits.total.value,
      hits: hits.map(h => ({
        id:        h._id,
        timestamp: h._source['@timestamp'],
        hostname:  h._source.hostname,
        eventid:   h._source.eventid,
        message:   h._source.message,
      })),
      nextAfter,
    })

  } catch (err) {
    console.error('[LOGS] fetch error:', err.message)
    res.status(500).json({ error: 'Failed to fetch logs.' })
  }
})

module.exports = router