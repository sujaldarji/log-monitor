require('dotenv').config()

const express      = require('express')
const cors         = require('cors')
const jwt          = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const authRoutes = require('./routes/auth')
const statsRoutes = require('./routes/stats')
const logsRoutes  = require('./routes/logs')

const app           = express()
const PORT          = process.env.PORT          || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5000'
const JWT_SECRET    = process.env.JWT_SECRET    || 'change-this-secret-in-production'


// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,       // required for cookies to be sent cross-origin
}))
app.use(express.json())
app.use(cookieParser())    // parses req.cookies

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// ── Auth middleware ────────────────────────────────────────────────────────
// Reads JWT from httpOnly cookie (set by POST /api/auth/login)
const requireAuth = (req, res, next) => {
  const token = req.cookies?.lm_token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized — no session cookie.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    // Clear the invalid/expired cookie so the client redirects to login
    res.clearCookie('lm_token')
    return res.status(401).json({ error: 'Session expired. Please log in again.' })
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// Validate session — frontend calls this on app load to check if cookie is still valid
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username })
})

// Placeholder protected routes — filled in during Dashboard/Explorer steps
app.use('/api/stats', requireAuth, statsRoutes)
app.use('/api/logs',  requireAuth, logsRoutes)

// ── 404 fallback ───────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))


// Kibana URL — keeps infrastructure URL in .env, not hardcoded in frontend
app.get('/api/config/kibana-url', requireAuth, (_req, res) => {
  res.json({ url: process.env.KIBANA_URL || null })
})

app.listen(PORT, () => {
  console.log(`\n   Log Monitor API → http://localhost:${PORT}`)
  console.log(`   CORS origin : ${CLIENT_ORIGIN}`)
  console.log(`   ES target   : ${process.env.ES_URL || 'NOT SET'}`)
})