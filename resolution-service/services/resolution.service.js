

const axios           = require('axios')
const pool            = require('../db')

const callService = async (method, url, data = {}, token = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await axios({ method, url, data, headers, timeout: 5000 })
    return res.data
  } catch (err) {
    console.error('[resolution.service] call failed:', url, err.message)
    return null
  }
}

const resolve = async (data) => {
  console.log('[resolution.service] resolve called')
  console.log('[resolution.service] data:', data)

  const { conversationId, listingId, lostUserId, foundUserId, lostIp, foundIp } = data

  // check if already resolved
  const existing = await pool.query(
    `SELECT * FROM resolutions WHERE conversation_id = $1`,
    [conversationId]
  )

  if (existing.rows.length > 0) {
    console.log('[resolution.service] already resolved:', conversationId)
    return existing.rows[0]
  }

  // create resolution record
  const resolution = await pool.query(
    `INSERT INTO resolutions (conversation_id, listing_id, lost_user_id, found_user_id, lost_ip, found_ip)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [conversationId, listingId, lostUserId, foundUserId, lostIp || null, foundIp || null]
  )

  const res = resolution.rows[0]
  console.log('[resolution.service] resolution created:', res.id)

  // ── Check reputation eligibility ─────────────────────────────────────────────

  const sameIp = lostIp && foundIp && lostIp === foundIp
  console.log('[resolution.service] same IP?', sameIp)

  /*
    Check account age via user-service
    Both must be > 7 days old
  */
  let canGiveReputation = !sameIp

  if (canGiveReputation) {
    const lostUserRes  = await callService('get', `${process.env.USER_SERVICE_URL}/users/internal/age/${lostUserId}`)
    const foundUserRes = await callService('get', `${process.env.USER_SERVICE_URL}/users/internal/age/${foundUserId}`)

    const lostDays  = lostUserRes?.data?.days_since_created || 0
    const foundDays = foundUserRes?.data?.days_since_created || 0

    console.log('[resolution.service] account ages:', { lostDays, foundDays })

    if (lostDays < 7 || foundDays < 7) {
      console.log('[resolution.service] account too new — skipping reputation')
      canGiveReputation = false
    }
  }

  // ── Give reputation ───────────────────────────────────────────────────────────

  if (canGiveReputation) {
    console.log('[resolution.service] giving reputation to both users')

    // +1 reputation for lost user
    callService('post', `${process.env.USER_SERVICE_URL}/users/internal/increment-reputation`, {
      authId: lostUserId
    })

    // +1 reputation for found user
    callService('post', `${process.env.USER_SERVICE_URL}/users/internal/increment-reputation`, {
      authId: foundUserId
    })

    // mark reputation given
    await pool.query(
      `UPDATE resolutions SET reputation_given = true WHERE id = $1`,
      [res.id]
    )

    console.log('[resolution.service] reputation incremented for both')
  }

  // ── Mark listing resolved ─────────────────────────────────────────────────────

  console.log('[resolution.service] marking listing resolved:', listingId)
  callService('put', `${process.env.LISTING_SERVICE_URL}/listings/${listingId}/resolve`)

  console.log('[resolution.service] resolution complete')
  return res
}

// ─── Get resolution ───────────────────────────────────────────────────────────

const getResolution = async (conversationId) => {
  const result = await pool.query(
    `SELECT * FROM resolutions WHERE conversation_id = $1`,
    [conversationId]
  )
  return result.rows[0] || null
}

module.exports = { resolve, getResolution }