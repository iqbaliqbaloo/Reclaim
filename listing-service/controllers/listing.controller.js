const listingService = require('../services/listing.service')

const createListing = async (req, res) => {
  try {
    console.log('[listing.controller] createListing called')
    console.log('[listing.controller] req.user:', req.user)
    console.log('[listing.controller] req.body received:', req.body)
    console.log('[listing.controller] files received:', req.files?.length || 0)

    /*
      Extract JWT token from Authorization header
      Pass to service so it can call user-service
      FORM: "Bearer eyJhbG..." → extract "eyJhbG..."
    */
    const token = req.headers.authorization?.split(' ')[1]
    console.log('[listing.controller] token extracted for service calls:', !!token)

    const result = await listingService.createListing(
      req.user.userId,
      req.body,
      req.files || [],
      token
    )
console.log('[listing.controller] sending createListing response')
    return res.status(201).json({
      success: true,
      data:    result,
      message: 'Listing created successfully'
    })
  } catch (err) {
    console.error('[listing.controller] createListing error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const getAllListings = async (req, res) => {
  try {
    console.log('[listing.controller] getAllListings called')
    console.log('[listing.controller] req.query received:', req.query)

    const result = await listingService.getAllListings(req.query)

    console.log('[listing.controller] sending getAllListings response:', {
      total: result.total,
      page:  result.page,
      count: result.listings.length
    })

    return res.status(200).json({
      success: true,
      data:    result,
      message: `${result.total} listings found`
    })
  } catch (err) {
    console.error('[listing.controller] getAllListings error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const getListingById = async (req, res) => {
  try {
    console.log('[listing.controller] getListingById called')
    console.log('[listing.controller] req.params.id:', req.params.id)

    const result = await listingService.getListingById(req.params.id)

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Listing retrieved'
    })
  } catch (err) {
    console.error('[listing.controller] getListingById error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const getMyListings = async (req, res) => {
  try {
    console.log('[listing.controller] getMyListings called')
    console.log('[listing.controller] req.user:', req.user)

    const result = await listingService.getMyListings(req.user.userId)

    return res.status(200).json({
      success: true,
      data:    result,
      message: `${result.length} listings retrieved`
    })
  } catch (err) {
    console.error('[listing.controller] getMyListings error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const updateListing = async (req, res) => {
  try {
    console.log('[listing.controller] updateListing called')
    console.log('[listing.controller] req.params.id:', req.params.id)
    console.log('[listing.controller] req.user:', req.user)
    console.log('[listing.controller] req.body received:', req.body)

    const result = await listingService.updateListing(
      req.params.id,
      req.user.userId,
      req.body
    )

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Listing updated successfully'
    })
  } catch (err) {
    console.error('[listing.controller] updateListing error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const deleteListing = async (req, res) => {
  try {
    console.log('[listing.controller] deleteListing called')
    console.log('[listing.controller] req.params.id:', req.params.id)
    console.log('[listing.controller] req.user:', req.user)

    await listingService.deleteListing(req.params.id, req.user.userId)

    return res.status(200).json({
      success: true,
      data:    null,
      message: 'Listing deleted successfully'
    })
  } catch (err) {
    console.error('[listing.controller] deleteListing error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}


const markResolved = async (req, res) => {
  try {
    console.log('[listing.controller] markResolved called')
    console.log('[listing.controller] req.params.id:', req.params.id)
    console.log('[listing.controller] req.user:', req.user)

    const result = await listingService.markResolved(
      req.params.id,
      req.user.userId
    )

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Listing marked as resolved'
    })
  } catch (err) {
    console.error('[listing.controller] markResolved error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const adminRemove = async (req, res) => {
  try {
    console.log('[listing.controller] adminRemove called')
    console.log('[listing.controller] req.params.id:', req.params.id)
    console.log('[listing.controller] admin user:', req.user)

    const result = await listingService.adminRemoveListing(req.params.id)

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Listing removed by admin'
    })
  } catch (err) {
    console.error('[listing.controller] adminRemove error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

module.exports = {
  createListing,
  getAllListings,
  getListingById,
  getMyListings,
  updateListing,
  deleteListing,
  markResolved,
  adminRemove
}