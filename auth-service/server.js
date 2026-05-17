require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')
const dns = require('node:dns').promises;
dns.setServers(['1.1.1.1', '1.0.0.1']);
const PORT = process.env.PORT ||4001
const MONGO_URI = process.env.MONGODB_URI 
console.log('[server] starting auth-service...')
console.log('[server] port:', PORT)
console.log('[server] MongoDB URI:', MONGO_URI)

mongoose.connect(MONGO_URI)
.then(()=>{
    console.log('[server] MongoDB connected successfully')
    console.log('[server] database name:', mongoose.connection.name)
    console.log('[server] MongoDB host:', mongoose.connection.host)

    app.listen(PORT, () => {
      console.log(`[server] auth-service listening on port ${PORT}`)
      console.log(`[server] health check: http://localhost:${PORT}/health`)
    })
  })
  .catch((err)=>{
     console.error('[server] MongoDB connection failed:', err.message)
    console.error('[server] MongoDB URI used:', MONGO_URI)
    console.error('[server] full error:', err)
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
