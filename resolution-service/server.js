// server.js
require('dotenv').config()
const app  = require('./app')
const pool = require('./db')
const PORT = process.env.PORT || 4011

app.listen(PORT, () => console.error(`[server] resolution-service on port ${PORT}`))

process.on('unhandledRejection', err => { console.error('[server]', err.message); process.exit(1) })
process.on('uncaughtException',  err => { console.error('[server]', err.message); process.exit(1) })