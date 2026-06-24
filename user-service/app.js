const express      = require('express')
const cookieParser = require('cookie-parser')
const cors         = require('cors')
const userRoutes   = require('./routes/user.routes')

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use('/api/users', userRoutes)

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'user-service running', timestamp: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  console.error('[app] unhandled error:', err.message)
  res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal server error' })
})

module.exports = app
