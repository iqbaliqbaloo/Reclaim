/*
  ============================================================
  ADMIN SERVICE

  FEATURES:
  - Submit and manage reports
  - Ban/unban users (calls user-service)
  - Remove listings (calls listing-service)
  - View platform stats
  - Priority queue for admin actions
  ============================================================
*/

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

// ─── Submit report ────────────────────────────────────────────────────────────

/*
  submitReport(reporterId, data)

  ANY user can report a listing, user, or chat
  Stored in admin DB for review
*/
const submitReport = async (reporterId, { targetType, targetId, reason }) => {
  console.log('[admin.service] submitReport:', { reporterId, targetType, targetId })

  const result = await pool.query(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reporterId, targetType, targetId, reason]
  )

  const report = result.rows[0]
  console.log('[admin.service] report created:', report.id)

  // check if auto-flag threshold reached (3 reports on same target)
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM reports WHERE target_type = $1 AND target_id = $2 AND status = 'open'`,
    [targetType, targetId]
  )

  const count = parseInt(countResult.rows[0].count)
  console.log('[admin.service] total reports on target:', count)

  if (count >= 3 && targetType === 'listing') {
    console.log('[admin.service] 3+ reports — auto-flagging listing:', targetId)
    // listing will be auto-removed by admin or flagged for review
    // we just log here — admin sees it in priority queue
  }

  return report
}

// ─── Get reports queue ────────────────────────────────────────────────────────

/*
  getReportsQueue()

  Returns reports with priority levels:
  Critical: chat reports
  High:     listings with 3+ reports
  Medium:   user reports
  Low:      single reports
*/
const getReportsQueue = async () => {
  console.log('[admin.service] getReportsQueue called')

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

  console.log('[admin.service] open reports:', result.rows.length)
  return result.rows
}

// ─── Resolve report ───────────────────────────────────────────────────────────

const resolveReport = async (reportId, adminId, action) => {
  console.log('[admin.service] resolveReport:', reportId, action)

  const result = await pool.query(
    `UPDATE reports
     SET status = $1, resolved_by = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [action, adminId, reportId]
  )

  return result.rows[0]
}

// ─── Ban user ─────────────────────────────────────────────────────────────────

/*
  banUser(userId, reason, token)

  CALLS user-service to ban user
  Admin role checked by middleware
*/
const banUser = async (userId, reason, token) => {
  console.log('[admin.service] banUser:', userId, reason)

  const result = await callService(
    'put',
    `${process.env.USER_SERVICE_URL}/users/${userId}/ban`,
    { reason },
    token
  )

  if (!result) throw Object.assign(new Error('Failed to ban user'), { statusCode: 500 })
  return result.data
}

// ─── Unban user ───────────────────────────────────────────────────────────────

const unbanUser = async (userId, token) => {
  console.log('[admin.service] unbanUser:', userId)

  const result = await callService(
    'put',
    `${process.env.USER_SERVICE_URL}/users/${userId}/unban`,
    {},
    token
  )

  if (!result) throw Object.assign(new Error('Failed to unban user'), { statusCode: 500 })
  return result.data
}

// ─── Remove listing ───────────────────────────────────────────────────────────

const removeListing = async (listingId, token) => {
  console.log('[admin.service] removeListing:', listingId)

  const result = await callService(
    'delete',
    `${process.env.LISTING_SERVICE_URL}/listings/${listingId}/admin`,
    {},
    token
  )

  if (!result) throw Object.assign(new Error('Failed to remove listing'), { statusCode: 500 })
  return result.data
}

// ─── Get all users ────────────────────────────────────────────────────────────

const getAllUsers = async (token) => {
  const result = await callService('get', `${process.env.USER_SERVICE_URL}/users`, {}, token)
  return result?.data || []
}

// ─── Get platform stats ───────────────────────────────────────────────────────

/*
  getStats()

  Returns platform statistics for admin dashboard
  Fetches from various services
*/
const getStats = async (token) => {
  console.log('[admin.service] getStats called')

  const [listingsRes, reportsResult] = await Promise.all([
    callService('get', `${process.env.LISTING_SERVICE_URL}/listings?limit=1`, {}, token),
    pool.query(`SELECT COUNT(*) FROM reports WHERE status = 'open'`)
  ])

  const stats = {
    totalListings:  listingsRes?.data?.total || 0,
    openReports:    parseInt(reportsResult.rows[0].count),
    fetchedAt:      new Date().toISOString()
  }

  console.log('[admin.service] stats:', stats)
  return stats
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