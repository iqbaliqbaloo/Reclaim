const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT) || 5432,
  user:     process.env.POSTGRES_USER     || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB       || 'reclaim_chat'
})

console.log('[db] connecting to:', process.env.POSTGRES_DB || 'reclaim_chat')

pool.connect((err, client, release) => {
  if (err) { console.error('[db] failed:', err.message); return }
  console.log('[db] connected:', client.database)
  release()
})

pool.on('error', err => console.error('[db] pool error:', err.message))
module.exports = pool