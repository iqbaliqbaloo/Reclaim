require('dotenv').config()

const app  = require('./app')
const pool = require('./db')   // importing triggers connection test

const PORT = process.env.PORT || 4002

console.log('[server] starting user-service...')
console.log('[server] port:', PORT)
console.log('[server] NODE_ENV:', process.env.NODE_ENV)
console.log('[server] PostgreSQL host:', process.env.POSTGRES_HOST || 'localhost')

app.listen(PORT, () => {
  console.log(`[server] user-service listening on port ${PORT}`)
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