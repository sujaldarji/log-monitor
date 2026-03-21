const express                  = require('express')
const { esClient, getIndices } = require('../lib/elasticsearch')

const router = express.Router()

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 50
const MAX_SIZE  = 100
const MAX_RANGE = 7 * 24 * 60 * 60 * 1000

// Table view — minimal fields only, full doc fetched on expand
const SOURCE_FIELDS = [
  'event_time', 'event_id', 'channel',
  'hostname',   'message',  'severity',
]

// ── Mock data ──────────────────────────────────────────────────────────────
const MOCK = process.env.USE_MOCK_DATA === 'true'

const MOCK_HOSTNAMES  = ['server-dc01', 'server-web02', 'server-db01', 'server-app03', 'workstation-01']
const MOCK_CHANNELS   = ['security', 'system', 'application', 'setup']
const MOCK_SEVERITIES = ['information', 'warning', 'error', 'critical']
const MOCK_MESSAGES   = [
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
    id:         `mock-${i}-${now}`,
    _index:     `windows-logs-${new Date().toISOString().slice(0,10).replace(/-/g,'.')}`,
    event_time: new Date(now - i * 18000).toISOString(),
    hostname:   MOCK_HOSTNAMES[i % MOCK_HOSTNAMES.length],
    channel:    MOCK_CHANNELS[i % MOCK_CHANNELS.length],
    event_id:   [4624, 4625, 4720, 4732, 4648][i % 5],
    severity:   MOCK_SEVERITIES[i % MOCK_SEVERITIES.length],
    message:    MOCK_MESSAGES[i % MOCK_MESSAGES.length],
  }))
}

// ── Time range helper ──────────────────────────────────────────────────────
const RANGE_MAP = {
  '15m': 15 * 60 * 1000,
  '1h':  60 * 60 * 1000,
  '6h':  6  * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

const getTimeRange = (range = '15m') => {
  const now  = Date.now()
  const from = now - (RANGE_MAP[range] || RANGE_MAP['15m'])
  return { from, now }
}

// ── Query builder ──────────────────────────────────────────────────────────
// Supports two modes:
//
// MODE 1 — structured filters (from drill-down URL params)
//   hostname, channel, event_id, severity passed as individual params
//   All combined with AND logic
//
// MODE 2 — freetext search (from search bar)
//   plain text       → full-text on message
//   field:value      → term filter on that field
//
// MODE 1 takes priority — if any structured filter is present,
// freetext search is ignored (Replace behavior)
const buildQuery = (params, from, now) => {
  const { search, hostname, channel, event_id, severity } = params

  const timeFilter = {
    range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } }
  }

  const filters = [timeFilter]

  // ── MODE 1: structured drill-down filters ────────────────────────────────
  const hasStructured = hostname || channel || event_id || severity

  if (hasStructured) {
    if (hostname)  filters.push({ term: { hostname } })
    if (channel)   filters.push({ term: { channel: channel.toLowerCase() } })
    if (severity)  filters.push({ term: { severity: severity.toLowerCase() } })
    if (event_id) {
      const num = parseInt(event_id, 10)
      if (!isNaN(num)) filters.push({ term: { event_id: num } })
    }
    return { bool: { filter: filters } }
  }

  // ── MODE 2: freetext / field:value search ────────────────────────────────
  if (!search?.trim()) {
    return { bool: { filter: filters } }
  }

  const trimmed    = search.trim()
  const fieldMatch = trimmed.match(/^(\w+):(.+)$/)

  if (fieldMatch) {
    const [, field, value] = fieldMatch

    if (field === 'event_id') {
      const num = parseInt(value, 10)
      if (!isNaN(num)) {
        filters.push({ term: { event_id: num } })
        return { bool: { filter: filters } }
      }
    }

    const keywordFields = ['hostname', 'channel', 'severity', 'account_name', 'domain', 'source_name', 'process_name']
    if (keywordFields.includes(field)) {
      filters.push({ term: { [field]: value } })
      return { bool: { filter: filters } }
    }
  }

  // Plain text → full-text on message
  return {
    bool: {
      filter: filters,
      must:   [{ match: { message: trimmed } }],
    }
  }
}

