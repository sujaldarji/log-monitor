const express                  = require('express')
const { esClient, getIndices } = require('../lib/elasticsearch')
const cache                    = require('../lib/cache')

const router = express.Router()

const MOCK = process.env.USE_MOCK_DATA === 'true'

// ── Step 1.3: parse range param → ms offset ────────────────────────────────
const RANGE_MAP = {
  '15m': 15 * 60 * 1000,
  '1h':  60 * 60 * 1000,
  '6h':  6  * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

const getTimeRange = (range = '15m') => {
  const now  = Date.now()
  const from = now - (RANGE_MAP[range] || RANGE_MAP['15m'])
  return { now, from }
}

// ── Step 1.4: bucket interval per range ────────────────────────────────────
// Keeps line charts clean — 1m buckets on 24h = 1440 noisy data points
const BUCKET = {
  '15m': '1m',
  '1h':  '5m',
  '6h':  '15m',
  '24h': '1h',
}

// ── ES aggregation helper ──────────────────────────────────────────────────
const esAgg = async (index, query) => {
  const { data } = await esClient.post(`/${index}/_search`, query)
  return data
}

// ── Mock data ──────────────────────────────────────────────────────────────
const getMockLogRate = (range = '15m') => {
  const now      = Date.now()
  const duration = RANGE_MAP[range] || RANGE_MAP['15m']
  const interval = { '15m': 60000, '1h': 300000, '6h': 900000, '24h': 3600000 }[range] || 60000
  const count    = Math.floor(duration / interval)
  return Array.from({ length: count }, (_, i) => ({
    time:  new Date(now - (count - i) * interval).toISOString(),
    count: Math.floor(Math.random() * 800 + 200),
  }))
}

const getMockErrors = (range = '15m') => {
  const now      = Date.now()
  const duration = RANGE_MAP[range] || RANGE_MAP['15m']
  const interval = { '15m': 60000, '1h': 300000, '6h': 900000, '24h': 3600000 }[range] || 60000
  const count    = Math.floor(duration / interval)
  return Array.from({ length: count }, (_, i) => ({
    time:  new Date(now - (count - i) * interval).toISOString(),
    count: Math.floor(Math.random() * 20),
  }))
}

const getMockTopSources = () => [
  { hostname: 'server-dc01',    count: 1240 },
  { hostname: 'server-web02',   count: 980  },
  { hostname: 'server-db01',    count: 870  },
  { hostname: 'server-app03',   count: 760  },
  { hostname: 'server-proxy',   count: 650  },
  { hostname: 'server-backup',  count: 430  },
  { hostname: 'workstation-01', count: 310  },
  { hostname: 'workstation-02', count: 290  },
  { hostname: 'server-mon01',   count: 180  },
  { hostname: 'server-ntp',     count: 90   },
]

const getMockTopChannels = () => [
  { channel: 'Security',        count: 13420 },
  { channel: 'System',          count: 8920  },
  { channel: 'Application',     count: 3000  },
  { channel: 'Setup',           count: 2000  },
  { channel: 'ForwardedEvents', count: 1200  },
]

const getMockIndexSize = () => {
  const days = 10
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date:   d.toISOString().slice(0, 10),
      sizeGB: parseFloat((Math.random() * 4 + 7).toFixed(2)),
    }
  })
}

