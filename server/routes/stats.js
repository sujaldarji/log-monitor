const express            = require('express')
const { esClient, getIndices } = require('../lib/elasticsearch')
const cache              = require('../lib/cache')

const router = express.Router()



// ── Mock data for UI testing without Elasticsearch ─────────────────────────
const MOCK = process.env.USE_MOCK_DATA === 'true'

const getMockLogRate = () => {
  const now = Date.now()
  return Array.from({ length: 15 }, (_, i) => ({
    time:  new Date(now - (14 - i) * 60000).toISOString(),
    count: Math.floor(Math.random() * 800 + 200),
  }))
}

const getMockErrors = () => {
  const now = Date.now()
  return Array.from({ length: 15 }, (_, i) => ({
    time:  new Date(now - (14 - i) * 60000).toISOString(),
    count: Math.floor(Math.random() * 20),
  }))
}

const getMockTopSources = () => [
  { hostname: 'server-dc01',   count: 1240 },
  { hostname: 'server-web02',  count: 980  },
  { hostname: 'server-db01',   count: 870  },
  { hostname: 'server-app03',  count: 760  },
  { hostname: 'server-proxy',  count: 650  },
  { hostname: 'server-backup', count: 430  },
  { hostname: 'workstation-01',count: 310  },
  { hostname: 'workstation-02',count: 290  },
  { hostname: 'server-mon01',  count: 180  },
  { hostname: 'server-ntp',    count: 90   },
]

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Builds a standard time range in milliseconds.
 * Dashboard always queries the last 15 minutes.
 */
const getLast15Min = () => {
  const now  = Date.now()
  const from = now - 15 * 60 * 1000
  return { now, from }
}

/**
 * Runs an ES aggregation query against the correct daily index.
 * Uses size:0 — never fetches raw documents, only aggregation results.
 */
const esAgg = async (index, query) => {
  const { data } = await esClient.post(`/${index}/_search`, query)
  return data
}

