/*
  ============================================================
  APP.JS — Express app setup for match-service
  ============================================================
*/

const express      = require('express')
const cookieParser = require('cookie-parser')
const cors         = require('cors')

const matchRoutes = require('./routes/match.routes')

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

app.use('/matches', matchRoutes)

app.get('/health', (req, res) => {
  console.log('[app] health check called')
  res.json({
    success:   true,
    message:   'match-service running',
    timestamp: new Date().toISOString()
  })
})

app.use((err, req, res, next) => {
  console.error('[app] unhandled error:', err.message)
  res.status(err.statusCode || 500).json({
    success: false,
    error:   err.message || 'Internal server error'
  })
})

module.exports = app