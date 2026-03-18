const express                  = require('express')
const { esClient, getIndices } = require('../lib/elasticsearch')

const router = express.Router()

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 50
const MAX_SIZE  = 100
const MAX_RANGE = 7 * 24 * 60 * 60 * 1000

// Table view only — full document fetched on expand via GET /api/logs/:id
const SOURCE_FIELDS = [
  'event_time',
  'event_id',
  'channel',
  'hostname',
  'message',
]

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK = process.env.USE_MOCK_DATA === 'true'

const MOCK_HOSTNAMES = ['server-dc01', 'server-web02', 'server-db01', 'server-app03', 'workstation-01']
const MOCK_CHANNELS  = ['Security', 'System', 'Application', 'Setup']
const MOCK_SEVERITIES = ['information', 'warning', 'error', 'critical']
const MOCK_MESSAGES  = [
  'An account was successfully logged on.',
  'An account failed to log on.',
  'A user account was changed.',
  'The Windows Filtering Platform blocked a connection.',
  'Special privileges assigned to new logon.',
  'A scheduled task was created.',
  'System audit policy was changed.',
]

const getMockLogs = (count = PAGE_SIZE) => {
  const now = Date.now()
  return Array.from({ length: count }, (_, i) => ({
    id:               `mock-${i}-${now}`,
    event_time:       new Date(now - i * 18000).toISOString(),
    hostname:         MOCK_HOSTNAMES[i % MOCK_HOSTNAMES.length],
    channel:          MOCK_CHANNELS[i % MOCK_CHANNELS.length],
    event_id:         [4624, 4625, 4720, 4732, 4648][i % 5],
    event_type:       'Windows Event',
    severity:         MOCK_SEVERITIES[i % MOCK_SEVERITIES.length],
    message:          MOCK_MESSAGES[i % MOCK_MESSAGES.length],
    // Extended — present on some records only
    account_name:     i % 3 === 0 ? `user${i}`        : undefined,
    domain:           i % 3 === 0 ? 'CORP'             : undefined,
    ip_address:       i % 4 === 0 ? `192.168.1.${i % 255}` : undefined,
    process_name:     i % 5 === 0 ? 'lsass.exe'        : undefined,
    source_name:      i % 6 === 0 ? 'Microsoft-Windows-Security-Auditing' : undefined,
    target_user_name: i % 4 === 0 ? `target${i}`       : undefined,
    category:         i % 3 === 0 ? 'Logon'            : undefined,
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
  return { from: now - (map[range] || map['15m']), now }
}

// ── Query builder ──────────────────────────────────────────────────────────
// Supported syntax:
//   plain text        → full-text match on message
//   event_id:4624     → term on integer field
//   hostname:server01 → term on keyword field
//   channel:Security  → term on keyword field
//   severity:error    → term on keyword field
//   account_name:admin → term on keyword field
//   domain:CORP       → term on keyword field
const buildQuery = (search, from, now) => {
  const timeFilter = {
    range: {
      event_time: { gte: from, lte: now, format: 'epoch_millis' }
    }
  }

  if (!search?.trim()) {
    return { bool: { filter: [timeFilter] } }
  }

  const trimmed    = search.trim()
  const fieldMatch = trimmed.match(/^(\w+):(.+)$/)

  if (fieldMatch) {
    const [, field, value] = fieldMatch

    // Integer fields
    if (field === 'event_id') {
      const num = parseInt(value, 10)
      if (!isNaN(num)) {
        return { bool: { filter: [timeFilter, { term: { event_id: num } }] } }
      }
    }

    // Keyword fields
    const keywordFields = ['hostname', 'channel', 'severity', 'account_name', 'domain', 'source_name', 'process_name']
    if (keywordFields.includes(field)) {
      return { bool: { filter: [timeFilter, { term: { [field]: value } }] } }
    }
  }

  // Plain text → full-text on message
  return {
    bool: {
      filter: [timeFilter],
      must:   [{ match: { message: trimmed } }],
    }
  }
}

// ── Shape a raw ES hit into table row fields only ─────────────────────────
// Full document is fetched separately on row expand via GET /api/logs/:id
const shapeHit = (hit) => ({
  id:         hit._id,
  event_time: hit._source.event_time,
  hostname:   hit._source.hostname,
  channel:    hit._source.channel,
  event_id:   hit._source.event_id,
  message:    hit._source.message,
})

// ── GET /api/logs ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  if (MOCK) {
    return res.json({
      total:     500,
      hits:      getMockLogs(),
      nextAfter: JSON.stringify(['mock-cursor', Date.now()]),
    })
  }

  try {
    const {
      search = '',
      range  = '15m',
      size   = PAGE_SIZE,
      after  = null,
      page   = 0,         // used for display only — actual pagination via search_after
    } = req.query

    const pageSize      = Math.min(parseInt(size, 10) || PAGE_SIZE, MAX_SIZE)
    const { from, now } = getTimeRange(range)

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
        { event_time: { order: 'desc' } },
        { _id:        { order: 'desc' } },   // tiebreaker for search_after
      ],
    }

    if (after) {
      try { body.search_after = JSON.parse(after) }
      catch { return res.status(400).json({ error: 'Invalid pagination cursor.' }) }
    }

    const { data } = await esClient.post(`/${index}/_search`, body)
    const hits      = data.hits.hits

    const nextAfter = hits.length === pageSize
      ? JSON.stringify(hits[hits.length - 1].sort)
      : null

    res.json({
      total:     data.hits.total.value,
      hits:      hits.map(shapeHit),
      nextAfter,
    })

  } catch (err) {
    console.error('[LOGS] fetch error:', err.message)
    res.status(500).json({ error: 'Failed to fetch logs.' })
  }
})

