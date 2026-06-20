const matchService = require('../services/match.service')

// ─── Score new listing ────────────────────────────────────────────────────────


const scoreNewListing = async (req, res) => {
  try {
    console.log('[match.controller] scoreNewListing called')
    console.log('[match.controller] req.body received:', req.body)

  
    res.status(202).json({
      success: true,
      data:    null,
      message: 'Scoring started'
    })

   
    const token = req.headers.authorization?.split(' ')[1]
    console.log('[match.controller] token for service calls:', !!token)

    // run scoring in background AFTER response sent
    console.log('[match.controller] starting background scoring...')
    await matchService.scoreNewListing(req.body, token)
    console.log('[match.controller] background scoring complete')

  } catch (err) {
    console.error('[match.controller] scoreNewListing error:', err.message)
    // response already sent — just log the error
  }
}

// ─── Get matches for listing ──────────────────────────────────────────────────


const getMatchesForListing = async (req, res) => {
  try {
    console.log('[match.controller] getMatchesForListing called')
    console.log('[match.controller] req.params.id:', req.params.id)
    console.log('[match.controller] req.query:', req.query)
    console.log('[match.controller] req.user:', req.user)

    const matches = await matchService.getMatchesForListing(
      req.params.id,
      req.query.type,
      req.user.userId
    )

    console.log('[match.controller] sending response:', matches.length, 'matches')
    return res.status(200).json({
      success: true,
      data:    matches,
      message: `${matches.length} matches found`
    })
  } catch (err) {
    console.error('[match.controller] getMatchesForListing error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}


const getMatchesForUser = async (req, res) => {
  try {
    console.log('[match.controller] getMatchesForUser called')
    console.log('[match.controller] req.user:', req.user)

    const matches = await matchService.getMatchesForUser(req.user.userId)

    console.log('[match.controller] sending response:', matches.length, 'matches')
    return res.status(200).json({
      success: true,
      data:    matches,
      message: `${matches.length} matches found`
    })
  } catch (err) {
    console.error('[match.controller] getMatchesForUser error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const dismissMatch = async (req, res) => {
  try {
    console.log('[match.controller] dismissMatch called')
    console.log('[match.controller] req.params.id:', req.params.id)
    console.log('[match.controller] req.user:', req.user)

    const result = await matchService.dismissMatch(
      req.params.id,
      req.user.userId
    )

    console.log('[match.controller] sending response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Match dismissed successfully'
    })
  } catch (err) {
    console.error('[match.controller] dismissMatch error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

module.exports = {
  scoreNewListing,
  getMatchesForListing,
  getMatchesForUser,
  dismissMatch
}