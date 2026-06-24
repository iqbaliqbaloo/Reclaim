const axios     = require('axios')
const chatModel = require('../models/chat.model')

const callService = async (method, url, data = {}, token = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await axios({ method, url, data, headers, timeout: 5000 })
    return res.data
  } catch (err) {
    console.error('[chat.service] call failed:', url, err.message)
    return null
  }
}

const createConversation = async (data) => {
  return await chatModel.createConversation(data)
}

const getMyConversations = async (userId) => {
  return await chatModel.getConversationsForUser(userId)
}

const getMessages = async (conversationId, userId) => {
  const result = await chatModel.getMessages(conversationId, userId)
  await chatModel.markMessagesRead(conversationId, userId)
  return result
}

const sendMessage = async (conversationId, senderId, body, token) => {
  if (!body || body.trim().length === 0) {
    throw Object.assign(new Error('Message cannot be empty'), { statusCode: 400 })
  }

  if (body.length > 2000) {
    throw Object.assign(new Error('Message max 2000 characters'), { statusCode: 400 })
  }

  const { message, remaining } = await chatModel.saveMessage({
    conversationId,
    senderId,
    body: body.trim()
  })

  const conv        = await chatModel.findConversationById(conversationId)
  const recipientId = conv.lost_user_id === senderId ? conv.found_user_id : conv.lost_user_id

  callService(
    'post',
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications/new-message`,
    {
      conversationId,
      messageId:   message.id,
      senderId,
      recipientId,
      body:        body.substring(0, 100)
    },
    token
  )

  return { message, remaining, recipientId }
}

const confirmReturn = async (conversationId, userId, token) => {
  const result = await chatModel.confirmReturn(conversationId, userId)

  if (result.bothConfirmed) {
    callService(
      'post',
      `${process.env.RESOLUTION_SERVICE_URL}/resolutions/resolve`,
      {
        conversationId,
        listingId:   result.listing_id,
        lostUserId:  result.lost_user_id,
        foundUserId: result.found_user_id
      },
      token
    )
  }

  return result
}

const disputeResolution = async (conversationId, userId) => {
  return await chatModel.disputeResolution(conversationId, userId)
}

const processAutoConfirm = async () => {
  const needsAutoConfirm = await chatModel.getConversationsNeedingAutoConfirm()
  for (const conv of needsAutoConfirm) {
    await chatModel.updateResolutionStatus(conv.id, 'both_confirmed')
    callService(
      'post',
      `${process.env.RESOLUTION_SERVICE_URL}/resolutions/resolve`,
      {
        conversationId: conv.id,
        listingId:      conv.listing_id,
        lostUserId:     conv.lost_user_id,
        foundUserId:    conv.found_user_id
      }
    )
  }

  const bothSilent = await chatModel.getConversationsBothSilent()
  for (const conv of bothSilent) {
    await chatModel.updateResolutionStatus(conv.id, 'unresolved')
  }
}

module.exports = {
  createConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  confirmReturn,
  disputeResolution,
  processAutoConfirm
}
