const adminService = require('../services/admin.service')

const submitReport = async (req, res) => {
  try {
    const result = await adminService.submitReport(req.user._id, req.body)
    return res.status(201).json({ success: true, data: result, message: 'Report submitted' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getReportsQueue = async (req, res) => {
  try {
    const result = await adminService.getReportsQueue()
    return res.status(200).json({ success: true, data: result, message: `${result.length} reports` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const resolveReport = async (req, res) => {
  try {
    const result = await adminService.resolveReport(req.params.id, req.user._id, req.body.action || 'resolved')
    return res.status(200).json({ success: true, data: result, message: 'Report resolved' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const banUser = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await adminService.banUser(req.params.id, req.body.reason, token)
    return res.status(200).json({ success: true, data: result, message: 'User banned' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const unbanUser = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await adminService.unbanUser(req.params.id, token)
    return res.status(200).json({ success: true, data: result, message: 'User unbanned' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const removeListing = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await adminService.removeListing(req.params.id, token)
    return res.status(200).json({ success: true, data: result, message: 'Listing removed' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await adminService.getAllUsers(token)
    return res.status(200).json({ success: true, data: result, message: `${result.length} users` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const getStats = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await adminService.getStats(token)
    return res.status(200).json({ success: true, data: result, message: 'Stats retrieved' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = {
  submitReport,
  getReportsQueue,
  resolveReport,
  banUser,
  unbanUser,
  removeListing,
  getAllUsers,
  getStats
}
