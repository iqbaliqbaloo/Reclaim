const pool = require('../db')

const createConversation = async ({ listingId, lostUserId, foundUserId, claimId }) => {
  const sql = `
    INSERT INTO conversations (listing_id, lost_user_id, found_user_id, claim_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `
  const result = await pool.query(sql, [listingId, lostUserId, foundUserId, claimId])
  return result.rows[0]
}

const findConversationById = async (id) => {
  const result = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [id])
  return result.rows[0] || null
}

const findConversationByUsers = async (listingId, userId1, userId2) => {
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

const getConversationsForUser = async (userId) => {
  const sql = `
    SELECT * FROM conversations
    WHERE lost_user_id = $1 OR found_user_id = $1
    ORDER BY updated_at DESC
  `
  const result = await pool.query(sql, [userId])
  return result.rows
}

const saveMessage = async ({ conversationId, senderId, body }) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const convResult = await client.query(
      `SELECT * FROM conversations WHERE id = $1 AND status = 'active'`,
      [conversationId]
    )

    const conv = convResult.rows[0]
    if (!conv) throw Object.assign(new Error('Conversation not found or closed'), { statusCode: 404 })

    if (conv.lost_user_id !== senderId && conv.found_user_id !== senderId) {
      throw Object.assign(new Error('You are not a participant in this conversation'), { statusCode: 403 })
    }

    const isLostUser  = conv.lost_user_id  === senderId
    const msgCount    = isLostUser ? conv.lost_msg_count : conv.found_msg_count
    const countColumn = isLostUser ? 'lost_msg_count' : 'found_msg_count'

    if (msgCount >= 30) {
      throw Object.assign(
        new Error('You have reached the message limit (30) for this conversation'),
        { statusCode: 429 }
      )
    }

    const msgResult = await client.query(
      `INSERT INTO messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [conversationId, senderId, body]
    )

    await client.query(
      `UPDATE conversations SET ${countColumn} = ${countColumn} + 1, updated_at = NOW() WHERE id = $1`,
      [conversationId]
    )

    await client.query('COMMIT')

    const message   = msgResult.rows[0]
    const remaining = 30 - (msgCount + 1)
    return { message, remaining }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const getMessages = async (conversationId, userId) => {
  const conv = await findConversationById(conversationId)
  if (!conv) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 })
  if (conv.lost_user_id !== userId && conv.found_user_id !== userId) {
    throw Object.assign(new Error('Not a participant'), { statusCode: 403 })
  }

  const result = await pool.query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  )

  return { conversation: conv, messages: result.rows }
}

const markMessagesRead = async (conversationId, userId) => {
  await pool.query(
    `UPDATE messages
     SET read_at = NOW()
     WHERE conversation_id = $1
     AND sender_id != $2
     AND read_at IS NULL`,
    [conversationId, userId]
  )
}

const confirmReturn = async (conversationId, userId) => {
  const conv = await findConversationById(conversationId)
  if (!conv) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 })

  const isLostUser  = conv.lost_user_id  === userId
  const isFoundUser = conv.found_user_id === userId

  if (!isLostUser && !isFoundUser) {
    throw Object.assign(new Error('Not a participant'), { statusCode: 403 })
  }

  const column = isLostUser ? 'lost_confirmed' : 'found_confirmed'

  await pool.query(
    `UPDATE conversations SET ${column} = true, updated_at = NOW() WHERE id = $1`,
    [conversationId]
  )

  const updated = await findConversationById(conversationId)

  if (updated.lost_confirmed && updated.found_confirmed) {
    await pool.query(
      `UPDATE conversations
       SET resolution_status = 'both_confirmed', status = 'closed', updated_at = NOW()
       WHERE id = $1`,
      [conversationId]
    )
    return { ...updated, resolution_status: 'both_confirmed', bothConfirmed: true }
  }

  return { ...updated, bothConfirmed: false }
}

const disputeResolution = async (conversationId, userId) => {
  const conv = await findConversationById(conversationId)
  if (!conv) throw Object.assign(new Error('Conversation not found'), { statusCode: 404 })

  if (conv.lost_user_id !== userId && conv.found_user_id !== userId) {
    throw Object.assign(new Error('Not a participant'), { statusCode: 403 })
  }

  await pool.query(
    `UPDATE conversations SET resolution_status = 'disputed', updated_at = NOW() WHERE id = $1`,
    [conversationId]
  )

  return await findConversationById(conversationId)
}

const getConversationsNeedingAutoConfirm = async () => {
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
  return result.rows
}

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
  return result.rows
}

const updateResolutionStatus = async (conversationId, status) => {
  await pool.query(
    `UPDATE conversations
     SET resolution_status = $1, status = 'closed', updated_at = NOW()
     WHERE id = $2`,
    [status, conversationId]
  )
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
