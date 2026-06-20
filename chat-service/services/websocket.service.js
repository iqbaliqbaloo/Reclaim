/*
  ============================================================
  WEBSOCKET SERVICE

  Real-time messaging using ws library
  Clients connect with JWT token
  Messages broadcast to conversation participants only

  CONNECTION:
  ws://localhost:4007?token=eyJhbG...

  CLIENT SENDS:
  { type: 'join', conversationId: 1 }
  { type: 'message', conversationId: 1, body: 'Hello!' }
  { type: 'typing', conversationId: 1 }

  SERVER SENDS:
  { type: 'message', data: { id, sender_id, body, created_at, remaining } }
  { type: 'typing',  data: { senderId, conversationId } }
  { type: 'read',    data: { conversationId } }
  { type: 'error',   data: { message } }
  ============================================================
*/

const WebSocket = require('ws')
const jwt       = require('jsonwebtoken')
const chatService = require('./chat.service')

/*
  clients Map
  KEY:   userId (string)
  VALUE: WebSocket connection

  Allows broadcasting to specific users
*/
const clients = new Map()

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server })

  console.log('[ws] WebSocket server started')

  wss.on('connection', (ws, req) => {
    console.log('[ws] new connection attempt')

    // extract token from URL query param
    // URL: ws://localhost:4007?token=eyJhbG...
    const url   = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      console.log('[ws] no token — closing connection')
      ws.send(JSON.stringify({ type: 'error', data: { message: 'No token provided' } }))
      ws.close()
      return
    }

    // verify JWT
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
      console.log('[ws] connection authenticated, userId:', decoded.userId)
    } catch {
      console.log('[ws] invalid token — closing connection')
      ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid token' } }))
      ws.close()
      return
    }

    const userId = decoded.userId
    clients.set(userId, ws)
    console.log('[ws] client connected:', userId, 'total clients:', clients.size)

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw)
        console.log('[ws] message received from', userId, ':', msg.type)

        if (msg.type === 'message') {
          /*
            Client sends: { type: 'message', conversationId: 1, body: 'Hello' }
            Save to DB via chat.service
            Broadcast to other participant
          */
          const { message, remaining } = await chatService.sendMessage(
            msg.conversationId,
            userId,
            msg.body
          )

          // send confirmation to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            data: { message, remaining }
          }))

          // broadcast to other participant in conversation
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
            console.log('[ws] message delivered to:', recipientId)
          } else {
            console.log('[ws] recipient offline — message saved to DB only')
          }
        }

        if (msg.type === 'typing') {
          // broadcast typing indicator to other participant
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
        ws.send(JSON.stringify({
          type:  'error',
          data:  { message: err.message }
        }))
      }
    })

    ws.on('close', () => {
      clients.delete(userId)
      console.log('[ws] client disconnected:', userId, 'remaining:', clients.size)
    })

    ws.on('error', (err) => {
      console.error('[ws] socket error for', userId, ':', err.message)
      clients.delete(userId)
    })

    // send welcome
    ws.send(JSON.stringify({ type: 'connected', data: { userId } }))
  })

  return wss
}

module.exports = { setupWebSocket, clients }