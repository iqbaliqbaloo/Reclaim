

const pool = require('../db')


const createConversation = async ({ listingId, lostUserId, foundUserId, claimId }) => {
  console.log('[chat.model] createConversation called')
  console.log('[chat.model] data:', { listingId, lostUserId, foundUserId, claimId })

  const sql = `
    INSERT INTO conversations (listing_id, lost_user_id, found_user_id, claim_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `

  const result = await pool.query(sql, [listingId, lostUserId, foundUserId, claimId])
  console.log('[chat.model] conversation created:', result.rows[0])
  return result.rows[0]
}

// ─── Find conversation ────────────────────────────────────────────────────────

const findConversationById = async (id) => {
  const result = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [id])
  return result.rows[0] || null
}

const findConversationByUsers = async (listingId, userId1, userId2) => {
  console.log('[chat.model] findConversationByUsers:', { listingId, userId1, userId2 })

  const sql = `
    SELECT * FROM conversations
    WHERE listing_id = $1
    AND (
      (lost_user_id = $2 AND found_user_id = $3) OR
      (lost_user_id = $3 AND found_user_id = $2)
    )
    AND status = 'active'
  `

  const result = await pool.query(sql, [listingId, userId1, userId2])
  return result.rows[0] || null
}

// ─── Get conversations for user ───────────────────────────────────────────────

const getConversationsForUser = async (userId) => {
  console.log('[chat.model] getConversationsForUser:', userId)

  const sql = `
    SELECT * FROM conversations
    WHERE lost_user_id = $1 OR found_user_id = $1
    ORDER BY updated_at DESC
  `

  const result = await pool.query(sql, [userId])
  console.log('[chat.model] conversations found:', result.rows.length)
  return result.rows
}

// ─── Save message ─────────────────────────────────────────────────────────────

/*
  saveMessage(data)

  DATA RECEIVED:
  {
    conversationId: 1
    senderId:       "64f1a3..."
    body:           "Hello, can we arrange the return?"
  }

  BEFORE SAVING:
  Check message count for sender <= 30
  Increment sender message count
*/
const saveMessage = async ({ conversationId, senderId, body }) => {
  console.log('[chat.model] saveMessage called')
  console.log('[chat.model] conversationId:', conversationId, 'senderId:', senderId)
  console.log('[chat.model] body length:', body.length)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // get conversation
    const convResult = await client.query(
      `SELECT * FROM conversations WHERE id = $1 AND status = 'active'`,
      [conversationId]
    )

    const conv = convResult.rows[0]
    if (!conv) throw Object.assign(new Error('Conversation not found or closed'), { statusCode: 404 })

    // verify sender is participant
    if (conv.lost_user_id !== senderId && conv.found_user_id !== senderId) {
      throw Object.assign(new Error('You are not a participant in this conversation'), { statusCode: 403 })
    }

    // check message count for this sender
    const isLostUser  = conv.lost_user_id  === senderId
    const msgCount    = isLostUser ? conv.lost_msg_count : conv.found_msg_count
    const countColumn = isLostUser ? 'lost_msg_count' : 'found_msg_count'

    console.log('[chat.model] sender message count:', msgCount)

    if (msgCount >= 30) {
      throw Object.assign(
        new Error('You have reached the message limit (30) for this conversation'),
        { statusCode: 429 }
      )
    }

    // save message
    const msgResult = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, senderId, body]
    )

    // increment message count
    await client.query(
      `UPDATE conversations
       SET ${countColumn} = ${countColumn} + 1, updated_at = NOW()
       WHERE id = $1`,
      [conversationId]
    )

    await client.query('COMMIT')

    const message = msgResult.rows[0]
    const remaining = 30 - (msgCount + 1)
    console.log('[chat.model] message saved:', message.id, 'remaining:', remaining)

    return { message, remaining }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ─── Get messages ─────────────────────────────────────────────────────────────

const getMessages = async (conversationId, userId) => {
  console.log('[chat.model] getMessages:', conversationId)

  // verify participant
  const conv = await findConversationById(conversationId)
  if (!conv) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 })
  if (conv.lost_user_id !== userId && conv.found_user_id !== userId) {
    throw Object.assign(new Error('Not a participant'), { statusCode: 403 })
  }

  const result = await pool.query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  )

  console.log('[chat.model] messages found:', result.rows.length)
  return { conversation: conv, messages: result.rows }
}

// ─── Mark messages read ───────────────────────────────────────────────────────

