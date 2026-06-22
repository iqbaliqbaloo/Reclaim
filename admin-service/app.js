// app.js
const express   = require('express')
const cookie    = require('cookie-parser')
const cors      = require('cors')
const routes    = require('./routes/admin.routes')

const app = express()
app.use(express.json())
app.use(cookie())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use('/admin', routes)

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'admin-service running' })
})

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: err.message })
})

module.exports = app