// ── GET /api/stats/log-rate ────────────────────────────────────────────────
router.get('/log-rate', async (req, res) => {
  const range = req.query.range || '15m'
  if (MOCK) return res.json({ data: getMockLogRate(range) })

  // Cache key includes range — prevents 15m result being served for 1h request
  const cacheKey = `stats:log-rate:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getTimeRange(range)
    const index         = getIndices(from, now)
    const interval      = BUCKET[range] || '1m'   // Step 1.4 ✅

    const result = await esAgg(index, {
      size: 0,
      query: {
        range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } }
      },
      aggs: {
        logs_per_bucket: {
          date_histogram: {
            field:           'event_time',
            fixed_interval:  interval,     // Step 1.4 ✅ — scales with range
            min_doc_count:   0,
            extended_bounds: { min: from, max: now }
          }
        }
      }
    })

    const payload = {
      data: result.aggregations.logs_per_bucket.buckets.map(b => ({
        time:  b.key_as_string,
        count: b.doc_count,
      }))
    }

    cache.set(cacheKey, payload)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] log-rate error:', err.message)
    res.status(500).json({ error: 'Failed to fetch log rate.' })
  }
})

// ── GET /api/stats/errors ──────────────────────────────────────────────────
router.get('/errors', async (req, res) => {
  const range = req.query.range || '15m'
  if (MOCK) return res.json({ data: getMockErrors(range) })

  const cacheKey = `stats:errors:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getTimeRange(range)
    const index         = getIndices(from, now)
    const interval      = BUCKET[range] || '1m'

    const result = await esAgg(index, {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } } },
            { term:  { event_id: 4625 } }
          ]
        }
      },
      aggs: {
        errors_per_bucket: {
          date_histogram: {
            field:           'event_time',
            fixed_interval:  interval,
            min_doc_count:   0,
            extended_bounds: { min: from, max: now }
          }
        }
      }
    })

    const payload = {
      data: result.aggregations.errors_per_bucket.buckets.map(b => ({
        time:  b.key_as_string,
        count: b.doc_count,
      }))
    }

    cache.set(cacheKey, payload)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] errors error:', err.message)
    res.status(500).json({ error: 'Failed to fetch error events.' })
  }
})

// ── GET /api/stats/top-sources ─────────────────────────────────────────────
router.get('/top-sources', async (req, res) => {
  const range = req.query.range || '15m'
  if (MOCK) return res.json({ data: getMockTopSources() })

  const cacheKey = `stats:top-sources:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getTimeRange(range)
    const index         = getIndices(from, now)

    const result = await esAgg(index, {
      size: 0,
      query: {
        range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } }
      },
      aggs: {
        top_sources: {
          terms: { field: 'hostname', size: 10 }
        }
      }
    })

    const payload = {
      data: result.aggregations.top_sources.buckets.map(b => ({
        hostname: b.key,
        count:    b.doc_count,
      }))
    }

    cache.set(cacheKey, payload)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] top-sources error:', err.message)
    res.status(500).json({ error: 'Failed to fetch top sources.' })
  }
})

// ── GET /api/stats/top-channels ────────────────────────────────────────────
router.get('/top-channels', async (req, res) => {
  const range = req.query.range || '15m'
  if (MOCK) return res.json({ data: getMockTopChannels() })

  const cacheKey = `stats:top-channels:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getTimeRange(range)
    const index         = getIndices(from, now)

    const result = await esAgg(index, {
      size: 0,
      query: {
        range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } }
      },
      aggs: {
        top_channels: {
          terms: { field: 'channel', size: 5 }
        }
      }
    })

    const payload = {
      data: result.aggregations.top_channels.buckets.map(b => ({
        channel: b.key,
        count:   b.doc_count,
      }))
    }

    cache.set(cacheKey, payload)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] top-channels error:', err.message)
    res.status(500).json({ error: 'Failed to fetch top channels.' })
  }
})