const markMessagesRead = async (conversationId, userId) => {
  console.log('[chat.model] markMessagesRead:', conversationId, userId)

  await pool.query(
    `UPDATE messages
     SET read_at = NOW()
     WHERE conversation_id = $1
     AND sender_id != $2
     AND read_at IS NULL`,
    [conversationId, userId]
  )
}

// ─── Confirm return ───────────────────────────────────────────────────────────

/*
  confirmReturn(conversationId, userId)

  CALLED BY: either user confirming item was returned
  Sets lost_confirmed or found_confirmed to true
  Checks if both confirmed → updates resolution_status
*/
const confirmReturn = async (conversationId, userId) => {
  console.log('[chat.model] confirmReturn:', conversationId, userId)

  const conv = await findConversationById(conversationId)
  if (!conv) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 })

  const isLostUser  = conv.lost_user_id  === userId
  const isFoundUser = conv.found_user_id === userId

  if (!isLostUser && !isFoundUser) {
    throw Object.assign(new Error('Not a participant'), { statusCode: 403 })
  }

  const column = isLostUser ? 'lost_confirmed' : 'found_confirmed'

  // set confirmation
  await pool.query(
    `UPDATE conversations SET ${column} = true, updated_at = NOW() WHERE id = $1`,
    [conversationId]
  )

  // refetch to check both sides
  const updated = await findConversationById(conversationId)
  console.log('[chat.model] confirmations:', {
    lost_confirmed:  updated.lost_confirmed,
    found_confirmed: updated.found_confirmed
  })

  // if both confirmed → mark both_confirmed
  if (updated.lost_confirmed && updated.found_confirmed) {
    await pool.query(
      `UPDATE conversations
       SET resolution_status = 'both_confirmed', status = 'closed', updated_at = NOW()
       WHERE id = $1`,
      [conversationId]
    )
    console.log('[chat.model] both confirmed — conversation closed')
    return { ...updated, resolution_status: 'both_confirmed', bothConfirmed: true }
  }

  return { ...updated, bothConfirmed: false }
}

// ─── Dispute resolution ───────────────────────────────────────────────────────

const disputeResolution = async (conversationId, userId) => {
  console.log('[chat.model] disputeResolution:', conversationId, userId)

  const conv = await findConversationById(conversationId)
  if (!conv) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 })

  if (conv.lost_user_id !== userId && conv.found_user_id !== userId) {
    throw Object.assign(new Error('Not a participant'), { statusCode: 403 })
  }

  await pool.query(
    `UPDATE conversations SET resolution_status = 'disputed', updated_at = NOW() WHERE id = $1`,
    [conversationId]
  )

  console.log('[chat.model] resolution disputed')
  return await findConversationById(conversationId)
}

// ─── Get conversations needing auto-confirm (7 day silence) ──────────────────

const getConversationsNeedingAutoConfirm = async () => {
  /*
    One side confirmed, other silent for 7 days
    Auto-confirm the silent side
  */
  const sql = `
    SELECT * FROM conversations
    WHERE resolution_status = 'pending'
    AND status = 'active'
    AND (
      (lost_confirmed = true AND found_confirmed IS NULL AND updated_at < NOW() - INTERVAL '7 days') OR
      (found_confirmed = true AND lost_confirmed IS NULL AND updated_at < NOW() - INTERVAL '7 days')
    )
  `
  const result = await pool.query(sql)
  console.log('[chat.model] conversations needing auto-confirm:', result.rows.length)
  return result.rows
}

// ─── Get conversations both silent 7 days ────────────────────────────────────

const getConversationsBothSilent = async () => {
  const sql = `
    SELECT * FROM conversations
    WHERE resolution_status = 'pending'
    AND status = 'active'
    AND lost_confirmed IS NULL
    AND found_confirmed IS NULL
    AND updated_at < NOW() - INTERVAL '7 days'
  `
  const result = await pool.query(sql)
  console.log('[chat.model] both silent conversations:', result.rows.length)
  return result.rows
}

// ─── Update resolution status ─────────────────────────────────────────────────

const updateResolutionStatus = async (conversationId, status) => {
  await pool.query(
    `UPDATE conversations
     SET resolution_status = $1, status = 'closed', updated_at = NOW()
     WHERE id = $2`,
    [status, conversationId]
  )
  console.log('[chat.model] resolution updated:', conversationId, status)
}

module.exports = {
  createConversation,
  findConversationById,
  findConversationByUsers,
  getConversationsForUser,
  saveMessage,
  getMessages,
  markMessagesRead,
  confirmReturn,
  disputeResolution,
  getConversationsNeedingAutoConfirm,
  getConversationsBothSilent,
  updateResolutionStatus
}