const axios        = require('axios')
const listingModel = require('../models/listing.model')

const callService = async (method, url, data = {}, token = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await axios({ method, url, data, headers, timeout: 5000 })
    return response.data
  } catch (err) {
    console.error('[listing.service] service call failed:', url, err.message)
    return null
  }
}

const createListing = async (userId, data, files = [], token) => {
  const limitCheck = await callService(
    'get',
    `${process.env.USER_SERVICE_URL}/api/users/internal/can-post`,
    {},
    token
  )

  if (limitCheck && limitCheck.data?.canPost === false) {
    const err = new Error('Daily post limit reached. You can post 5 listings per day.')
    err.statusCode = 429
    throw err
  }

  const listing = await listingModel.createListing({ userId, ...data })

  const savedImages = []
  if (files && files.length > 0) {
    for (const file of files) {
      const image = await listingModel.saveImage({
        listingId:   listing.id,
        storageType: 'db',
        url:         null,
        data:        file.buffer
      })
      savedImages.push({
        id:          image.id,
        storageType: image.storage_type,
        url:         `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      })
    }
  }

  callService(
    'post',
    `${process.env.USER_SERVICE_URL}/api/users/internal/increment-post-count`,
    {},
    token
  )

  callService(
    'post',
    `${process.env.MATCH_SERVICE_URL}/matches/score`,
    {
      listingId:     listing.id,
      userId,
      type:          listing.type,
      title:         listing.title,
      description:   data.description,
      category:      listing.category,
      latitude:      data.latitude,
      longitude:     data.longitude,
      date_occurred: listing.date_occurred
    },
    token
  )

  return { ...listing, images: savedImages }
}

const getListingById = async (id) => {
  const listing = await listingModel.findById(id)
  if (!listing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }
  const rawImages = await listingModel.getImages(id)
  const images = rawImages.map(img => {
    if (img.storage_type === 's3') return { id: img.id, storageType: 's3', url: img.url }
    const base64 = img.data
      ? `data:image/jpeg;base64,${Buffer.from(img.data).toString('base64')}`
      : null
    return { id: img.id, storageType: 'db', url: base64 }
  })
  return { ...listing, images }
}

const getAllListings = async (filters) => {
  if (filters.reward_offered !== undefined) {
    filters.reward_offered = filters.reward_offered === 'true'
  }
  return await listingModel.findAll(filters)
}

const getMyListings = async (userId) => {
  return await listingModel.findByUserId(userId)
}

const updateListing = async (id, userId, data) => {
  const existing = await listingModel.findById(id)
  if (!existing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }
  if (existing.user_id !== userId) {
    const err = new Error('You can only update your own listings')
    err.statusCode = 403
    throw err
  }
  if (existing.status !== 'active') {
    const err = new Error('Only active listings can be updated')
    err.statusCode = 400
    throw err
  }
  const updated = await listingModel.updateListing(id, data, userId)
  if (!updated) {
    const err = new Error('Update failed')
    err.statusCode = 500
    throw err
  }
  return updated
}

const deleteListing = async (id, userId) => {
  const existing = await listingModel.findById(id)
  if (!existing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }
  if (existing.user_id !== userId) {
    const err = new Error('You can only delete your own listings')
    err.statusCode = 403
    throw err
  }
  const deleted = await listingModel.softDelete(id, userId)
  if (!deleted) {
    const err = new Error('Delete failed')
    err.statusCode = 500
    throw err
  }
  return deleted
}

const markResolved = async (id, userId) => {
  const existing = await listingModel.findById(id)
  if (!existing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }
  if (existing.user_id !== userId) {
    const err = new Error('You can only resolve your own listings')
    err.statusCode = 403
    throw err
  }
  return await listingModel.updateStatus(id, 'resolved', userId)
}

const adminRemoveListing = async (id) => {
  const existing = await listingModel.findById(id)
  if (!existing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }
  return await listingModel.adminRemove(id)
}

const getOppositeListings = async (type, limit) => {
  if (!type || !['lost', 'found'].includes(type)) {
    const err = new Error('Valid type (lost or found) is required')
    err.statusCode = 400
    throw err
  }
  return await listingModel.findOppositeActive(type, limit || 500)
}

module.exports = {
  createListing,
  getListingById,
  getAllListings,
  getMyListings,
  updateListing,
  deleteListing,
  markResolved,
  adminRemoveListing,
  getOppositeListings
}