// ── Shape list row — includes _index for fast detail fetch ─────────────────
const shapeHit = (hit) => ({
  id:         hit._id,
  _index:     hit._index,       // exact index — avoids 7-day scan on detail fetch
  event_time: hit._source.event_time,
  hostname:   hit._source.hostname,
  channel:    hit._source.channel,
  event_id:   hit._source.event_id,
  severity:   hit._source.severity,
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
      search   = '',
      range    = '15m',
      size     = PAGE_SIZE,
      after    = null,
      // structured drill-down filters
      hostname, channel, event_id, severity,
    } = req.query

    const pageSize      = Math.min(parseInt(size, 10) || PAGE_SIZE, MAX_SIZE)
    const { from, now } = getTimeRange(range)

    if (now - from > MAX_RANGE) {
      return res.status(400).json({ error: 'Time range exceeds 7 day maximum.' })
    }

    const index = getIndices(from, now)
    const query = buildQuery({ search, hostname, channel, event_id, severity }, from, now)

    const body = {
      size:    pageSize,
      _source: SOURCE_FIELDS,
      query,
      sort: [
        { event_time:  { order: 'desc' } },
        { _shard_doc:  { order: 'desc' } },  // deterministic tiebreaker, zero fielddata overhead
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

// ── GET /api/logs/:id ──────────────────────────────────────────────────────
// Uses exact _index passed from frontend — avoids scanning 7 daily indices
router.get('/:id', async (req, res) => {
  if (MOCK) {
    return res.json({
      id:                  req.params.id,
      event_time:          new Date().toISOString(),
      event_id:            4624,
      event_type:          'Windows Event',
      channel:             'security',
      hostname:            'server-dc01',
      host:                'server-dc01.corp.local',
      severity:            'information',
      severity_value:      4,
      message:             'An account was successfully logged on.',
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
      record_number:       1234567,
    })
  }

  try {
    const { id }    = req.params
    const raw       = req.query.index
    const index     = typeof raw === 'string' && raw.length > 0
      ? raw
      : getIndices(Date.now() - MAX_RANGE, Date.now())  // fallback to 7-day scan

    const { data } = await esClient.post(`/${index}/_search`, {
      size:  1,
      query: { ids: { values: [id] } },
    })

    const hit = data.hits?.hits?.[0]
    if (!hit) return res.status(404).json({ error: 'Log not found.' })

    res.json({ id: hit._id, ...hit._source })

  } catch (err) {
    console.error('[LOGS] detail error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Failed to fetch log detail.' })
  }
})

// ── GET /api/logs/recent ───────────────────────────────────────────────────
// Dashboard preview table — errors and critical only, newest first.
// All filter behaviour is controlled by query params — change params,
// not the component, when requirements change.
//
// Params:
//   range    — 15m | 1h | 6h | 24h  (default: 15m)
//   limit    — number of rows        (default: 10, max: 50)
//   severity — comma-separated list  (default: error,critical)
//   channel  — optional channel filter
//
// User field: target_user_name → subject_user_name → account_name → null

const RECENT_SOURCE = [
  'event_time', 'hostname', 'channel',
  'event_id',   'severity', 'message',
  'target_user_name', 'subject_user_name', 'account_name',
]

const getMockRecent = (limit = 10) => {
  const now  = Date.now()
  const rows = [
    { severity: 'critical', event_id: 4625, channel: 'security',    hostname: 'server-dc01',    message: 'An account failed to log on.',                       target_user_name: 'john.doe'   },
    { severity: 'error',    event_id: 4625, channel: 'security',    hostname: 'server-web02',   message: 'An account failed to log on.',                       target_user_name: 'admin'      },
    { severity: 'critical', event_id: 4625, channel: 'security',    hostname: 'server-db01',    message: 'An account failed to log on.',                       target_user_name: 'sa'         },
    { severity: 'error',    event_id: 7034, channel: 'system',      hostname: 'server-app03',   message: 'The Print Spooler service terminated unexpectedly.', target_user_name: null         },
    { severity: 'error',    event_id: 1001, channel: 'application', hostname: 'workstation-01', message: 'Windows Error Reporting.',                           target_user_name: null         },
    { severity: 'critical', event_id: 4625, channel: 'security',    hostname: 'server-dc01',    message: 'An account failed to log on.',                       subject_user_name: 'SYSTEM'    },
    { severity: 'error',    event_id: 4625, channel: 'security',    hostname: 'server-web02',   message: 'An account failed to log on.',                       target_user_name: 'bob'        },
    { severity: 'error',    event_id: 6008, channel: 'system',      hostname: 'server-db01',    message: 'The previous system shutdown was unexpected.',        target_user_name: null         },
    { severity: 'critical', event_id: 4625, channel: 'security',    hostname: 'server-app03',   message: 'An account failed to log on.',                       account_name:     'svc_backup' },
    { severity: 'error',    event_id: 4625, channel: 'security',    hostname: 'server-dc01',    message: 'An account failed to log on.',                       target_user_name: 'alice'      },
  ]
  return rows.slice(0, limit).map((r, i) => ({
    id:         `mock-recent-${i}`,
    event_time: new Date(now - i * 25000).toISOString(),
    ...r,
    user: r.target_user_name ?? r.subject_user_name ?? r.account_name ?? null,
  }))
}

router.get('/recent', async (req, res) => {
  const range    = req.query.range    || '15m'
  const limit    = Math.min(parseInt(req.query.limit, 10) || 10, 50)
  const severity = req.query.severity || 'error,critical'
  const channel  = req.query.channel  || null

  if (MOCK) return res.json({ data: getMockRecent(limit) })

  try {
    const { from, now } = getTimeRange(range)
    const index         = getIndices(from, now)

    // Build severity filter from comma-separated param
    // e.g. severity=error,critical → terms filter
    const severityList = severity.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)

    const filters = [
      { range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } } },
      { terms: { severity: severityList } },
    ]

    if (channel) filters.push({ term: { channel: channel.toLowerCase() } })

    const { data } = await esClient.post(`/${index}/_search`, {
      size:    limit,
      _source: RECENT_SOURCE,
      query:   { bool: { filter: filters } },
      sort:    [
        { event_time: { order: 'desc' } },
        { _shard_doc: { order: 'desc' } },
      ],
    })

    const hits = data.hits?.hits ?? []

    res.json({
      data: hits.map(h => ({
        id:         h._id,
        event_time: h._source.event_time,
        hostname:   h._source.hostname,
        channel:    h._source.channel,
        event_id:   h._source.event_id,
        severity:   h._source.severity,
        message:    h._source.message,
        // Resolved user field — first non-null wins
        user: h._source.target_user_name
           ?? h._source.subject_user_name
           ?? h._source.account_name
           ?? null,
      }))
    })

  } catch (err) {
    console.error('[LOGS] recent error:', err.message)
    res.status(500).json({ error: 'Failed to fetch recent logs.' })
  }
})

// ── module.exports MUST be after all routes ────────────────────────────────
module.exports = router