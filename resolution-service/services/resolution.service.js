const axios = require('axios')
const pool  = require('../db')

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
  const { conversationId, listingId, lostUserId, foundUserId, lostIp, foundIp } = data

  const existing = await pool.query(
    `SELECT * FROM resolutions WHERE conversation_id = $1`,
    [conversationId]
  )

  if (existing.rows.length > 0) return existing.rows[0]

  const resolution = await pool.query(
    `INSERT INTO resolutions (conversation_id, listing_id, lost_user_id, found_user_id, lost_ip, found_ip)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [conversationId, listingId, lostUserId, foundUserId, lostIp || null, foundIp || null]
  )

  const res = resolution.rows[0]

  const sameIp = lostIp && foundIp && lostIp === foundIp
  let canGiveReputation = !sameIp

  if (canGiveReputation) {
    const lostUserRes  = await callService('get', `${process.env.USER_SERVICE_URL}/api/users/internal/age/${lostUserId}`)
    const foundUserRes = await callService('get', `${process.env.USER_SERVICE_URL}/api/users/internal/age/${foundUserId}`)

    const lostDays  = lostUserRes?.data?.days_since_created || 0
    const foundDays = foundUserRes?.data?.days_since_created || 0

    if (lostDays < 7 || foundDays < 7) {
      canGiveReputation = false
    }
  }

  if (canGiveReputation) {
    callService('post', `${process.env.USER_SERVICE_URL}/api/users/internal/increment-reputation`, {
      authId: lostUserId
    })

    callService('post', `${process.env.USER_SERVICE_URL}/api/users/internal/increment-reputation`, {
      authId: foundUserId
    })

    await pool.query(
      `UPDATE resolutions SET reputation_given = true WHERE id = $1`,
      [res.id]
    )
  }

  callService('put', `${process.env.LISTING_SERVICE_URL}/api/listings/${listingId}/resolve`)

  return res
}

const getResolution = async (conversationId) => {
  const result = await pool.query(
    `SELECT * FROM resolutions WHERE conversation_id = $1`,
    [conversationId]
  )
  return result.rows[0] || null
}

module.exports = { resolve, getResolution }
