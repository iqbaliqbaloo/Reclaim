const pool = require('../db')

const saveMatch = async ({ lostListingId, foundListingId, score }) => {
  const sql = `
    INSERT INTO matches (lost_listing_id, found_listing_id, score)
    VALUES ($1, $2, $3)
    ON CONFLICT (lost_listing_id, found_listing_id)
    DO UPDATE SET
      score      = GREATEST(matches.score, EXCLUDED.score),
      updated_at = NOW()
    RETURNING *
  `
  const result = await pool.query(sql, [lostListingId, foundListingId, score])
  return result.rows[0]
}

const getMatchesForListing = async (listingId, type) => {
  const column = type === 'lost' ? 'lost_listing_id' : 'found_listing_id'
  const sql = `
    SELECT * FROM matches
    WHERE ${column} = $1
    AND status != 'dismissed'
    ORDER BY score DESC
    LIMIT 10
  `
  const result = await pool.query(sql, [listingId])
  return result.rows
}

const getMatchesForUser = async (userId) => {
  const sql = `
    SELECT * FROM matches
    WHERE (lost_user_id = $1 OR found_user_id = $1)
    AND status = 'pending'
    ORDER BY score DESC, created_at DESC
  `
  const result = await pool.query(sql, [userId])
  return result.rows
}

const findById = async (id) => {
  const result = await pool.query(`SELECT * FROM matches WHERE id = $1`, [id])
  return result.rows[0] || null
}

const dismissMatch = async (id, userId) => {
  const sql = `
    UPDATE matches
    SET status = 'dismissed', updated_at = NOW()
    WHERE id = $1
    AND (lost_user_id = $2 OR found_user_id = $2)
    AND status = 'pending'
    RETURNING *
  `
  const result = await pool.query(sql, [id, userId])
  return result.rows[0] || null
}

const acceptMatch = async (id) => {
  const sql = `
    UPDATE matches
    SET status = 'accepted', updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `
  const result = await pool.query(sql, [id])
  return result.rows[0] || null
}

const markNotified = async (id, side) => {
  const column = side === 'lost' ? 'notified_lost' : 'notified_found'
  const sql = `
    UPDATE matches
    SET ${column} = true, updated_at = NOW()
    WHERE id = $1
    RETURNING id, notified_lost, notified_found
  `
  const result = await pool.query(sql, [id])
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
  const result   = await pool.query(sql, [listingId])
  const count    = parseInt(result.rows[0].count)
  const minScore = parseFloat(result.rows[0].min_score || '0')
  return { count, minScore }
}

const removeLowestMatch = async (listingId, type) => {
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
  return result.rows[0]
}

const saveMatchWithUsers = async ({ lostListingId, foundListingId, lostUserId, foundUserId, score }) => {
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
  const result = await pool.query(sql, [lostListingId, foundListingId, lostUserId, foundUserId, score])
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
