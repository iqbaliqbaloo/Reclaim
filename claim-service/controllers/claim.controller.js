

const claimService = require('../services/claim.service')

const submitClaim = async (req, res) => {
  try {
    console.log('[claim.controller] submitClaim called')
    console.log('[claim.controller] req.user:', req.user)
    console.log('[claim.controller] req.body:', {
      listingId:        req.body.listingId,
      descriptionLength: req.body.claimDescription?.length
    })

    const token = req.headers.authorization?.split(' ')[1]
    const result = await claimService.submitClaim(req.user.userId, req.body, token)

    return res.status(201).json({
      success: true,
      data:    result,
      message: 'Claim submitted successfully'
    })
  } catch (err) {
    console.error('[claim.controller] submitClaim error:', err.message)
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}


const approveClaim = async (req, res) => {
  try {
    console.log('[claim.controller] approveClaim called')
    console.log('[claim.controller] claimId:', req.params.id)
    console.log('[claim.controller] req.user:', req.user)

    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.approveClaim(req.params.id, req.user.userId, token)

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Claim approved. Chat is now open.'
    })
  } catch (err) {
    console.error('[claim.controller] approveClaim error:', err.message)
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}


const rejectClaim = async (req, res) => {
  try {
    console.log('[claim.controller] rejectClaim called')
    console.log('[claim.controller] claimId:', req.params.id)

    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.rejectClaim(req.params.id, req.user.userId, token)

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Claim rejected'
    })
  } catch (err) {
    console.error('[claim.controller] rejectClaim error:', err.message)
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}


const getClaimsForListing = async (req, res) => {
  try {
    console.log('[claim.controller] getClaimsForListing:', req.params.id)

    const token  = req.headers.authorization?.split(' ')[1]
    const result = await claimService.getClaimsForListing(req.params.id, req.user.userId, token)

    return res.status(200).json({
      success: true,
      data:    result,
      message: `${result.length} claims found`
    })
  } catch (err) {
    console.error('[claim.controller] getClaimsForListing error:', err.message)
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}


const getMyClaims = async (req, res) => {
  try {
    console.log('[claim.controller] getMyClaims for:', req.user.userId)

    const result = await claimService.getMyClaims(req.user.userId)

    return res.status(200).json({
      success: true,
      data:    result,
      message: `${result.length} claims found`
    })
  } catch (err) {
    console.error('[claim.controller] getMyClaims error:', err.message)
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

module.exports = {
  submitClaim,
  approveClaim,
  rejectClaim,
  getClaimsForListing,
  getMyClaims
}