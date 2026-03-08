import axios from 'axios'

/**
 * Central axios instance.
 * - withCredentials: true sends the httpOnly cookie on every request
 * - 401 interceptor auto-redirects to login on expired session
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── 401 interceptor ────────────────────────────────────────────────────────
// If any request gets a 401 (expired/missing cookie), clear state and
// redirect to login. Handles session expiry transparently across all pages.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lm_username')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api