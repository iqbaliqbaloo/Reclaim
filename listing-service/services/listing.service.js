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