module.exports = router

// ── GET /api/logs/:id ──────────────────────────────────────────────────────
// Fetches the full document by _id.
// Searches last 7 days of indices since we don't know which day the doc is in.
router.get('/:id', async (req, res) => {
  if (MOCK) {
    // Return a full mock document for UI testing
    return res.json({
      id:                  req.params.id,
      event_time:          new Date().toISOString(),
      event_id:            4624,
      event_type:          'Windows Event',
      channel:             'Security',
      hostname:            'server-dc01',
      host:                'server-dc01.corp.local',
      severity:            'information',
      severity_value:      4,
      message:             'An account was successfully logged on.',
      account_name:        'john.doe',
      account_type:        'User',
      domain:              'CORP',
      subject_user_name:   'SYSTEM',
      subject_domain_name: 'NT AUTHORITY',
      target_user_name:    'john.doe',
      target_domain_name:  'CORP',
      ip_address:          '192.168.1.45',
      ip_port:             49823,
      port:                445,
      process_id:          '0x4a2',
      process_name:        'lsass.exe',
      source_name:         'Microsoft-Windows-Security-Auditing',
      category:            'Logon',
      elevated_token:      'Yes',
      logon_process_name:  'Kerberos',
      auth_package_name:   'Kerberos',
      log_type:            'Security',
      event_category:      'Authentication',
      record_number:       1234567,
      monitor_reason:      null,
    })
  }

  try {
    const { id } = req.params

    // Search across last 7 days — we don't store which index a doc came from
    const now    = Date.now()
    const from   = now - MAX_RANGE
    const index  = getIndices(from, now)

    const { data } = await esClient.get(`/${index}/_doc/${id}`)

    if (!data.found) {
      return res.status(404).json({ error: 'Log not found.' })
    }

    res.json({ id: data._id, ...data._source })

  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'Log not found.' })
    }
    console.error('[LOGS] fetch by id error:', err.message)
    res.status(500).json({ error: 'Failed to fetch log detail.' })
  }
})