// ── GET /api/stats/summary ─────────────────────────────────────────────────
// Key metrics strip — total logs, errors, unique hosts, top event id
router.get('/summary', async (req, res) => {
  const range = req.query.range || '15m'

  if (MOCK) return res.json({
  data: {
    current:  { totalLogs: 84320, errorCount: 324, errorRate: 0.4, criticalCount: 12, uniqueHosts: 8, topEventId: 4625, loginFailures: 47, powershellCount: 231 },
    previous: { totalLogs: 91200, errorCount: 224, errorRate: 0.2, criticalCount: 4,  uniqueHosts: 7, loginFailures: 12, powershellCount: 180 },
   }
  })

  const cacheKey = `stats:summary:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const now      = Date.now()
    const offset   = RANGE_MAP[range] || RANGE_MAP['15m']

    // Current window:  now-offset → now
    // Previous window: now-2*offset → now-offset
    const currFrom = now - offset
    const prevFrom = now - offset * 2
    const prevTo   = currFrom

    const currIndex = getIndices(currFrom, now)
    const prevIndex = getIndices(prevFrom, prevTo)

    // Replace aggBody with this
    const aggBody = (from, to) => ({
  size: 0,
  // no track_total_hits needed — using value_count agg instead
  query: { bool: { filter: [{ range: { event_time: { gte: from, lte: to, format: 'epoch_millis' } } }] } },
  aggs: {
    total_logs:       { value_count: { field: '_id'              } },
    error_count:      { filter: { term: { severity: 'error'              } } },
    critical_count:   { filter: { term: { severity: 'critical'           } } },
    unique_hosts:     { cardinality: { field: 'hostname'                  } },
    top_event_id:     { terms: { field: 'event_id', size: 1              } },
    login_failures:   { filter: { term: { event_id: 4625                 } } },
    powershell_count: { filter: { term: { channel: 'windows powershell'  } } },
  }
})


    // Fetch both windows in parallel — one extra ES query, negligible cost
    const [curr, prev] = await Promise.all([
      esAgg(currIndex, aggBody(currFrom, now)),
      esAgg(prevIndex, aggBody(prevFrom, prevTo)),
    ])

    const shape = (r) => {
  const total  = r.aggregations.total_logs.value   // ← from agg, not hits.total
  const errors = r.aggregations.error_count.doc_count
  const rate   = total > 0 ? parseFloat(((errors / total) * 100).toFixed(1)) : 0
  return {
    totalLogs:       total,
    errorCount:      errors,
    errorRate:       rate,
    criticalCount:   r.aggregations.critical_count.doc_count,
    uniqueHosts:     r.aggregations.unique_hosts.value,
    loginFailures:   r.aggregations.login_failures.doc_count,
    powershellCount: r.aggregations.powershell_count.doc_count,
  }
}

    const payload = {
      data: {
        current:  { ...shape(curr), topEventId: curr.aggregations.top_event_id.buckets[0]?.key ?? null },
        previous: shape(prev),
      }
    }

    cache.set(cacheKey, payload)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] summary error:', err.message)
    res.status(500).json({ error: 'Failed to fetch summary.' })
  }
})


const INDEX_SIZE_CACHE_TTL = 5 * 60 * 1000
const INDEX_SIZE_DAYS      = 10

router.get('/index-size', async (_req, res) => {
  if (MOCK) return res.json({ data: getMockIndexSize() })

  const cacheKey = 'stats:index-size'
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const prefix = process.env.ES_INDEX_PREFIX || 'test-logs-elk'

    const { data } = await esClient.get(
      `/_cat/indices/${prefix}-*?format=json&h=index,store.size&s=index:asc`
    )

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - INDEX_SIZE_DAYS)

    const parseSize = (sizeStr) => {
      if (!sizeStr) return 0
      const s = sizeStr.toLowerCase().trim()
      if (s.endsWith('tb')) return parseFloat(s) * 1024
      if (s.endsWith('gb')) return parseFloat(s)
      if (s.endsWith('mb')) return parseFloat((parseFloat(s) / 1024).toFixed(3))
      if (s.endsWith('kb')) return parseFloat((parseFloat(s) / 1024 / 1024).toFixed(6))
      return 0
    }

    const payload = {
      data: data
        .map(entry => {
          const match = entry.index.match(/(\d{4})\.(\d{2})\.(\d{2})$/)
          if (!match) return null
          const date = `${match[1]}-${match[2]}-${match[3]}`
          return { date, sizeGB: parseSize(entry['store.size']) }
        })
        .filter(e => e !== null && new Date(e.date) >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    cache.set(cacheKey, payload, INDEX_SIZE_CACHE_TTL)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] index-size error:', err.message)
    res.status(500).json({ error: 'Failed to fetch index sizes.' })
  }
})

// ── GET /api/stats/login-failure-rate ─────────────────────────────────────
// % failure rate per time bucket: 4625 / (4624 + 4625) * 100
router.get('/login-failure-rate', async (req, res) => {
  const range = req.query.range || '15m'
  if (MOCK) {
    const now      = Date.now()
    const duration = RANGE_MAP[range] || RANGE_MAP['15m']
    const interval = { '15m': 60000, '1h': 300000, '6h': 900000, '24h': 3600000 }[range] || 60000
    const count    = Math.floor(duration / interval)
    return res.json({
      data: Array.from({ length: count }, (_, i) => ({
        time: new Date(now - (count - i) * interval).toISOString(),
        rate: parseFloat((Math.random() * 15).toFixed(1)),
      }))
    })
  }
 
  const cacheKey = `stats:login-rate:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)
 
  try {
    const { now, from } = getTimeRange(range)
    const index         = getIndices(from, now)
    const interval      = BUCKET[range] || '1m'
    const timeFilter    = { range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } } }
 
    const result = await esAgg(index, {
      size: 0,
      query: { bool: { filter: [timeFilter, { terms: { event_id: [4624, 4625] } }] } },
      aggs: {
        by_time: {
          date_histogram: { field: 'event_time', fixed_interval: interval, min_doc_count: 0, extended_bounds: { min: from, max: now } },
          aggs: {
            failures: { filter: { term: { event_id: 4625 } } },
          }
        }
      }
    })
 
    const payload = {
      data: result.aggregations.by_time.buckets.map(b => {
        const total    = b.doc_count
        const failures = b.failures.doc_count
        const rate     = total > 0 ? parseFloat(((failures / total) * 100).toFixed(1)) : 0
        return { time: b.key_as_string, rate }
      })
    }
    cache.set(cacheKey, payload)
    res.json(payload)
  } catch (err) {
    console.error('[STATS] login-rate error:', err.message)
    res.status(500).json({ error: 'Failed to fetch login failure rate.' })
  }
})


