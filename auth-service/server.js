require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')
const dns = require('node:dns').promises
dns.setServers(['1.1.1.1', '1.0.0.1'])

const PORT     = process.env.PORT || 4001
const MONGO_URI = process.env.MONGODB_URI

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT)
  })
  .catch((err) => {
    console.error('[server] MongoDB connection failed:', err.message)
    process.exit(1)
  })

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err.message)
  process.exit(1)
})
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err.message)
  process.exit(1)
})
