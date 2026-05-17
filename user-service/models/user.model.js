const pool = require('../db')

const createProfile =async({authId,email,role})=>{
    console.log('[user.model] createProfile called')
    console.log('[user.model] data received:', { authId, email, role })
      const sql = `
    INSERT INTO users (auth_id, email, role)
    VALUES ($1, $2, $3)
    RETURNING
      id, auth_id, email, role,
      reputation, daily_post_count,
      is_banned, created_at
  `
  const values = [authId, email, role]

  console.log('[user.model] running INSERT query')
  console.log('[user.model] values being stored:', values)

  const result = await pool.query(sql, values)

  console.log('[user.model] createProfile stored in DB:', result.rows[0])
  return result.rows[0]
}

const findByAuthId = async (authId) => {
  console.log('[user.model] findByAuthId:', authId)

  const sql    = `SELECT * FROM users WHERE auth_id = $1`
  const result = await pool.query(sql, [authId])

  console.log('[user.model] findByAuthId result:',
    result.rows[0] ? 'FOUND' : 'NOT FOUND'
  )
  return result.rows[0] || null
}

const findById = async (id) => {
  console.log('[user.model] findById:', id)
  const sql = `
    SELECT
      id, auth_id, email, name, phone,
      avatar_url, role, reputation,
      daily_post_count, created_at
    FROM users
    WHERE id = $1
  `
  const result = await pool.query(sql, [id])

  console.log('[user.model] findById result:',
    result.rows[0] ? 'FOUND' : 'NOT FOUND'
  )
  return result.rows[0] || null
}

const findAll = async () => {
  console.log('[user.model] findAll called')

  const sql    = `SELECT * FROM users ORDER BY created_at DESC`
  const result = await pool.query(sql)

  console.log('[user.model] findAll — total users:', result.rows.length)
  return result.rows
}
const updateProfile = async (authId, data) => {
  console.log('[user.model] updateProfile called')
  console.log('[user.model] authId:', authId)
  console.log('[user.model] data to update:', data)

  const { name, phone, avatar_url } = data

  const sql = `
    UPDATE users
    SET
      name       = COALESCE($1, name),
      phone      = COALESCE($2, phone),
      avatar_url = COALESCE($3, avatar_url),
      updated_at = NOW()
    WHERE auth_id = $4
    RETURNING
      id, auth_id, email, name, phone,
      avatar_url, role, reputation,
      daily_post_count, created_at, updated_at
      `
      const values = [
    name       || null,
    phone      || null,
    avatar_url || null,
    authId
  ]

  console.log('[user.model] UPDATE values:', values)

  const result = await pool.query(sql, values)
  console.log('[user.model] updateProfile result:', result.rows[0])
  return result.rows[0]
}

const checkCanPost = async (authId) => {
  console.log('[user.model] checkCanPost called for:', authId)

  const user = await findByAuthId(authId)

  if (!user) {
    console.log('[user.model] user not found — cannot post')
    return { canPost: false, count: 0, remaining: 0 }
  }

  // today's date as YYYY-MM-DD string
  const today        = new Date().toISOString().split('T')[0]
  const lastPostDate = user.last_post_date
    ? new Date(user.last_post_date).toISOString().split('T')[0]
    : null

  console.log('[user.model] today:', today)
  console.log('[user.model] last_post_date in DB:', lastPostDate)
  console.log('[user.model] daily_post_count in DB:', user.daily_post_count)

  // if last post was not today — reset count
  if (lastPostDate !== today) {
    console.log('[user.model] new day detected — resetting daily_post_count to 0')

    await pool.query(
      `UPDATE users
       SET daily_post_count = 0, last_post_date = $1, updated_at = NOW()
       WHERE auth_id = $2`,
      [today, authId]
    )

    return { canPost: true, count: 0, remaining: 5 }
  }

  const count     = user.daily_post_count
  const remaining = 5 - count
  const canPost   = remaining > 0

  console.log('[user.model] checkCanPost result:', { canPost, count, remaining })
  return { canPost, count, remaining }
}

const incrementPostCount = async (authId) => {
  console.log('[user.model] incrementPostCount called for:', authId)

  const today = new Date().toISOString().split('T')[0]

  const sql = `
    UPDATE users
    SET
      daily_post_count = daily_post_count + 1,
      last_post_date   = $1,
      updated_at       = NOW()
    WHERE auth_id = $2
    RETURNING daily_post_count
  `

  const result = await pool.query(sql, [today, authId])

  console.log('[user.model] new daily_post_count:', result.rows[0]?.daily_post_count)
  return result.rows[0]
}

const incrementReputation = async (authId)=>{
  const sql = `UPDATE users 
  SET 
  reputation=reputation+1,
  updated_at=NOW()
  WHERE auth_id=$1
  RETURNING reputation`
  const result = await pool.query(sql,[authId])
  return result.rows[0]
}

const updateRole = async (authId, role) => {
  console.log('[user.model] updateRole called')
  console.log('[user.model] authId:', authId, 'new role:', role)

  const sql = `
    UPDATE users
    SET role = $1, updated_at = NOW()
    WHERE auth_id = $2
    RETURNING id, auth_id, email, role
  `

  const result = await pool.query(sql, [role, authId])
  console.log('[user.model] updateRole result:', result.rows[0])
  return result.rows[0]
}

const banUser = async (id, reason) => {
  console.log('[user.model] banUser called')
  console.log('[user.model] user id:', id, 'reason:', reason)

  const sql = `
    UPDATE users
    SET
      is_banned  = true,
      ban_reason = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING id, email, is_banned, ban_reason
  `

  const result = await pool.query(sql, [reason, id])
  console.log('[user.model] banUser result:', result.rows[0])
  return result.rows[0]
}

const unbanUser = async (id) => {
  console.log('[user.model] unbanUser called for id:', id)

  const sql = `
    UPDATE users
    SET
      is_banned  = false,
      ban_reason = NULL,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, is_banned, ban_reason
  `

  const result = await pool.query(sql, [id])
  console.log('[user.model] unbanUser result:', result.rows[0])
  return result.rows[0]
}
module.exports={
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


