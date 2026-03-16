const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const fs       = require('fs')
const path     = require('path')

const router = express.Router()

const USERS_FILE  = process.env.USERS_FILE
  ? path.resolve(process.env.USERS_FILE)
  : path.join(__dirname, '..', 'users.json')

const JWT_SECRET  = process.env.JWT_SECRET 
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h'

// Cookie settings
// In production (HTTPS on VM3), flip secure: true
const COOKIE_OPTIONS = {
  httpOnly: true,                                   // JS cannot read this cookie
  secure:   process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'lax',                                  // CSRF protection
  maxAge:   8 * 60 * 60 * 1000,                    // mirrors JWT_EXPIRES (8h in ms)
}

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' })
    }

    // Load users fresh on every request (supports live edits without restart)
    const raw       = fs.readFileSync(USERS_FILE, 'utf-8')
    const { users } = JSON.parse(raw)

    const user = users.find(u => u.username === username)

    // Same generic message whether username or password is wrong
    // — avoids leaking which field was incorrect
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' })
    }

    // Default to 'user' role if not set in users.json
    const role = user.role || 'user'

    // Sign token
    const token = jwt.sign(
      { username: user.username, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    )

    // Set JWT as httpOnly cookie — never exposed to JavaScript
    res.cookie('lm_token', token, COOKIE_OPTIONS)

    // Return only non-sensitive data in the body
    return res.json({ username: user.username, role })

  } catch (err) {
    console.error('[AUTH] Login error:', err.message)
    return res.status(500).json({ error: 'Internal server error.' })
  }
})

// ── POST /api/auth/logout ──────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  // Clear the cookie by setting maxAge to 0
  res.clearCookie('lm_token', COOKIE_OPTIONS)
  res.json({ message: 'Logged out.' })
})

module.exports = router