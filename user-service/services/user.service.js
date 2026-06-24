const userModel = require('../models/user.model')

const createProfile = async (data) => {
  const { authId, email, role } = data
  if (!authId || !email) {
    const err = new Error('authId and email are required')
    err.statusCode = 400
    throw err
  }
  return await userModel.createProfile({ authId, email, role: role || 'visitor' })
}

const getMyProfile = async (authId, email, role) => {
  let user = await userModel.findByAuthId(authId)
  if (!user) {
    if (!email) {
      const err = new Error('User profile not found')
      err.statusCode = 404
      throw err
    }
    // Profile missing — auto-create it (user-service was down when the account was registered)
    user = await userModel.createProfile({ authId, email, role: role || 'user' })
  }
  return user
}

const getPublicProfile = async (id) => {
  const user = await userModel.findById(id)
  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }
  return {
    id:         user.id,
    name:       user.name,
    avatar_url: user.avatar_url,
    role:       user.role,
    reputation: user.reputation,
    created_at: user.created_at
  }
}

const updateProfile = async (authId, data) => {
  const existing = await userModel.findByAuthId(authId)
  if (!existing) {
    const err = new Error('User profile not found')
    err.statusCode = 404
    throw err
  }
  return await userModel.updateProfile(authId, data)
}

const checkCanPost = async (authId) => {
  return await userModel.checkCanPost(authId)
}

const incrementPostCount = async (authId) => {
  return await userModel.incrementPostCount(authId)
}

const incrementReputation = async (authId) => {
  if (!authId) {
    const err = new Error('authId is required')
    err.statusCode = 400
    throw err
  }
  return await userModel.incrementReputation(authId)
}

const updateRole = async (authId, role) => {
  const validRoles = ['visitor', 'user', 'admin']
  if (!validRoles.includes(role)) {
    const err = new Error(`Invalid role: ${role}`)
    err.statusCode = 400
    throw err
  }
  return await userModel.updateRole(authId, role)
}

const getAllUsers = async () => {
  return await userModel.findAll()
}

const banUser = async (id, reason) => {
  if (!reason) {
    const err = new Error('Ban reason is required')
    err.statusCode = 400
    throw err
  }
  const existing = await userModel.findById(id)
  if (!existing) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }
  if (existing.role === 'admin') {
    const err = new Error('Cannot ban an admin user')
    err.statusCode = 403
    throw err
  }
  return await userModel.banUser(id, reason)
}

const unbanUser = async (id) => {
  const existing = await userModel.findById(id)
  if (!existing) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }
  return await userModel.unbanUser(id)
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
  unbanUser
}
