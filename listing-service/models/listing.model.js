const pool = require('../db')

const createListing = async (data) => {
  const {
    userId, type, title, description, category,
    date_occurred, location_label, latitude, longitude,
    reward_offered, reward_note
  } = data

  const sql = `
    INSERT INTO listings (
      user_id, type, title, description, category,
      date_occurred, location_label, latitude, longitude,
      reward_offered, reward_note
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING
      id, user_id, type, title, description, category,
      date_occurred, location_label, latitude, longitude,
      reward_offered, reward_note,
      status, created_at, updated_at
  `
  const result = await pool.query(sql, [
    userId, type, title, description, category,
    date_occurred, location_label, latitude, longitude,
    reward_offered || false, reward_note || null
  ])
  return result.rows[0]
}

const saveImage = async ({ listingId, storageType, url, data }) => {
  const sql = `
    INSERT INTO listing_images (listing_id, storage_type, url, data)
    VALUES ($1, $2, $3, $4)
    RETURNING id, listing_id, storage_type, url, created_at
  `
  const result = await pool.query(sql, [listingId, storageType, url || null, data || null])
  return result.rows[0]
}

const getImages = async (listingId) => {
  const sql = `
    SELECT id, listing_id, storage_type, url, data, created_at
    FROM listing_images WHERE listing_id = $1 ORDER BY created_at ASC
  `
  const result = await pool.query(sql, [listingId])
  return result.rows
}

const findById = async (id) => {
  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at, deleted_at
    FROM listings
    WHERE id = $1 AND deleted_at IS NULL
  `
  const result = await pool.query(sql, [id])
  return result.rows[0] || null
}

const findAll = async (filters = {}) => {
  const { type, category, keyword, reward_offered, page = 1, limit = 10 } = filters

  const conditions = ['deleted_at IS NULL', "status = 'active'"]
  const values     = []
  let   paramCount = 1

  if (type) {
    conditions.push(`type = $${paramCount}`)
    values.push(type)
    paramCount++
  }
  if (category) {
    conditions.push(`category = $${paramCount}`)
    values.push(category)
    paramCount++
  }
  if (keyword) {
    conditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`)
    values.push(`%${keyword}%`)
    paramCount++
  }
  if (reward_offered !== undefined) {
    conditions.push(`reward_offered = $${paramCount}`)
    values.push(reward_offered)
    paramCount++
  }

  const whereClause  = conditions.join(' AND ')
  const countResult  = await pool.query(`SELECT COUNT(*) FROM listings WHERE ${whereClause}`, values)
  const total        = parseInt(countResult.rows[0].count)
  const offset       = (page - 1) * limit

  values.push(limit)
  values.push(offset)

  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at
    FROM listings
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramCount} OFFSET $${paramCount + 1}
  `
  const result = await pool.query(sql, values)
  return { listings: result.rows, total, page: parseInt(page), totalPages: Math.ceil(total / limit) }
}

const findByUserId = async (userId) => {
  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at
    FROM listings
    WHERE user_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC
  `
  const result = await pool.query(sql, [userId])
  return result.rows
}

const updateStatus = async (id, status, userId) => {
  const sql = `
    UPDATE listings SET status = $1, updated_at = NOW()
    WHERE id = $2 AND (user_id = $3 OR $3 = 'admin')
    RETURNING id, user_id, type, title, status, created_at, updated_at
  `
  const result = await pool.query(sql, [status, id, userId])
  return result.rows[0] || null
}

const updateListing = async (id, data, userId) => {
  const {
    title, description, category, date_occurred,
    location_label, latitude, longitude, reward_offered, reward_note
  } = data

  const sql = `
    UPDATE listings
    SET
      title          = COALESCE($1, title),
      description    = COALESCE($2, description),
      category       = COALESCE($3, category),
      date_occurred  = COALESCE($4, date_occurred),
      location_label = COALESCE($5, location_label),
      latitude       = COALESCE($6, latitude),
      longitude      = COALESCE($7, longitude),
      reward_offered = COALESCE($8, reward_offered),
      reward_note    = COALESCE($9, reward_note),
      updated_at     = NOW()
    WHERE id = $10 AND user_id = $11 AND status = 'active' AND deleted_at IS NULL
    RETURNING
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at
  `
  const result = await pool.query(sql, [
    title || null, description || null, category || null,
    date_occurred || null, location_label || null,
    latitude || null, longitude || null,
    reward_offered !== undefined ? reward_offered : null,
    reward_note || null, id, userId
  ])
  return result.rows[0] || null
}

const softDelete = async (id, userId) => {
  const sql = `
    UPDATE listings SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND user_id = $2 AND status = 'active' AND deleted_at IS NULL
    RETURNING id, user_id, status, deleted_at
  `
  const result = await pool.query(sql, [id, userId])
  return result.rows[0] || null
}

const adminRemove = async (id) => {
  const sql = `
    UPDATE listings SET status = 'removed', updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING id, status, updated_at
  `
  const result = await pool.query(sql, [id])
  return result.rows[0] || null
}

const findOppositeActive = async (type, limit = 500) => {
  const oppositeType = type === 'lost' ? 'found' : 'lost'
  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label, latitude, longitude, created_at
    FROM listings
    WHERE type = $1 AND status = 'active' AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT $2
  `
  const result = await pool.query(sql, [oppositeType, limit])
  return result.rows
}

module.exports = {
  createListing,
  saveImage,
  getImages,
  findById,
  findAll,
  findByUserId,
  updateStatus,
  updateListing,
  softDelete,
  adminRemove,
  findOppositeActive
}
