
const userService = require('../services/user.service')

const createProfile = async (req, res) => {
  try {
    console.log('[user.controller] createProfile called')
    console.log('[user.controller] req.body received:', req.body)

    const result = await userService.createProfile(req.body)

    console.log('[user.controller] sending createProfile response:', result)
    return res.status(201).json({
      success: true,
      data:    result,
      message: 'Profile created successfully'
    })
  } catch (err) {
    console.error('[user.controller] createProfile error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const getMyProfile = async (req, res) => {
  try {
    console.log('[user.controller] getMyProfile called')
    console.log('[user.controller] req.user:', req.user)

    const result = await userService.getMyProfile(req.user._id)

    console.log('[user.controller] sending getMyProfile response')
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Profile retrieved'
    })
  } catch (err) {
    console.error('[user.controller] getMyProfile error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}


const getPublicProfile = async (req, res) => {
  try {
    console.log('[user.controller] getPublicProfile called')
    console.log('[user.controller] req.params.id:', req.params.id)

    const result = await userService.getPublicProfile(req.params.id)

    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Profile retrieved'
    })
  } catch (err) {
    console.error('[user.controller] getPublicProfile error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const updateProfile = async (req, res) => {
  try {
    console.log('[user.controller] updateProfile called')
    console.log('[user.controller] req.user:', req.user)
    console.log('[user.controller] req.body received:', req.body)

    const result = await userService.updateProfile(req.user._id, req.body)

    console.log('[user.controller] sending updateProfile response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Profile updated successfully'
    })
  } catch (err) {
    console.error('[user.controller] updateProfile error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const checkCanPost = async (req, res) => {
  try {
    console.log('[user.controller] checkCanPost called')
    console.log('[user.controller] req.user:', req.user)

    const result = await userService.checkCanPost(req.user._id)

    console.log('[user.controller] sending checkCanPost response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Post limit checked'
    })
  } catch (err) {
    console.error('[user.controller] checkCanPost error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const incrementPostCount = async (req, res) => {
  try {
    console.log('[user.controller] incrementPostCount called')
    console.log('[user.controller] req.user:', req.user)

    const result = await userService.incrementPostCount(req.user._id)

    console.log('[user.controller] sending incrementPostCount response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Post count incremented'
    })
  } catch (err) {
    console.error('[user.controller] incrementPostCount error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const incrementReputation = async (req, res) => {
  try {
    console.log('[user.controller] incrementReputation called')
    console.log('[user.controller] req.body:', req.body)

    const { authId } = req.body

    if (!authId) {
      return res.status(400).json({
        success: false,
        error:   'authId is required'
      })
    }

    const result = await userService.incrementReputation(authId)

    console.log('[user.controller] sending incrementReputation response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Reputation incremented'
    })
  } catch (err) {
    console.error('[user.controller] incrementReputation error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const updateRole = async (req, res) => {
  try {
    console.log('[user.controller] updateRole called')
    console.log('[user.controller] req.body:', req.body)

    const { authId, role } = req.body

    if (!authId || !role) {
      return res.status(400).json({
        success: false,
        error:   'authId and role are required'
      })
    }

    const result = await userService.updateRole(authId, role)

    console.log('[user.controller] sending updateRole response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'Role updated successfully'
    })
  } catch (err) {
    console.error('[user.controller] updateRole error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const getAllUsers = async (req, res) => {
  try {
    console.log('[user.controller] getAllUsers called')
    console.log('[user.controller] called by admin:', req.user)

    const result = await userService.getAllUsers()

    console.log('[user.controller] total users:', result.length)
    return res.status(200).json({
      success: true,
      data:    result,
      message: `${result.length} users retrieved`
    })
  } catch (err) {
    console.error('[user.controller] getAllUsers error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const banUser = async (req, res) => {
  try {
    console.log('[user.controller] banUser called')
    console.log('[user.controller] req.params.id:', req.params.id)
    console.log('[user.controller] req.body:', req.body)

    const result = await userService.banUser(req.params.id, req.body.reason)

    console.log('[user.controller] sending banUser response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'User banned successfully'
    })
  } catch (err) {
    console.error('[user.controller] banUser error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const unbanUser = async (req, res) => {
  try {
    console.log('[user.controller] unbanUser called')
    console.log('[user.controller] req.params.id:', req.params.id)

    const result = await userService.unbanUser(req.params.id)

    console.log('[user.controller] sending unbanUser response:', result)
    return res.status(200).json({
      success: true,
      data:    result,
      message: 'User unbanned successfully'
    })
  } catch (err) {
    console.error('[user.controller] unbanUser error:', err.message)
    return res.status(err.statusCode || 500).json({
      success: false,
      error:   err.message
    })
  }
}

const getAccountAge = async (req, res) => {
  try {
    const user = await userModel.findByAuthId(req.params.authId)
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })

    const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000*60*60*24))
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