const matchService = require('../services/match.service')

const scoreNewListing = async (req, res) => {
  try {
    res.status(202).json({ success: true, data: null, message: 'Scoring started' })

    const token = req.headers.authorization?.split(' ')[1]
    await matchService.scoreNewListing(req.body, token)
  } catch (err) {
    console.error('[match.controller] scoreNewListing error:', err.message)
  }
}

const getMatchesForListing = async (req, res) => {
  try {
    const matches = await matchService.getMatchesForListing(
      req.params.id,
      req.query.type,
      req.user._id
    )
    return res.status(200).json({ success: true, data: matches, message: `${matches.length} matches found` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getMatchesForUser = async (req, res) => {
  try {
    const matches = await matchService.getMatchesForUser(req.user._id)
    return res.status(200).json({ success: true, data: matches, message: `${matches.length} matches found` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const dismissMatch = async (req, res) => {
  try {
    const result = await matchService.dismissMatch(req.params.id, req.user._id)
    return res.status(200).json({ success: true, data: result, message: 'Match dismissed successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

module.exports = { scoreNewListing, getMatchesForListing, getMatchesForUser, dismissMatch }
