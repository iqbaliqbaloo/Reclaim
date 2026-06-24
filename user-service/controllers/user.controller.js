const userService = require('../services/user.service')
const userModel   = require('../models/user.model')

const createProfile = async (req, res) => {
  try {
    const result = await userService.createProfile(req.body)
    return res.status(201).json({ success: true, data: result, message: 'Profile created successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getMyProfile = async (req, res) => {
  try {
    const result = await userService.getMyProfile(req.user._id, req.user.email, req.user.role)
    return res.status(200).json({ success: true, data: result, message: 'Profile retrieved' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getPublicProfile = async (req, res) => {
  try {
    const result = await userService.getPublicProfile(req.params.id)
    return res.status(200).json({ success: true, data: result, message: 'Profile retrieved' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const updateProfile = async (req, res) => {
  try {
    const result = await userService.updateProfile(req.user._id, req.body)
    return res.status(200).json({ success: true, data: result, message: 'Profile updated successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const checkCanPost = async (req, res) => {
  try {
    const result = await userService.checkCanPost(req.user._id)
    return res.status(200).json({ success: true, data: result, message: 'Post limit checked' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const incrementPostCount = async (req, res) => {
  try {
    const result = await userService.incrementPostCount(req.user._id)
    return res.status(200).json({ success: true, data: result, message: 'Post count incremented' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const incrementReputation = async (req, res) => {
  try {
    const { authId } = req.body
    if (!authId) {
      return res.status(400).json({ success: false, error: 'authId is required' })
    }
    const result = await userService.incrementReputation(authId)
    return res.status(200).json({ success: true, data: result, message: 'Reputation incremented' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const updateRole = async (req, res) => {
  try {
    const { authId, role } = req.body
    if (!authId || !role) {
      return res.status(400).json({ success: false, error: 'authId and role are required' })
    }
    const result = await userService.updateRole(authId, role)
    return res.status(200).json({ success: true, data: result, message: 'Role updated successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getAllUsers = async (req, res) => {
  try {
    const result = await userService.getAllUsers()
    return res.status(200).json({ success: true, data: result, message: `${result.length} users retrieved` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const banUser = async (req, res) => {
  try {
    const result = await userService.banUser(req.params.id, req.body.reason)
    return res.status(200).json({ success: true, data: result, message: 'User banned successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const unbanUser = async (req, res) => {
  try {
    const result = await userService.unbanUser(req.params.id)
    return res.status(200).json({ success: true, data: result, message: 'User unbanned successfully' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getAccountAge = async (req, res) => {
  try {
    const user = await userModel.findByAuthId(req.params.authId)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })
    const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    return res.status(200).json({ success: true, data: { days_since_created: days } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = {
  createProfile,
  getMyProfile,
  getPublicProfile,
  updateProfile,
  checkCanPost,
  incrementPostCount,
  incrementReputation,
  updateRole,
  getAllUsers,
  banUser,
  unbanUser,
  getAccountAge
}
