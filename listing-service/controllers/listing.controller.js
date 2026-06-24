const listingService = require('../services/listing.service')

const createListing = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await listingService.createListing(req.user._id, req.body, req.files || [], token)
    return res.status(201).json({ success: true, data: result, message: 'Listing created successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getAllListings = async (req, res) => {
  try {
    const result = await listingService.getAllListings(req.query)
    return res.status(200).json({ success: true, data: result, message: `${result.total} listings found` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getListingById = async (req, res) => {
  try {
    const result = await listingService.getListingById(req.params.id)
    return res.status(200).json({ success: true, data: result, message: 'Listing retrieved' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getMyListings = async (req, res) => {
  try {
    const result = await listingService.getMyListings(req.user._id)
    return res.status(200).json({ success: true, data: result, message: `${result.length} listings retrieved` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const updateListing = async (req, res) => {
  try {
    const result = await listingService.updateListing(req.params.id, req.user._id, req.body)
    return res.status(200).json({ success: true, data: result, message: 'Listing updated successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const deleteListing = async (req, res) => {
  try {
    await listingService.deleteListing(req.params.id, req.user._id)
    return res.status(200).json({ success: true, data: null, message: 'Listing deleted successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const markResolved = async (req, res) => {
  try {
    const result = await listingService.markResolved(req.params.id, req.user._id)
    return res.status(200).json({ success: true, data: result, message: 'Listing marked as resolved' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const adminRemove = async (req, res) => {
  try {
    const result = await listingService.adminRemoveListing(req.params.id)
    return res.status(200).json({ success: true, data: result, message: 'Listing removed by admin' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getOppositeListings = async (req, res) => {
  try {
    const { type, limit } = req.query
    const result = await listingService.getOppositeListings(type, parseInt(limit) || 500)
    return res.status(200).json({ success: true, data: result })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
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
  adminRemove,
  getOppositeListings
}
