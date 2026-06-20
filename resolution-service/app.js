// app.js
const express   = require('express')
const cors      = require('cors')
const routes    = require('./routes/resolution.routes')

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use('/resolutions', routes)

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'resolution-service running' })
})

module.exports = app