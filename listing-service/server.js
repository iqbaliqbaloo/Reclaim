require('dotenv').config()
const app  = require('./app')
const pool = require('./db')

const PORT = process.env.PORT || 4003

app.listen(PORT)

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err.message)
  process.exit(1)
})
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err.message)
  process.exit(1)
})
