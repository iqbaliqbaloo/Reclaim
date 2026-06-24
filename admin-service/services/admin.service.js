const axios = require('axios')
const pool  = require('../db')

const callService = async (method, url, data = {}, token = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await axios({ method, url, data, headers, timeout: 5000 })
    return res.data
  } catch (err) {
    console.error('[admin.service] call failed:', url, err.message)
    return null
  }
}

const submitReport = async (reporterId, { targetType, targetId, reason }) => {
  const result = await pool.query(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reporterId, targetType, targetId, reason]
  )
  return result.rows[0]
}

const getReportsQueue = async () => {
  const result = await pool.query(
    `SELECT *,
      CASE
        WHEN target_type = 'chat' THEN 1
        WHEN target_type = 'listing' THEN 2
        WHEN target_type = 'user' THEN 3
        ELSE 4
      END as priority
     FROM reports
     WHERE status = 'open'
     ORDER BY priority ASC, created_at ASC`
  )
  return result.rows
}

const resolveReport = async (reportId, adminId, action) => {
  const result = await pool.query(
    `UPDATE reports
     SET status = $1, resolved_by = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [action, adminId, reportId]
  )
  return result.rows[0]
}

const banUser = async (userId, reason, token) => {
  const result = await callService(
    'put',
    `${process.env.USER_SERVICE_URL}/api/users/${userId}/ban`,
    { reason },
    token
  )
  if (!result) throw Object.assign(new Error('Failed to ban user'), { statusCode: 500 })
  return result.data
}

const unbanUser = async (userId, token) => {
  const result = await callService(
    'put',
    `${process.env.USER_SERVICE_URL}/api/users/${userId}/unban`,
    {},
    token
  )
  if (!result) throw Object.assign(new Error('Failed to unban user'), { statusCode: 500 })
  return result.data
}

const removeListing = async (listingId, token) => {
  const result = await callService(
    'delete',
    `${process.env.LISTING_SERVICE_URL}/api/listings/${listingId}/admin`,
    {},
    token
  )
  if (!result) throw Object.assign(new Error('Failed to remove listing'), { statusCode: 500 })
  return result.data
}

const getAllUsers = async (token) => {
  const result = await callService('get', `${process.env.USER_SERVICE_URL}/api/users`, {}, token)
  return result?.data || []
}

const getStats = async (token) => {
  const [listingsRes, reportsResult] = await Promise.all([
    callService('get', `${process.env.LISTING_SERVICE_URL}/api/listings?limit=1`, {}, token),
    pool.query(`SELECT COUNT(*) FROM reports WHERE status = 'open'`)
  ])

  return {
    totalListings: listingsRes?.data?.total || 0,
    openReports:   parseInt(reportsResult.rows[0].count),
    fetchedAt:     new Date().toISOString()
  }
}

module.exports = {
  submitReport,
  getReportsQueue,
  resolveReport,
  banUser,
  unbanUser,
  removeListing,
  getAllUsers,
  getStats
}
