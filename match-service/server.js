require('dotenv').config()

const app  = require('./app')
const pool = require('./db')

const PORT = process.env.PORT || 4005

app.listen(PORT, () => {
  console.error(`[server] match-service listening on port ${PORT}`)
})

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err.message)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err.message)
  process.exit(1)
})
