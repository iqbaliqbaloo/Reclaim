const pool = require('../db')


const saveMatch = async ({ lostListingId, foundListingId, score }) => {
  console.log('[match.model] saveMatch called')
  console.log('[match.model] data received:', { lostListingId, foundListingId, score })

  const sql = `
    INSERT INTO matches (lost_listing_id, found_listing_id, score)
    VALUES ($1, $2, $3)
    ON CONFLICT (lost_listing_id, found_listing_id)
    DO UPDATE SET
      score      = GREATEST(matches.score, EXCLUDED.score),
      updated_at = NOW()
    RETURNING *
  `

  const values = [lostListingId, foundListingId, score]
  console.log('[match.model] INSERT/UPDATE values:', values)
const result = await pool.query(sql, values)
  console.log('[match.model] saveMatch result:', result.rows[0])
  return result.rows[0]
}

const getMatchesForListing = async (listingId, type) => {
  console.log('[match.model] getMatchesForListing called')
  console.log('[match.model] listingId:', listingId, 'type:', type)

  const column = type === 'lost' ? 'lost_listing_id' : 'found_listing_id'

  const sql = `
    SELECT *
    FROM matches
    WHERE ${column} = $1
    AND status != 'dismissed'
    ORDER BY score DESC
    LIMIT 10
  `

  const result = await pool.query(sql, [listingId])
  console.log('[match.model] matches found:', result.rows.length)
  return result.rows
}

const getMatchesForUser = async (userId) => {
  console.log('[match.model] getMatchesForUser called for:', userId)

  const sql = `
    SELECT *
    FROM matches
    WHERE (lost_user_id = $1 OR found_user_id = $1)
    AND status = 'pending'
    ORDER BY score DESC, created_at DESC
  `

  const result = await pool.query(sql, [userId])
  console.log('[match.model] user matches found:', result.rows.length)
  return result.rows
}

const findById = async (id) => {
  console.log('[match.model] findById:', id)

  const sql    = `SELECT * FROM matches WHERE id = $1`
  const result = await pool.query(sql, [id])

  console.log('[match.model] findById result:', result.rows[0] ? 'FOUND' : 'NOT FOUND')
  return result.rows[0] || null
}

const dismissMatch = async (id, userId) => {
  console.log('[match.model] dismissMatch called')
  console.log('[match.model] id:', id, 'userId:', userId)

  const sql = `
    UPDATE matches
    SET status = 'dismissed', updated_at = NOW()
    WHERE id = $1
    AND (lost_user_id = $2 OR found_user_id = $2)
    AND status = 'pending'
    RETURNING *
  `

  const result = await pool.query(sql, [id, userId])

  if (result.rows.length === 0) {
    console.log('[match.model] dismissMatch — not found or not authorized')
    return null
  }

  console.log('[match.model] match dismissed:', result.rows[0])
  return result.rows[0]
}

const acceptMatch = async (id) => {
  console.log('[match.model] acceptMatch called for id:', id)

  const sql = `
    UPDATE matches
    SET status = 'accepted', updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `

  const result = await pool.query(sql, [id])
  console.log('[match.model] acceptMatch result:', result.rows[0])
  return result.rows[0] || null
}

const markNotified = async (id, side) => {
  console.log('[match.model] markNotified called')
  console.log('[match.model] id:', id, 'side:', side)

  const column = side === 'lost' ? 'notified_lost' : 'notified_found'

  const sql = `
    UPDATE matches
    SET ${column} = true, updated_at = NOW()
    WHERE id = $1
    RETURNING id, notified_lost, notified_found
  `

  const result = await pool.query(sql, [id])
  console.log('[match.model] markNotified result:', result.rows[0])
  return result.rows[0]
}

const countMatchesForListing = async (listingId, type) => {
  const column = type === 'lost' ? 'lost_listing_id' : 'found_listing_id'

  const sql = `
    SELECT COUNT(*) as count, MIN(score) as min_score
    FROM matches
    WHERE ${column} = $1
    AND status != 'dismissed'
  `

  const result = await pool.query(sql, [listingId])
  const count  = parseInt(result.rows[0].count)
  const minScore = parseFloat(result.rows[0].min_score || '0')

  console.log('[match.model] countMatchesForListing:', { listingId, type, count, minScore })
  return { count, minScore }
}

const removeLowestMatch = async (listingId, type) => {
  console.log('[match.model] removeLowestMatch called for:', listingId, type)

  const column = type === 'lost' ? 'lost_listing_id' : 'found_listing_id'

  const sql = `
    DELETE FROM matches
    WHERE id = (
      SELECT id FROM matches
      WHERE ${column} = $1
      AND status != 'dismissed'
      ORDER BY score ASC
      LIMIT 1
    )
    RETURNING id, score
  `

  const result = await pool.query(sql, [listingId])
  console.log('[match.model] removed lowest match:', result.rows[0])
  return result.rows[0]
}

const saveMatchWithUsers = async ({lostListingId, foundListingId, lostUserId, foundUserId, score}) => {
  console.log('[match.model] saveMatchWithUsers called')
  console.log('[match.model] data received:', {
    lostListingId,
    foundListingId,
    lostUserId,
    foundUserId,
    score
  })
  const sql = `
    INSERT INTO matches (
      lost_listing_id, found_listing_id,
      lost_user_id, found_user_id,
      score
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (lost_listing_id, found_listing_id)
    DO UPDATE SET
      score      = GREATEST(matches.score, EXCLUDED.score),
      updated_at = NOW()
    RETURNING *
  `

  const values = [
    lostListingId,
    foundListingId,
    lostUserId,
    foundUserId,
    score
  ]
   console.log('[match.model] INSERT values:', values)

  const result = await pool.query(sql, values)
  console.log('[match.model] saveMatchWithUsers result:', result.rows[0])
  return result.rows[0]
}

module.exports = {
  saveMatch,
  saveMatchWithUsers,
  getMatchesForListing,
  getMatchesForUser,
  findById,
  dismissMatch,
  acceptMatch,
  markNotified,
  countMatchesForListing,
  removeLowestMatch
}
