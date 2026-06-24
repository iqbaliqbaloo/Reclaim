const chatService    = require('../services/chat.service')
const { clients }    = require('../services/websocket.service')
const WebSocket      = require('ws')

const createConversation = async (req, res) => {
  try {
    const result = await chatService.createConversation(req.body)
    return res.status(201).json({ success: true, data: result, message: 'Conversation opened' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getMyConversations = async (req, res) => {
  try {
    const result = await chatService.getMyConversations(req.user._id)
    return res.status(200).json({ success: true, data: result, message: `${result.length} conversations` })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const getMessages = async (req, res) => {
  try {
    const result = await chatService.getMessages(req.params.id, req.user._id)
    return res.status(200).json({ success: true, data: result, message: 'Messages retrieved' })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const sendMessage = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await chatService.sendMessage(
      req.params.id,
      req.user._id,
      req.body.body,
      token
    )

    // Push live to recipient if they have an open WebSocket connection
    const recipientWs = clients.get(result.recipientId)
    if (recipientWs?.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        type: 'new_message',
        data: { message: result.message, conversationId: Number(req.params.id) }
      }))
    }

    return res.status(201).json({
      success: true,
      data:    { message: result.message, remaining: result.remaining },
      message: `Message sent. ${result.remaining} messages remaining.`
    })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const confirmReturn = async (req, res) => {
  try {
    const token  = req.headers.authorization?.split(' ')[1]
    const result = await chatService.confirmReturn(req.params.id, req.user._id, token)
    return res.status(200).json({
      success: true,
      data:    result,
      message: result.bothConfirmed ? 'Both confirmed — resolved!' : 'Confirmation recorded'
    })
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message })
  }
}

const disputeResolution = async (req, res) => {
  try {
    const result = await chatService.disputeResolution(req.params.id, req.user._id)
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
