const { Pool } = require('pg')

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT) || 5432,
  user:     process.env.POSTGRES_USER     || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB       || 'reclaim_matches'
})

console.log('[db] PostgreSQL pool created for match-service')
console.log('[db] connecting to database:', process.env.POSTGRES_DB || 'reclaim_matches')

pool.connect((err, client, release) => {
  if (err) {
    console.error('[db] PostgreSQL connection failed:', err.message)
    console.error('[db] make sure reclaim_matches database exists')
    return
  }
  console.log('[db] PostgreSQL connected — database:', client.database)
  release()
})

pool.on('error', (err) => {
  console.error('[db] unexpected pool error:', err.message)
})

module.exports = pool