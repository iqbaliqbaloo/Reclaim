const pool       = require('../db')
const nodemailer = require('nodemailer')
const axios      = require('axios')

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
})

const getUserEmail = async (userId) => {
  try {
    const res = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/api/auth/user-email/${userId}`,
      { timeout: 3000 }
    )
    return res.data.data?.email
  } catch {
    return null
  }
}

const createInApp = async (userId, type, title, body, data = {}) => {
  const sql = `
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `
  const result = await pool.query(sql, [userId, type, title, body, JSON.stringify(data)])
  return result.rows[0]
}

const queueEmail = async (toEmail, subject, html) => {
  await pool.query(
    `INSERT INTO email_queue (to_email, subject, html) VALUES ($1, $2, $3)`,
    [toEmail, subject, html]
  )
}

const processEmailQueue = async () => {
  const result = await pool.query(
    `SELECT * FROM email_queue WHERE sent = false AND attempts < 3 LIMIT 50`
  )

  for (const email of result.rows) {
    try {
      if (process.env.SENDGRID_API_KEY) {
        await transporter.sendMail({
          from:    process.env.EMAIL_FROM || 'noreply@reclaim.com',
          to:      email.to_email,
          subject: email.subject,
          html:    email.html
        })
      }

      await pool.query(
        `UPDATE email_queue SET sent = true, sent_at = NOW() WHERE id = $1`,
        [email.id]
      )
    } catch (err) {
      console.error('[notification.service] email failed:', email.id, err.message)
      await pool.query(
        `UPDATE email_queue SET attempts = attempts + 1 WHERE id = $1`,
        [email.id]
      )
    }
  }
}

const getNotificationsForUser = async (userId) => {
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  )
  return result.rows
}

const markRead = async (userId, notificationId) => {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  )
}

const markAllRead = async (userId) => {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1`,
    [userId]
  )
}

const handleNewMatch = async ({ lostUserId, foundUserId, matchId, lostListingId, foundListingId, score }) => {
  const scorePercent = Math.round(score * 100)

  await createInApp(lostUserId, 'new_match',
    'Match found!',
    `A ${scorePercent}% match was found for your lost listing.`,
    { matchId, listingId: lostListingId }
  )

  await createInApp(foundUserId, 'new_match',
    'Match found!',
    `A ${scorePercent}% match was found for your found listing.`,
    { matchId, listingId: foundListingId }
  )

  const lostEmail  = await getUserEmail(lostUserId)
  const foundEmail = await getUserEmail(foundUserId)

  if (lostEmail) {
    await queueEmail(lostEmail, 'Reclaim — Match found for your listing!',
      `<h2>Match found!</h2><p>A ${scorePercent}% match was found for your lost listing. <a href="${process.env.FRONTEND_URL}/dashboard">View matches</a></p>`
    )
  }

  if (foundEmail) {
    await queueEmail(foundEmail, 'Reclaim — Match found for your listing!',
      `<h2>Match found!</h2><p>A ${scorePercent}% match was found for your found listing. <a href="${process.env.FRONTEND_URL}/dashboard">View matches</a></p>`
    )
  }
}

const handleClaimReceived = async ({ claimId, listingId, listingUserId, claimantId, expiresAt }) => {
  await createInApp(listingUserId, 'claim_received',
    'New claim on your listing',
    'Someone has claimed your found item. Review and approve or reject within 72 hours.',
    { claimId, listingId }
  )

  const email = await getUserEmail(listingUserId)
  if (email) {
    await queueEmail(email, 'Reclaim — Someone claimed your found item',
      `<h2>New claim received</h2><p>Someone has submitted a claim on your found listing. You have 72 hours to respond. <a href="${process.env.FRONTEND_URL}/claims/listing/${listingId}">Review claim</a></p>`
    )
  }
}

