const express      = require('express')
const cookieParser = require('cookie-parser')
const cors         = require('cors')
const claimRoutes  = require('./routes/claim.routes')

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use('/claims', claimRoutes)

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'claim-service running', timestamp: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  console.error('[app] error:', err.message)
  res.status(err.statusCode || 500).json({ success: false, error: err.message })
})

module.exports = app