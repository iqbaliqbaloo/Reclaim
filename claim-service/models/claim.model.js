const pool = require('../db')

const createClaim = async ({ listingId, listingUserId, claimantId, claimDescription }) => {
  const sql = `
    INSERT INTO claims (
      listing_id, listing_user_id, claimant_id,
      claim_description, expires_at
    )
    VALUES ($1, $2, $3, $4, NOW() + INTERVAL '72 hours')
    RETURNING *
  `
  const result = await pool.query(sql, [listingId, listingUserId, claimantId, claimDescription])
  return result.rows[0]
}

const findById = async (id) => {
  const result = await pool.query(`SELECT * FROM claims WHERE id = $1`, [id])
  return result.rows[0] || null
}

const countActiveForListing = async (listingId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM claims WHERE listing_id = $1 AND status = 'pending'`,
    [listingId]
  )
  return parseInt(result.rows[0].count)
}

const countActiveForUser = async (claimantId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM claims WHERE claimant_id = $1 AND status = 'pending'`,
    [claimantId]
  )
  return parseInt(result.rows[0].count)
}

const findExistingClaim = async (listingId, claimantId) => {
  const result = await pool.query(
    `SELECT * FROM claims
     WHERE listing_id = $1
     AND claimant_id = $2
     AND status IN ('pending', 'approved')`,
    [listingId, claimantId]
  )
  return result.rows[0] || null
}

const getClaimsForListing = async (listingId) => {
  const sql = `
    SELECT * FROM claims
    WHERE listing_id = $1
    AND status = 'pending'
    ORDER BY created_at ASC
  `
  const result = await pool.query(sql, [listingId])
  return result.rows
}

const getClaimsByUser = async (claimantId) => {
  const sql = `SELECT * FROM claims WHERE claimant_id = $1 ORDER BY created_at DESC`
  const result = await pool.query(sql, [claimantId])
  return result.rows
}

const approveClaim = async (claimId, listingId) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const approveResult = await client.query(
      `UPDATE claims SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [claimId]
    )

    const rejectResult = await client.query(
      `UPDATE claims
       SET status = 'rejected', updated_at = NOW()
       WHERE listing_id = $1
       AND id != $2
       AND status = 'pending'
       RETURNING id`,
      [listingId, claimId]
    )

    await client.query('COMMIT')
    return {
      approvedClaim:    approveResult.rows[0],
      rejectedClaimIds: rejectResult.rows.map(r => r.id)
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const rejectClaim = async (claimId, listingId, listingUserId) => {
  const sql = `
    UPDATE claims
    SET status = 'rejected', updated_at = NOW()
    WHERE id = $1
    AND listing_id = $2
    AND listing_user_id = $3
    AND status = 'pending'
    RETURNING *
  `
  const result = await pool.query(sql, [claimId, listingId, listingUserId])
  return result.rows[0] || null
}

const getExpiredClaims = async () => {
  const sql = `
    SELECT * FROM claims
    WHERE status = 'pending'
    AND expires_at < NOW()
    AND auto_expired = false
  `
  const result = await pool.query(sql)
  return result.rows
}

const markExpired = async (claimId) => {
  const result = await pool.query(
    `UPDATE claims
     SET status = 'expired', auto_expired = true, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [claimId]
  )
  return result.rows[0]
}

const getClaimsNeedingReminder1 = async () => {
  const sql = `
    SELECT * FROM claims
    WHERE status = 'pending'
    AND reminder_1_sent = false
    AND created_at < NOW() - INTERVAL '24 hours'
    AND expires_at > NOW()
  `
  const result = await pool.query(sql)
  return result.rows
}

const getClaimsNeedingReminder2 = async () => {
  const sql = `
    SELECT * FROM claims
    WHERE status = 'pending'
    AND reminder_2_sent = false
    AND created_at < NOW() - INTERVAL '48 hours'
    AND expires_at > NOW()
  `
  const result = await pool.query(sql)
  return result.rows
}

const markReminder1Sent = async (claimId) => {
  await pool.query(
    `UPDATE claims SET reminder_1_sent = true, updated_at = NOW() WHERE id = $1`,
    [claimId]
  )
}

const markReminder2Sent = async (claimId) => {
  await pool.query(
    `UPDATE claims SET reminder_2_sent = true, updated_at = NOW() WHERE id = $1`,
    [claimId]
  )
}

const markFoundUpdateSent = async (claimId) => {
  await pool.query(
    `UPDATE claims SET found_update_sent = true, updated_at = NOW() WHERE id = $1`,
    [claimId]
  )
}

const countMissedClaims = async (listingId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM claims WHERE listing_id = $1 AND auto_expired = true`,
    [listingId]
  )
  return parseInt(result.rows[0].count)
}

module.exports = {
  createClaim,
  findById,
  countActiveForListing,
  countActiveForUser,
  findExistingClaim,
  getClaimsForListing,
  getClaimsByUser,
  approveClaim,
  rejectClaim,
  getExpiredClaims,
  markExpired,
  getClaimsNeedingReminder1,
  getClaimsNeedingReminder2,
  markReminder1Sent,
  markReminder2Sent,
  markFoundUpdateSent,
  countMissedClaims
}
