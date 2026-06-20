const axios        = require('axios')
const listingModel = require('../models/listing.model')

const callService = async (method, url, data = {}, token = null) => {
  try {
    console.log('[listing.service] calling service:', method, url)
    console.log('[listing.service] data sent:', data)

    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log('[listing.service] token attached to request')
    }

    const response = await axios({
      method,
      url,
      data,
      headers,
      timeout: 5000
    })
       console.log('[listing.service] service response:', response.data)
    return response.data
  } catch (err) {
    console.error('[listing.service] service call failed:', url, err.message)
    return null
  }
}

const createListing = async (userId, data, files = [], token) => {
  console.log('[listing.service] createListing called')
  console.log('[listing.service] userId:', userId)
  console.log('[listing.service] data received:', data)
  console.log('[listing.service] files count:', files.length)
  console.log('[listing.service] checking post limit with user-service...')
  const limitCheck = await callService(
    'get',
    `${process.env.USER_SERVICE_URL}/users/internal/can-post`,
    {},
    token
  )

  console.log('[listing.service] limit check result:', limitCheck)

  if (!limitCheck || !limitCheck.data?.canPost) {
    const err = new Error('Daily post limit reached. You can post 5 listings per day.')
    err.statusCode = 429
    throw err
  }  

  const listing = await listingModel.createListing({
    userId,
    ...data
  })

  console.log('[listing.service] listing created in DB:', listing.id)

     const savedImages = []

  if (files && files.length > 0) {
    console.log('[listing.service] saving', files.length, 'images')

    for (const file of files) {
      console.log('[listing.service] saving image:', file.originalname, file.mimetype)
      console.log('[listing.service] image size:', file.size, 'bytes')

      const image = await listingModel.saveImage({
        listingId:   listing.id,
        storageType: 'db',
        url:         null,
        data:        file.buffer
      })

      // convert bytea buffer to base64 for frontend
      savedImages.push({
        id:          image.id,
        storageType: image.storage_type,
        url:         `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      })
    }
    console.log('[listing.service] all images saved:', savedImages.length)
  }
  console.log('[listing.service] incrementing post count...')
  const countResult = await callService(
    'post',
    `${process.env.USER_SERVICE_URL}/users/internal/increment-post-count`,
    {},
    token
  )
 console.log('[listing.service] firing async match scoring...')
  callService(
    'post',
    `${process.env.MATCH_SERVICE_URL}/matches/score`,
    {
      listingId: listing.id,
      userId,
      type:      listing.type,
      title:     listing.title,
      description: data.description,
      category:  listing.category,
      latitude:  data.latitude,
      longitude: data.longitude,
      date_occurred: listing.date_occurred
    },
    token
  )
      const response = {
    ...listing,
    images: savedImages
  }

  console.log('[listing.service] createListing complete, returning:', response)
  return response
}

const getListingById = async (id) => {
  console.log('[listing.service] getListingById called for id:', id)

  const listing = await listingModel.findById(id)

  if (!listing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }
 const rawImages = await listingModel.getImages(id)
  console.log('[listing.service] raw images found:', rawImages.length)

  /*
    Convert images for frontend:
    S3 images → return url directly
    DB images → convert bytea to base64 string
  */
  const images = rawImages.map(img => {
    if (img.storage_type === 's3') {
      return { id: img.id, storageType: 's3', url: img.url }
    }
    // convert Buffer to base64
    const base64 = img.data
      ? `data:image/jpeg;base64,${Buffer.from(img.data).toString('base64')}`
      : null
    return { id: img.id, storageType: 'db', url: base64 }
  })

  const result = { ...listing, images }
  console.log('[listing.service] getListingById result:', {
    ...result,
    images: `${images.length} images`
  })
  return result
}

const getAllListings = async (filters) => {
  console.log('[listing.service] getAllListings called')
  console.log('[listing.service] filters:', filters)

  // convert string booleans from query params
  if (filters.reward_offered !== undefined) {
    filters.reward_offered = filters.reward_offered === 'true'
  }

  const result = await listingModel.findAll(filters)
  console.log('[listing.service] getAllListings result:', {
    total:      result.total,
    page:       result.page,
    totalPages: result.totalPages,
    count:      result.listings.length
  })

  return result
}

const getMyListings = async (userId) => {
  console.log('[listing.service] getMyListings called for:', userId)

  const listings = await listingModel.findByUserId(userId)
  console.log('[listing.service] my listings count:', listings.length)
  return listings
}

const updateListing = async (id, userId, data) => {
  console.log('[listing.service] updateListing called')
  console.log('[listing.service] id:', id, 'userId:', userId)

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

  console.log('[listing.service] listing updated:', updated)
  return updated
}

const deleteListing = async (id, userId) => {
  console.log('[listing.service] deleteListing called')
  console.log('[listing.service] id:', id, 'userId:', userId)

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
  console.log('[listing.service] listing soft deleted:', deleted)
  return deleted
}

const markResolved = async (id, userId) => {
  console.log('[listing.service] markResolved called')
  console.log('[listing.service] id:', id, 'userId:', userId)

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

  const updated = await listingModel.updateStatus(id, 'resolved', userId)
  console.log('[listing.service] listing resolved:', updated)
  return updated
}

const adminRemoveListing = async (id) => {
  console.log('[listing.service] adminRemoveListing called for:', id)

  const existing = await listingModel.findById(id)

  if (!existing) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }

  const removed = await listingModel.adminRemove(id)
  console.log('[listing.service] listing admin removed:', removed)
  return removed
}

module.exports = {
  createListing,
  getListingById,
  getAllListings,
  getMyListings,
  updateListing,
  deleteListing,
  markResolved,
  adminRemoveListing
}
