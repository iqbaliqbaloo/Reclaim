const pool = require('../db')

const createListing = async (data) => {
  console.log('[listing.model] createListing called')
  console.log('[listing.model] data received:', data)

  const {
    userId,
    type,
    title,
    description,
    category,
    date_occurred,
    location_label,
    latitude,
    longitude,
    reward_offered,
    reward_note
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
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at
  `

  const values = [
    userId,
    type,
    title,
    description,
    category,
    date_occurred,
    location_label,
    latitude,
    longitude,
    reward_offered || false,
    reward_note    || null
  ]

  console.log('[listing.model] INSERT values:', {
    ...values,
    8: '***hidden latitude***',
    9: '***hidden longitude***'
  })

  const result = await pool.query(sql, values)

  console.log('[listing.model] listing created in DB:', result.rows[0])
  return result.rows[0]
}

const saveImage = async ({ listingId, storageType, url, data }) => {
  console.log('[listing.model] saveImage called')
  console.log('[listing.model] listingId:', listingId)
  console.log('[listing.model] storageType:', storageType)
  console.log('[listing.model] url:', url || 'none (db storage)')
  console.log('[listing.model] data size:', data ? `${data.length} bytes` : 'none')

  const sql = `
    INSERT INTO listing_images (listing_id, storage_type, url, data)
    VALUES ($1, $2, $3, $4)
    RETURNING id, listing_id, storage_type, url, created_at
  `

  const result = await pool.query(sql, [
    listingId,
    storageType,
    url  || null,
    data || null
  ])

  console.log('[listing.model] image saved:', result.rows[0])
  return result.rows[0]
}
const getImages = async (listingId) =>{
  console.log('[listing.model] getImages called for listing:', listingId)
  const sql = `SELECT id ,listing_id,storage_type,url,data,created_at FROM listing_images WHERE listing_id=$1 
  ORDER BY created_at ASC`

  const result = await pool.query(sql,[listingId])
  return result.rows
}

const findById = async (id) => {
  console.log('[listing.model] findById:', id)

  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at, deleted_at
    FROM listings
    WHERE id = $1
    AND deleted_at IS NULL
  `

  const result = await pool.query(sql, [id])

  console.log('[listing.model] findById result:',
    result.rows[0] ? 'FOUND' : 'NOT FOUND'
  )
  return result.rows[0] || null
}

const findAll = async (filters = {}) => {
  console.log('[listing.model] findAll called')
  console.log('[listing.model] filters received:', filters)

  const {
    type,
    category,
    keyword,
    reward_offered,
    page  = 1,
    limit = 10
  } = filters

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

  const whereClause = conditions.join(' AND ')

  // count total for pagination
  const countSql    = `SELECT COUNT(*) FROM listings WHERE ${whereClause}`
  const countResult = await pool.query(countSql, values)
  const total       = parseInt(countResult.rows[0].count)

  console.log('[listing.model] total matching listings:', total)

  // pagination
  const offset = (page - 1) * limit

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

  console.log('[listing.model] findAll SQL built with', conditions.length, 'conditions')
  console.log('[listing.model] values:', values)

  const result = await pool.query(sql, values)

  console.log('[listing.model] listings returned:', result.rows.length)

  return {
    listings:   result.rows,
    total,
    page:       parseInt(page),
    totalPages: Math.ceil(total / limit)
  }
}

const findByUserId = async (userId) => {
  console.log('[listing.model] findByUserId:', userId)

  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at
    FROM listings
    WHERE user_id = $1
    AND deleted_at IS NULL
    ORDER BY created_at DESC
  `

  const result = await pool.query(sql, [userId])

  console.log('[listing.model] findByUserId — listings found:', result.rows.length)
  return result.rows
}


const updateStatus = async (id, status, userId) => {
  console.log('[listing.model] updateStatus called')
  console.log('[listing.model] listing id:', id)
  console.log('[listing.model] new status:', status)
  console.log('[listing.model] called by userId:', userId)

  const sql = `
    UPDATE listings
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    AND (user_id = $3 OR $3 = 'admin')
    RETURNING
      id, user_id, type, title, status,
      created_at, updated_at
  `

  const result = await pool.query(sql, [status, id, userId])

  if (result.rows.length === 0) {
    console.log('[listing.model] updateStatus — not found or not authorized')
    return null
  }
  console.log('[listing.model] status updated:', result.rows[0])
  return result.rows[0]
}

const updateListing = async (id, data, userId) => {
  console.log('[listing.model] updateListing called')
  console.log('[listing.model] listing id:', id)
  console.log('[listing.model] data to update:', data)

  const {
    title,
    description,
    category,
    date_occurred,
    location_label,
    latitude,
    longitude,
    reward_offered,
    reward_note
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
      WHERE id = $10
    AND user_id = $11
    AND status = 'active'
    AND deleted_at IS NULL
    RETURNING
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      reward_offered, reward_note,
      status, created_at, updated_at
  `

  const values = [
    title          || null,
    description    || null,
    category       || null,
    date_occurred  || null,
    location_label || null,
    latitude       || null,
    longitude      || null,
    reward_offered !== undefined ? reward_offered : null,
    reward_note    || null,
    id,
    userId
  ]

  console.log('[listing.model] UPDATE values (lat/lng hidden)')

  const result = await pool.query(sql, values)

  if (result.rows.length === 0) {
    console.log('[listing.model] updateListing — not found or not authorized')
    return null
  }

  console.log('[listing.model] listing updated:', result.rows[0])
  return result.rows[0]
}

const softDelete = async (id, userId) => {
  console.log('[listing.model] softDelete called')
  console.log('[listing.model] listing id:', id)
  console.log('[listing.model] userId:', userId)

  const sql = `
    UPDATE listings
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = $1
    AND user_id = $2
    AND status = 'active'
    AND deleted_at IS NULL
    RETURNING id, user_id, status, deleted_at
  `

  const result = await pool.query(sql, [id, userId])

  if (result.rows.length === 0) {
    console.log('[listing.model] softDelete — not found or not authorized')
    return null
  }

  console.log('[listing.model] listing soft deleted:', result.rows[0])
  return result.rows[0]
}

const adminRemove = async (id) => {
  console.log('[listing.model] adminRemove called for listing:', id)

  const sql = `
    UPDATE listings
    SET status = 'removed', updated_at = NOW()
    WHERE id = $1
    AND deleted_at IS NULL
    RETURNING id, status, updated_at
  `

  const result = await pool.query(sql, [id])

  console.log('[listing.model] adminRemove result:', result.rows[0])
  return result.rows[0] || null
}

const findOppositeActive = async (type, limit = 500) => {
  console.log('[listing.model] findOppositeActive called')
  console.log('[listing.model] looking for opposite of type:', type)

  const oppositeType = type === 'lost' ? 'found' : 'lost'

  const sql = `
    SELECT
      id, user_id, type, title, description, category,
      date_occurred, location_label,
      latitude, longitude,
      created_at
    FROM listings
    WHERE type = $1
    AND status = 'active'
    AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT $2
  `

  const result = await pool.query(sql, [oppositeType, limit])
  console.log('[listing.model] opposite listings found:', result.rows.length)
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