const userModel = require('../models/user.model')

const createProfile = async(data)=>{
    console.log('[user.service] createProfile called')
  console.log('[user.service] data received:', data)

  const {authId,email,role} = data
  if(!authId ||!email){
     const err = new Error('authId and email are required')
    err.statusCode = 400
    throw err
  }
  const user = await userModel.createProfile({authId,email,role:role||'visitor'})
  console.log('[user.service] profile created:', user)
  return user
}

const getMyProfile = async (authId) => {
  console.log('[user.service] getMyProfile called for:', authId)

  const user = await userModel.findByAuthId(authId)

  if (!user) {
    const err = new Error('User profile not found')
    err.statusCode = 404
    throw err
  }

  console.log('[user.service] profile found:', user)
  return user
}

const getPublicProfile = async (id) => {
  console.log('[user.service] getPublicProfile called for id:', id)

  const user = await userModel.findById(id)

  if (!user) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  // return only public fields
  const publicProfile = {
    id:         user.id,
    name:       user.name,
    avatar_url: user.avatar_url,
    role:       user.role,
    reputation: user.reputation,
    created_at: user.created_at
  }

  console.log('[user.service] public profile:', publicProfile)
  return publicProfile
}

const updateProfile = async (authId, data) => {
  console.log('[user.service] updateProfile called')
  console.log('[user.service] authId:', authId)
  console.log('[user.service] update data:', data)

  // make sure user exists first
  const existing = await userModel.findByAuthId(authId)
  if (!existing) {
    const err = new Error('User profile not found')
    err.statusCode = 404
    throw err
  }

  const updated = await userModel.updateProfile(authId, data)
  console.log('[user.service] profile updated:', updated)
  return updated
}

const checkCanPost = async (authId) => {
  console.log('[user.service] checkCanPost called for:', authId)

  const result = await userModel.checkCanPost(authId)
  console.log('[user.service] checkCanPost result:', result)
  return result
}

const incrementPostCount = async (authId) => {
  console.log('[user.service] incrementPostCount called for:', authId)

  const result = await userModel.incrementPostCount(authId)
  console.log('[user.service] post count incremented:', result)
  return result
}

const incrementReputation = async (authId) => {
  console.log('[user.service] incrementReputation called for:', authId)

  const result = await userModel.incrementReputation(authId)
  console.log('[user.service] reputation incremented:', result)
  return result
}

const updateRole = async (authId, role) => {
  console.log('[user.service] updateRole called')
  console.log('[user.service] authId:', authId, 'role:', role)

  const validRoles = ['visitor', 'user', 'admin']
  if (!validRoles.includes(role)) {
    const err = new Error(`Invalid role: ${role}`)
    err.statusCode = 400
    throw err
  }

  const result = await userModel.updateRole(authId, role)
  console.log('[user.service] role updated:', result)
  return result
}


const getAllUsers = async () => {
  console.log('[user.service] getAllUsers called')

  const users = await userModel.findAll()
  console.log('[user.service] total users found:', users.length)
  return users
}

const banUser = async (id, reason) => {
  console.log('[user.service] banUser called')
  console.log('[user.service] id:', id, 'reason:', reason)

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

  const result = await userModel.banUser(id, reason)
  console.log('[user.service] user banned:', result)
  return result
}

const unbanUser = async (id) => {
  console.log('[user.service] unbanUser called for id:', id)

  const existing = await userModel.findById(id)
  if (!existing) {
    const err = new Error('User not found')
    err.statusCode = 404
    throw err
  }

  const result = await userModel.unbanUser(id)
  console.log('[user.service] user unbanned:', result)
  return result
}
module.exports ={
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