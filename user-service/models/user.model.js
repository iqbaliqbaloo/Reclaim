const pool = require('../db')

const createProfile = async ({ authId, email, role }) => {
  const sql = `
    INSERT INTO users (auth_id, email, role)
    VALUES ($1, $2, $3)
    RETURNING id, auth_id, email, role, reputation, daily_post_count, is_banned, created_at
  `
  const result = await pool.query(sql, [authId, email, role])
  return result.rows[0]
}

const findByAuthId = async (authId) => {
  const result = await pool.query(`SELECT * FROM users WHERE auth_id = $1`, [authId])
  return result.rows[0] || null
}

const findById = async (id) => {
  const sql = `
    SELECT id, auth_id, email, name, phone, avatar_url, role, reputation, daily_post_count, created_at
    FROM users WHERE id = $1
  `
  const result = await pool.query(sql, [id])
  return result.rows[0] || null
}

const findAll = async () => {
  const sql = `
    SELECT id, auth_id, email, name, role, reputation, is_banned, ban_reason, created_at
    FROM users ORDER BY created_at DESC
  `
  const result = await pool.query(sql)
  return result.rows
}

const updateProfile = async (authId, data) => {
  const { name, phone, avatar_url } = data
  const sql = `
    UPDATE users
    SET
      name       = COALESCE($1, name),
      phone      = COALESCE($2, phone),
      avatar_url = COALESCE($3, avatar_url),
      updated_at = NOW()
    WHERE auth_id = $4
    RETURNING id, auth_id, email, name, phone, avatar_url, role, reputation, daily_post_count, created_at, updated_at
  `
  const result = await pool.query(sql, [name || null, phone || null, avatar_url || null, authId])
  return result.rows[0]
}

const checkCanPost = async (authId) => {
  const user = await findByAuthId(authId)
  if (!user) return { canPost: true, count: 0, remaining: 5 }

  const today        = new Date().toISOString().split('T')[0]
  const lastPostDate = user.last_post_date
    ? new Date(user.last_post_date).toISOString().split('T')[0]
    : null

  if (lastPostDate !== today) {
    await pool.query(
      `UPDATE users SET daily_post_count = 0, last_post_date = $1, updated_at = NOW() WHERE auth_id = $2`,
      [today, authId]
    )
    return { canPost: true, count: 0, remaining: 5 }
  }

  const count     = user.daily_post_count
  const remaining = 5 - count
  return { canPost: remaining > 0, count, remaining }
}

const incrementPostCount = async (authId) => {
  const today = new Date().toISOString().split('T')[0]
  const sql = `
    UPDATE users
    SET daily_post_count = daily_post_count + 1, last_post_date = $1, updated_at = NOW()
    WHERE auth_id = $2
    RETURNING daily_post_count
  `
  const result = await pool.query(sql, [today, authId])
  return result.rows[0]
}

const incrementReputation = async (authId) => {
  const sql = `
    UPDATE users SET reputation = reputation + 1, updated_at = NOW()
    WHERE auth_id = $1
    RETURNING reputation
  `
  const result = await pool.query(sql, [authId])
  if (!result.rows[0]) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }
  return result.rows[0]
}

const updateRole = async (authId, role) => {
  const sql = `
    UPDATE users SET role = $1, updated_at = NOW()
    WHERE auth_id = $2
    RETURNING id, auth_id, email, role
  `
  const result = await pool.query(sql, [role, authId])
  return result.rows[0]
}

const banUser = async (id, reason) => {
  const sql = `
    UPDATE users SET is_banned = true, ban_reason = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, email, is_banned, ban_reason
  `
  const result = await pool.query(sql, [reason, id])
  return result.rows[0]
}

const unbanUser = async (id) => {
  const sql = `
    UPDATE users SET is_banned = false, ban_reason = NULL, updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, is_banned, ban_reason
  `
  const result = await pool.query(sql, [id])
  return result.rows[0]
}

module.exports = {
  createProfile,
  findByAuthId,
  findById,
  findAll,
  updateProfile,
  checkCanPost,
  incrementPostCount,
  incrementReputation,
  updateRole,
  banUser,
  unbanUser
}
