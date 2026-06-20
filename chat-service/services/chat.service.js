/*
  ============================================================
  CHAT SERVICE — WebSocket + REST messaging
  ============================================================
*/

const axios    = require('axios')
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

// ─── Create conversation ──────────────────────────────────────────────────────

const createConversation = async (data) => {
  console.log('[chat.service] createConversation called')
  console.log('[chat.service] data:', data)

  const conv = await chatModel.createConversation(data)
  console.log('[chat.service] conversation created:', conv.id)
  return conv
}

// ─── Get conversations for user ───────────────────────────────────────────────

const getMyConversations = async (userId) => {
  console.log('[chat.service] getMyConversations for:', userId)
  return await chatModel.getConversationsForUser(userId)
}

// ─── Get messages ─────────────────────────────────────────────────────────────

const getMessages = async (conversationId, userId) => {
  console.log('[chat.service] getMessages:', conversationId)
  const result = await chatModel.getMessages(conversationId, userId)
  await chatModel.markMessagesRead(conversationId, userId)
  return result
}

// ─── Send message ─────────────────────────────────────────────────────────────

/*
  sendMessage(conversationId, senderId, body)

  Saves message to DB
  Notifies other participant via notification-service
  Returns message + remaining count
*/
const sendMessage = async (conversationId, senderId, body, token) => {
  console.log('[chat.service] sendMessage called')
  console.log('[chat.service] conversationId:', conversationId, 'senderId:', senderId)
  console.log('[chat.service] body length:', body.length)

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

  console.log('[chat.service] message saved:', message.id, 'remaining:', remaining)

  // notify other participant (fire and forget)
  const conv = await chatModel.findConversationById(conversationId)
  const recipientId = conv.lost_user_id === senderId ? conv.found_user_id : conv.lost_user_id

  callService(
    'post',
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications/new-message`,
    {
      conversationId,
      messageId:   message.id,
      senderId,
      recipientId,
      body:        body.substring(0, 100)  // preview only
    },
    token
  )

  return { message, remaining }
}

// ─── Confirm return ───────────────────────────────────────────────────────────

/*
  confirmReturn(conversationId, userId, token)

  User confirms the item was returned
  If both confirm → call resolution-service to update reputation
*/
const confirmReturn = async (conversationId, userId, token) => {
  console.log('[chat.service] confirmReturn:', conversationId, userId)

  const result = await chatModel.confirmReturn(conversationId, userId)

  if (result.bothConfirmed) {
    console.log('[chat.service] both confirmed — calling resolution-service')

    // call resolution-service to increment reputation for both
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

// ─── Dispute ──────────────────────────────────────────────────────────────────

const disputeResolution = async (conversationId, userId) => {
  console.log('[chat.service] dispute:', conversationId)
  return await chatModel.disputeResolution(conversationId, userId)
}

// ─── Background job — auto-confirm ───────────────────────────────────────────

/*
  processAutoConfirm()

  Runs every hour
  Handles 7-day silence cases
*/
const processAutoConfirm = async () => {
  console.log('[chat.service] processAutoConfirm running...')

  // one side confirmed, other silent 7 days
  const needsAutoConfirm = await chatModel.getConversationsNeedingAutoConfirm()
  for (const conv of needsAutoConfirm) {
    console.log('[chat.service] auto-confirming conversation:', conv.id)
    await chatModel.updateResolutionStatus(conv.id, 'both_confirmed')

    // call resolution-service
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

  // both silent 7 days → unresolved
  const bothSilent = await chatModel.getConversationsBothSilent()
  for (const conv of bothSilent) {
    console.log('[chat.service] marking unresolved:', conv.id)
    await chatModel.updateResolutionStatus(conv.id, 'unresolved')
  }

  console.log('[chat.service] processAutoConfirm complete')
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