// ── GET /api/stats/powershell-activity ───────────────────────────────────
router.get('/powershell-activity', async (req, res) => {
  const range = req.query.range || '15m'
  if (MOCK) {
    const now      = Date.now()
    const duration = RANGE_MAP[range] || RANGE_MAP['15m']
    const interval = { '15m': 60000, '1h': 300000, '6h': 900000, '24h': 3600000 }[range] || 60000
    const count    = Math.floor(duration / interval)
    return res.json({
      data: Array.from({ length: count }, (_, i) => ({
        time:  new Date(now - (count - i) * interval).toISOString(),
        count: Math.floor(Math.random() * 30),
      }))
    })
  }
 
  const cacheKey = `stats:powershell:${range}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)
 
  try {
    const { now, from } = getTimeRange(range)
    const index         = getIndices(from, now)
    const interval      = BUCKET[range] || '1m'
 
    const result = await esAgg(index, {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { event_time: { gte: from, lte: now, format: 'epoch_millis' } } },
            { term:  { channel: 'windows powershell' } },
          ]
        }
      },
      aggs: {
        by_time: {
          date_histogram: { field: 'event_time', fixed_interval: interval, min_doc_count: 0, extended_bounds: { min: from, max: now } }
        }
      }
    })
 
    const payload = {
      data: result.aggregations.by_time.buckets.map(b => ({
        time:  b.key_as_string,
        count: b.doc_count,
      }))
    }
    cache.set(cacheKey, payload)
    res.json(payload)
  } catch (err) {
    console.error('[STATS] powershell error:', err.message)
    res.status(500).json({ error: 'Failed to fetch PowerShell activity.' })
  }
})

module.exports = router