const handleClaimApproved = async ({ claimId, claimantId, listingId, conversationId }) => {
  await createInApp(claimantId, 'claim_approved',
    'Your claim was approved!',
    'The listing owner approved your claim. Chat is now open.',
    { claimId, listingId, conversationId }
  )

  const email = await getUserEmail(claimantId)
  if (email) {
    await queueEmail(email, 'Reclaim — Your claim was approved!',
      `<h2>Claim approved!</h2><p>Your claim was approved. You can now chat with the finder. <a href="${process.env.FRONTEND_URL}/chat/${conversationId}">Open chat</a></p>`
    )
  }
}

const handleClaimRejected = async ({ claimId, claimantId, listingId }) => {
  await createInApp(claimantId, 'claim_rejected',
    'Your claim was rejected',
    'The listing owner rejected your claim. You can browse other matches.',
    { claimId, listingId }
  )

  const email = await getUserEmail(claimantId)
  if (email) {
    await queueEmail(email, 'Reclaim — Claim rejected',
      `<h2>Claim rejected</h2><p>Your claim was rejected. <a href="${process.env.FRONTEND_URL}/listings">Browse other listings</a></p>`
    )
  }
}

const handleClaimExpired = async ({ claimId, claimantId, listingUserId, listingId }) => {
  await createInApp(claimantId, 'claim_expired',
    'Claim expired',
    'The listing owner did not respond in time. Your claim has expired.',
    { claimId, listingId }
  )

  await createInApp(listingUserId, 'claim_missed',
    'You missed a claim',
    'A claim expired because you did not respond. Please respond to claims within 72 hours.',
    { claimId, listingId }
  )
}

const handleClaimReminder1 = async ({ claimId, listingUserId, claimantId, listingId, expiresAt }) => {
  await createInApp(listingUserId, 'claim_reminder',
    'Claim reminder — 48 hours left',
    'You have a pending claim. You have 48 hours to respond.',
    { claimId, listingId }
  )

  await createInApp(claimantId, 'claim_update',
    'Still waiting',
    'The owner has been reminded about your claim.',
    { claimId, listingId }
  )

  const ownerEmail = await getUserEmail(listingUserId)
  if (ownerEmail) {
    await queueEmail(ownerEmail, 'Reclaim — Claim reminder (48 hours left)',
      `<h2>Claim reminder</h2><p>You have a pending claim that expires in 48 hours. <a href="${process.env.FRONTEND_URL}/claims/listing/${listingId}">Review now</a></p>`
    )
  }
}

const handleClaimReminder2 = async ({ claimId, listingUserId, claimantId, listingId }) => {
  await createInApp(listingUserId, 'claim_final_warning',
    'Final warning — 24 hours left',
    'Last chance to respond to a claim. It expires in 24 hours.',
    { claimId, listingId }
  )

  const ownerEmail = await getUserEmail(listingUserId)
  if (ownerEmail) {
    await queueEmail(ownerEmail, 'Reclaim — Final warning (24 hours left)',
      `<h2>Final warning</h2><p>A claim expires in 24 hours. <a href="${process.env.FRONTEND_URL}/claims/listing/${listingId}">Respond now</a></p>`
    )
  }
}

const handleNewMessage = async ({ conversationId, senderId, recipientId, body }) => {
  await createInApp(recipientId, 'new_message',
    'New message',
    body.substring(0, 100),
    { conversationId, senderId }
  )
}

const handleClaimsRejectedBulk = async ({ claimIds, listingId }) => {
  // individual notifications sent per rejected claim — bulk handler is a no-op
}

module.exports = {
  createInApp,
  queueEmail,
  processEmailQueue,
  getNotificationsForUser,
  markRead,
  markAllRead,
  handleNewMatch,
  handleClaimReceived,
  handleClaimApproved,
  handleClaimRejected,
  handleClaimExpired,
  handleClaimReminder1,
  handleClaimReminder2,
  handleNewMessage,
  handleClaimsRejectedBulk
}
