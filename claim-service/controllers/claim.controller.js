const claimService = require('../services/claim.service')

const submitClaim = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.submitClaim(req.user._id, req.body, token)
    return res.status(201).json({ success: true, data: result, message: 'Claim submitted successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const approveClaim = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.approveClaim(req.params.id, req.user._id, token)
    return res.status(200).json({ success: true, data: result, message: 'Claim approved. Chat is now open.' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const rejectClaim = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.rejectClaim(req.params.id, req.user._id, token)
    return res.status(200).json({ success: true, data: result, message: 'Claim rejected' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getClaimsForListing = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.getClaimsForListing(req.params.id, req.user._id, token)
    return res.status(200).json({ success: true, data: result, message: `${result.length} claims found` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getMyClaims = async (req, res) => {
  try {
    const result = await claimService.getMyClaims(req.user._id)
    return res.status(200).json({ success: true, data: result, message: `${result.length} claims found` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

module.exports = { submitClaim, approveClaim, rejectClaim, getClaimsForListing, getMyClaims }