// ── GET /api/stats/log-rate ────────────────────────────────────────────────
// Logs per minute for the last 15 minutes (line chart data)
router.get('/log-rate', async (_req, res) => {
    if (MOCK) return res.json({ data: getMockLogRate() })
  const cacheKey = 'stats:log-rate'
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getLast15Min()
    const index         = getIndices(from, now)

    const result = await esAgg(index, {
      size: 0,                          // aggregation only — no documents
      query: {
        range: {
          '@timestamp': { gte: from, lte: now, format: 'epoch_millis' }
        }
      },
      aggs: {
        logs_per_minute: {
          date_histogram: {
            field:          '@timestamp',
            fixed_interval: '1m',
            min_doc_count:  0,          // include empty buckets so chart has no gaps
            extended_bounds: { min: from, max: now }
          }
        }
      }
    })

    // Shape for ECharts: [{ time, count }]
    const buckets = result.aggregations.logs_per_minute.buckets
    const payload = {
      data: buckets.map(b => ({
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
// Error events (eventid 4625 = failed login) per minute for last 15 minutes
router.get('/errors', async (_req, res) => {
     if (MOCK) return res.json({ data: getMockErrors() })
  const cacheKey = 'stats:errors'
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getLast15Min()
    const index         = getIndices(from, now)

    const result = await esAgg(index, {
      size: 0,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: from, lte: now, format: 'epoch_millis' } } },
            { term:  { eventid: 4625 } }    // Windows failed login event
          ]
        }
      },
      aggs: {
        errors_per_minute: {
          date_histogram: {
            field:          '@timestamp',
            fixed_interval: '1m',
            min_doc_count:  0,
            extended_bounds: { min: from, max: now }
          }
        }
      }
    })

    const buckets = result.aggregations.errors_per_minute.buckets
    const payload = {
      data: buckets.map(b => ({
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
// Top 10 hostnames by log volume in the last 15 minutes (bar chart)
router.get('/top-sources', async (_req, res) => {
    if (MOCK) return res.json({ data: getMockTopSources() })
  const cacheKey = 'stats:top-sources'
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getLast15Min()
    const index         = getIndices(from, now)

    const result = await esAgg(index, {
      size: 0,
      query: {
        range: {
          '@timestamp': { gte: from, lte: now, format: 'epoch_millis' }
        }
      },
      aggs: {
        top_sources: {
          terms: {
            field: 'hostname',  // keyword field — exact match
            size:  10,          // top 10 only
          }
        }
      }
    })

    const buckets = result.aggregations.top_sources.buckets
    const payload = {
      data: buckets.map(b => ({
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



// ── Mock data for new charts ───────────────────────────────────────────────
const getMockTopEvents = () => [
  { eventid: 4624, count: 13420 },
  { eventid: 4625, count: 8920  },
  { eventid: 4634, count: 3000  },
  { eventid: 4672, count: 2000  },
  { eventid: 4720, count: 1200  },
]

const getMockIndexSize = () => {
  const days = 10
  return Array.from({ length: days }, (_, i) => {
    const d    = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const date = d.toISOString().slice(0, 10)
    return {
      date,
      sizeGB: parseFloat((Math.random() * 4 + 7).toFixed(2)),  // 7–11 GB range
    }
  })
}

// ── GET /api/stats/top-events ──────────────────────────────────────────────
// Top 5 Windows event IDs by volume in the last 15 minutes
router.get('/top-events', async (_req, res) => {
  if (MOCK) return res.json({ data: getMockTopEvents() })

  const cacheKey = 'stats:top-events'
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const { now, from } = getLast15Min()
    const index         = getIndices(from, now)

    const result = await esAgg(index, {
      size: 0,
      query: {
        range: {
          '@timestamp': { gte: from, lte: now, format: 'epoch_millis' }
        }
      },
      aggs: {
        top_events: {
          terms: {
            field: 'eventid',
            size:  5,
          }
        }
      }
    })

    const buckets = result.aggregations.top_events.buckets
    const payload = {
      data: buckets.map(b => ({
        eventid: b.key,
        count:   b.doc_count,
      }))
    }

    cache.set(cacheKey, payload)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] top-events error:', err.message)
    res.status(500).json({ error: 'Failed to fetch top events.' })
  }
})

// ── GET /api/stats/index-size ──────────────────────────────────────────────
// Daily index sizes for last 10 days using _cat/indices API.
// If fewer than 10 indices exist (e.g. system is new), returns however many are available.
// Cached for 5 minutes — index sizes change slowly
const INDEX_SIZE_CACHE_TTL = 5 * 60 * 1000
const INDEX_SIZE_DAYS      = 10

router.get('/index-size', async (_req, res) => {
  if (MOCK) return res.json({ data: getMockIndexSize() })

  const cacheKey = 'stats:index-size'
  const cached   = cache.get(cacheKey)
  if (cached) return res.json(cached)

  try {
    const prefix = process.env.ES_INDEX_PREFIX || 'test-logs-elk'

    // _cat/indices returns lightweight index metadata including store size
    const { data } = await esClient.get(
      `/_cat/indices/${prefix}-*?format=json&h=index,store.size&s=index:asc`
    )

    // Calculate cutoff — last INDEX_SIZE_DAYS days
    // No hard requirement: if only 5 indices exist, all 5 are returned
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
          // Extract date from index name: test-logs-elk-2026.03.05 → 2026-03-05
          const match = entry.index.match(/(\d{4})\.(\d{2})\.(\d{2})$/)
          if (!match) return null
          const date = `${match[1]}-${match[2]}-${match[3]}`
          return { date, sizeGB: parseSize(entry['store.size']) }
        })
        .filter(e => e !== null && new Date(e.date) >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Cache for 5 minutes instead of default 30s
    cache.set(cacheKey, payload, INDEX_SIZE_CACHE_TTL)
    res.json(payload)

  } catch (err) {
    console.error('[STATS] index-size error:', err.message)
    res.status(500).json({ error: 'Failed to fetch index sizes.' })
  }
})

module.exports = router