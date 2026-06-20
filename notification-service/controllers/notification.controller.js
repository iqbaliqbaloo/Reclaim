const notificationService = require('../services/notification.service')

// ─── Get my notifications ─────────────────────────────────────────────────────

const getMyNotifications = async (req, res) => {
  try {
    console.log('[notification.controller] getMyNotifications for:', req.user.userId)
    const result = await notificationService.getNotificationsForUser(req.user.userId)
    return res.status(200).json({ success: true, data: result, message: `${result.length} notifications` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ─── Mark read ────────────────────────────────────────────────────────────────

const markRead = async (req, res) => {
  try {
    await notificationService.markRead(req.user.userId, req.params.id)
    return res.status(200).json({ success: true, data: null, message: 'Marked as read' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const markAllRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.userId)
    return res.status(200).json({ success: true, data: null, message: 'All marked as read' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

// ─── Internal handlers (called by other services) ─────────────────────────────

const handleNewMatch = async (req, res) => {
  try {
    console.log('[notification.controller] handleNewMatch:', req.body)
    await notificationService.handleNewMatch(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimReceived = async (req, res) => {
  try {
    console.log('[notification.controller] handleClaimReceived:', req.body)
    await notificationService.handleClaimReceived(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimApproved = async (req, res) => {
  try {
    await notificationService.handleClaimApproved(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimRejected = async (req, res) => {
  try {
    await notificationService.handleClaimRejected(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimExpired = async (req, res) => {
  try {
    await notificationService.handleClaimExpired(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimReminder1 = async (req, res) => {
  try {
    await notificationService.handleClaimReminder1(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimReminder2 = async (req, res) => {
  try {
    await notificationService.handleClaimReminder2(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleNewMessage = async (req, res) => {
  try {
    await notificationService.handleNewMessage(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

const handleClaimsRejectedBulk = async (req, res) => {
  try {
    await notificationService.handleClaimsRejectedBulk(req.body)
    return res.status(200).json({ success: true, data: null, message: 'Notified' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = {
  getMyNotifications,
  markRead,
  markAllRead,
  handleNewMatch,
  handleClaimReceived,
  handleClaimApproved,
  handleClaimRejected,
  handleClaimExpired,
  handleClaimReminder1,
  handleClaimReminder2,
  handleNewMessage,
  handleClaimsRejectedBulk
}