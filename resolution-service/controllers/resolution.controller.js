const resolutionService = require('../services/resolution.service')

const resolve = async (req, res) => {
  try {
    console.log('[resolution.controller] resolve called')
    console.log('[resolution.controller] req.body:', req.body)

    // capture IPs for anti-fraud check
    const lostIp  = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const foundIp = req.body.foundIp || null

    const result = await resolutionService.resolve({
      ...req.body,
      lostIp,
      foundIp
    })

    return res.status(200).json({ success: true, data: result, message: 'Resolved' })
  } catch (err) {
    console.error('[resolution.controller] resolve error:', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

const getResolution = async (req, res) => {
  try {
    const result = await resolutionService.getResolution(req.params.conversationId)
    return res.status(200).json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = { resolve, getResolution }