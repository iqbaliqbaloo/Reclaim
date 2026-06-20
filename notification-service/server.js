require('dotenv').config()

const app  = require('./app')
const pool = require('./db')
const { processEmailQueue } = require('./services/notification.service')

const PORT = process.env.PORT || 4008

app.listen(PORT, () => {
  console.log(`[server] notification-service listening on port ${PORT}`)
})

// process email queue every 1 minute — max 50 emails per run
setInterval(async () => {
  try { await processEmailQueue() }
  catch (err) { console.error('[server] email queue error:', err.message) }
}, 60 * 1000)

process.on('unhandledRejection', err => { console.error('[server]', err.message); process.exit(1) })
process.on('uncaughtException',  err => { console.error('[server]', err.message); process.exit(1) })