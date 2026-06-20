require('dotenv').config()

const app  = require('./app')
const pool = require('./db')

const PORT = process.env.PORT || 4003

console.log('[server] starting listing-service...')
console.log('[server] port:', PORT)
console.log('[server] database:', process.env.POSTGRES_DB || 'reclaim_listings')

app.listen(PORT, () => {
  console.log(`[server] listing-service listening on port ${PORT}`)
  console.log(`[server] health check: http://localhost:${PORT}/health`)
})

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err.message)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err.message)
  process.exit(1)
})