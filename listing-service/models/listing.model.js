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