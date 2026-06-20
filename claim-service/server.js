require('dotenv').config()

const app  = require('./app')
const pool = require('./db')
const { processExpiredClaims, sendClaimReminders } = require('./services/claim.service')

const PORT = process.env.PORT || 4006

app.listen(PORT, () => {
  console.log(`[server] claim-service listening on port ${PORT}`)
})

setInterval(async () => {
  console.log('[server] running background jobs...')
  try {
    await processExpiredClaims()
    await sendClaimReminders()
  } catch (err) {
    console.error('[server] background job error:', err.message)
  }
}, 15 * 60 * 1000)  // 15 minutes

process.on('unhandledRejection', err => { console.error('[server]', err.message); process.exit(1) })
process.on('uncaughtException',  err => { console.error('[server]', err.message); process.exit(1) })