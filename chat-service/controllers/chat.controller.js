const chatService = require('../services/chat.service')

/*
  POST /conversations
  Called by claim-service after claim approved
  Opens a new conversation
*/
const createConversation = async (req, res) => {
  try {
    console.log('[chat.controller] createConversation called')
    console.log('[chat.controller] req.body:', req.body)

    const result = await chatService.createConversation(req.body)
    return res.status(201).json({ success: true, data: result, message: 'Conversation opened' })
  } catch (err) {
    console.error('[chat.controller] createConversation error:', err.message)
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

/*
  GET /conversations
  Get all conversations for current user
*/
const getMyConversations = async (req, res) => {
  try {
    console.log('[chat.controller] getMyConversations for:', req.user.userId)
    const result = await chatService.getMyConversations(req.user.userId)
    return res.status(200).json({ success: true, data: result, message: `${result.length} conversations` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

/*
  GET /conversations/:id/messages
  Get messages for a conversation
*/
const getMessages = async (req, res) => {
  try {
    console.log('[chat.controller] getMessages:', req.params.id)
    const result = await chatService.getMessages(req.params.id, req.user.userId)
    return res.status(200).json({ success: true, data: result, message: 'Messages retrieved' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

/*
  POST /conversations/:id/messages
  Send a message

  DATA RECEIVED (req.body):
  { "body": "Hello, can we arrange the return?" }
*/
const sendMessage = async (req, res) => {
  try {
    console.log('[chat.controller] sendMessage:', req.params.id)
    console.log('[chat.controller] req.body:', { bodyLength: req.body.body?.length })

    const token  = req.headers.authorization?.split(' ')[1]
    const result = await chatService.sendMessage(
      req.params.id,
      req.user.userId,
      req.body.body,
      token
    )

    return res.status(201).json({
      success: true,
      data:    result,
      message: `Message sent. ${result.remaining} messages remaining.`
    })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

/*
  PUT /conversations/:id/confirm
  User confirms item was returned
*/
const confirmReturn = async (req, res) => {
  try {
    console.log('[chat.controller] confirmReturn:', req.params.id)

    const token  = req.headers.authorization?.split(' ')[1]
    const result = await chatService.confirmReturn(req.params.id, req.user.userId, token)

    return res.status(200).json({
      success: true,
      data:    result,
      message: result.bothConfirmed ? 'Both confirmed — resolved!' : 'Confirmation recorded'
    })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

/*
  PUT /conversations/:id/dispute
  User disputes the resolution
*/
const disputeResolution = async (req, res) => {
  try {
    console.log('[chat.controller] dispute:', req.params.id)
    const result = await chatService.disputeResolution(req.params.id, req.user.userId)
    return res.status(200).json({ success: true, data: result, message: 'Dispute raised — admin notified' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

module.exports = {
  createConversation,
  getMyConversations,
  getMessages,
  sendMessage,
  confirmReturn,
  disputeResolution
}