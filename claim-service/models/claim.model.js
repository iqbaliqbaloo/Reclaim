const pool = require('../db')


const createClaim = async ({ listingId, listingUserId, claimantId, claimDescription }) => {
  console.log('[claim.model] createClaim called')
  console.log('[claim.model] data received:', {
    listingId,
    listingUserId,
    claimantId,
    claimDescription: claimDescription.substring(0, 50) + '...'
  })

  const sql = `
    INSERT INTO claims (
      listing_id, listing_user_id, claimant_id,
      claim_description, expires_at
    )
    VALUES ($1, $2, $3, $4, NOW() + INTERVAL '72 hours')
    RETURNING *
  `

  const values = [listingId, listingUserId, claimantId, claimDescription]
  console.log('[claim.model] INSERT values:', values)

  const result = await pool.query(sql, values)
  console.log('[claim.model] claim created:', result.rows[0])
  return result.rows[0]
}

// ─── Find by id ───────────────────────────────────────────────────────────────

const findById = async (id) => {
  console.log('[claim.model] findById:', id)
  const result = await pool.query(`SELECT * FROM claims WHERE id = $1`, [id])
  console.log('[claim.model] findById:', result.rows[0] ? 'FOUND' : 'NOT FOUND')
  return result.rows[0] || null
}
const countActiveForListing = async (listingId) => {
  console.log('[claim.model] countActiveForListing:', listingId)

  const result = await pool.query(
    `SELECT COUNT(*) FROM claims
     WHERE listing_id = $1
     AND status = 'pending'`,
    [listingId]
  )

  const count = parseInt(result.rows[0].count)
  console.log('[claim.model] active claims for listing:', count)
  return count
}


const countActiveForUser = async (claimantId) => {
  console.log('[claim.model] countActiveForUser:', claimantId)

  const result = await pool.query(
    `SELECT COUNT(*) FROM claims
     WHERE claimant_id = $1
     AND status = 'pending'`,
    [claimantId]
  )

  const count = parseInt(result.rows[0].count)
  console.log('[claim.model] active claims for user:', count)
  return count
}


const findExistingClaim = async (listingId, claimantId) => {
  console.log('[claim.model] findExistingClaim:', { listingId, claimantId })

  const result = await pool.query(
    `SELECT * FROM claims
     WHERE listing_id = $1
     AND claimant_id = $2
     AND status IN ('pending', 'approved')`,
    [listingId, claimantId]
  )

  console.log('[claim.model] existing claim:', result.rows[0] ? 'FOUND' : 'NONE')
  return result.rows[0] || null
}


const getClaimsForListing = async (listingId) => {
  console.log('[claim.model] getClaimsForListing:', listingId)

  const sql = `
    SELECT * FROM claims
    WHERE listing_id = $1
    AND status = 'pending'
    ORDER BY created_at ASC
  `

  const result = await pool.query(sql, [listingId])
  console.log('[claim.model] claims found:', result.rows.length)
  return result.rows
}


const getClaimsByUser = async (claimantId) => {
  console.log('[claim.model] getClaimsByUser:', claimantId)

  const sql = `
    SELECT * FROM claims
    WHERE claimant_id = $1
    ORDER BY created_at DESC
  `

  const result = await pool.query(sql, [claimantId])
  console.log('[claim.model] user claims found:', result.rows.length)
  return result.rows
}


const approveClaim = async (claimId, listingId) => {
  console.log('[claim.model] approveClaim called')
  console.log('[claim.model] claimId:', claimId, 'listingId:', listingId)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    console.log('[claim.model] transaction started')

    // approve this specific claim
    const approveResult = await client.query(
      `UPDATE claims
       SET status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [claimId]
    )

    console.log('[claim.model] claim approved:', approveResult.rows[0])

    // reject all other pending claims on same listing (atomic)
    const rejectResult = await client.query(
      `UPDATE claims
       SET status = 'rejected', updated_at = NOW()
       WHERE listing_id = $1
       AND id != $2
       AND status = 'pending'
       RETURNING id`,
      [listingId, claimId]
    )

    console.log('[claim.model] other claims rejected:', rejectResult.rows.length)

    await client.query('COMMIT')
    console.log('[claim.model] transaction committed')

    return {
      approvedClaim:   approveResult.rows[0],
      rejectedClaimIds: rejectResult.rows.map(r => r.id)
    }
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[claim.model] transaction rolled back:', err.message)
    throw err
  } finally {
    client.release()
  }
}


const rejectClaim = async (claimId, listingId, listingUserId) => {
  console.log('[claim.model] rejectClaim:', claimId)

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
  console.log('[claim.model] rejectClaim result:', result.rows[0])
  return result.rows[0] || null
}


const getExpiredClaims = async () => {
  console.log('[claim.model] getExpiredClaims called')

  const sql = `
    SELECT * FROM claims
    WHERE status = 'pending'
    AND expires_at < NOW()
    AND auto_expired = false
  `

  const result = await pool.query(sql)
  console.log('[claim.model] expired claims found:', result.rows.length)
  return result.rows
}



const markExpired = async (claimId) => {
  console.log('[claim.model] markExpired:', claimId)

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
  console.log('[claim.model] claims needing reminder 1:', result.rows.length)
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
  console.log('[claim.model] claims needing reminder 2:', result.rows.length)
  return result.rows
}



const markReminder1Sent = async (claimId) => {
  await pool.query(
    `UPDATE claims SET reminder_1_sent = true, updated_at = NOW() WHERE id = $1`,
    [claimId]
  )
  console.log('[claim.model] reminder_1_sent marked for claim:', claimId)
}

const markReminder2Sent = async (claimId) => {
  await pool.query(
    `UPDATE claims SET reminder_2_sent = true, updated_at = NOW() WHERE id = $1`,
    [claimId]
  )
  console.log('[claim.model] reminder_2_sent marked for claim:', claimId)
}

const markFoundUpdateSent = async (claimId) => {
  await pool.query(
    `UPDATE claims SET found_update_sent = true, updated_at = NOW() WHERE id = $1`,
    [claimId]
  )
  console.log('[claim.model] found_update_sent marked for claim:', claimId)
}


const countMissedClaims = async (listingId) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM claims
     WHERE listing_id = $1
     AND auto_expired = true`,
    [listingId]
  )
  const count = parseInt(result.rows[0].count)
  console.log('[claim.model] missed claims for listing', listingId, ':', count)
  return count
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