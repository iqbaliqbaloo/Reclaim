const WebSocket   = require('ws')
const jwt         = require('jsonwebtoken')
const chatService = require('./chat.service')

const clients = new Map()

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server })

  wss.on('connection', (ws, req) => {
    const url   = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'No token provided' } }))
      ws.close()
      return
    }

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid token' } }))
      ws.close()
      return
    }

    const userId = decoded.id
    clients.set(userId, ws)

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw)

        if (msg.type === 'message') {
          const { message, remaining } = await chatService.sendMessage(
            msg.conversationId,
            userId,
            msg.body
          )

          ws.send(JSON.stringify({ type: 'message_sent', data: { message, remaining } }))

          const { conversation } = await chatService.getMessages(msg.conversationId, userId)
          const recipientId = conversation.lost_user_id === userId
            ? conversation.found_user_id
            : conversation.lost_user_id

          const recipientWs = clients.get(recipientId)
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'new_message',
              data: { message, conversationId: msg.conversationId }
            }))
          }
        }

        if (msg.type === 'typing') {
          const { conversation } = await chatService.getMessages(msg.conversationId, userId)
          const recipientId = conversation.lost_user_id === userId
            ? conversation.found_user_id
            : conversation.lost_user_id

          const recipientWs = clients.get(recipientId)
          if (recipientWs?.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'typing',
              data: { senderId: userId, conversationId: msg.conversationId }
            }))
          }
        }

      } catch (err) {
        console.error('[ws] message handling error:', err.message)
        ws.send(JSON.stringify({ type: 'error', data: { message: err.message } }))
      }
    })

    ws.on('close', () => {
      clients.delete(userId)
    })

    ws.on('error', (err) => {
      console.error('[ws] socket error for', userId, ':', err.message)
      clients.delete(userId)
    })

    ws.send(JSON.stringify({ type: 'connected', data: { userId } }))
  })

  return wss
}

module.exports = { setupWebSocket, clients }
