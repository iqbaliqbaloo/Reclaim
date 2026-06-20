require('dotenv').config()

const http = require('http')
const app  = require('./app')
const pool = require('./db')
const { setupWebSocket } = require('./services/websocket.service')
const { processAutoConfirm } = require('./services/chat.service')

const PORT   = process.env.PORT || 4007
const server = http.createServer(app)

// attach WebSocket to same HTTP server
setupWebSocket(server)

server.listen(PORT, () => {
  console.log(`[server] chat-service listening on port ${PORT}`)
  console.log(`[server] WebSocket on ws://localhost:${PORT}`)
})

// background job every hour
setInterval(async () => {
  console.log('[server] running auto-confirm job...')
  try { await processAutoConfirm() }
  catch (err) { console.error('[server] auto-confirm error:', err.message) }
}, 60 * 60 * 1000)

process.on('unhandledRejection', err => { console.error('[server]', err.message); process.exit(1) })
process.on('uncaughtException',  err => { console.error('[server]', err.message); process.exit(1) })