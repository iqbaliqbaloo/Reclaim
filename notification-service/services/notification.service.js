
const pool       = require('../db')
const nodemailer = require('nodemailer')
const axios      = require('axios')

// ─── Email transporter ────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY }
})

// ─── Get user email ───────────────────────────────────────────────────────────

/*
  getUserEmail(userId)
  Fetches email from auth-service by userId (auth_id)
  Needed for sending emails — notification-service only stores user_id
*/
const getUserEmail = async (userId) => {
  try {
    const res = await axios.get(
      `${process.env.AUTH_SERVICE_URL}/auth/user-email/${userId}`,
      { timeout: 3000 }
    )
    return res.data.data?.email
  } catch {
    console.error('[notification.service] could not fetch email for:', userId)
    return null
  }
}

// ─── Create in-app notification ───────────────────────────────────────────────

/*
  createInApp(userId, type, title, body, data)

  Stores notification in DB immediately
  Shown in notification bell on frontend
*/
const createInApp = async (userId, type, title, body, data = {}) => {
  console.log('[notification.service] createInApp:', { userId, type, title })

  const sql = `
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `

  const result = await pool.query(sql, [userId, type, title, body, JSON.stringify(data)])
  console.log('[notification.service] in-app notification created:', result.rows[0].id)
  return result.rows[0]
}

// ─── Queue email ──────────────────────────────────────────────────────────────

/*
  queueEmail(toEmail, subject, html)
  Adds email to queue table
  Background job sends max 50/min
*/
const queueEmail = async (toEmail, subject, html) => {
  console.log('[notification.service] queuing email to:', toEmail, 'subject:', subject)

  await pool.query(
    `INSERT INTO email_queue (to_email, subject, html) VALUES ($1, $2, $3)`,
    [toEmail, subject, html]
  )
}

// ─── Process email queue ──────────────────────────────────────────────────────

/*
  processEmailQueue()
  Called by background job every minute
  Sends max 50 emails per run
*/
const processEmailQueue = async () => {
  console.log('[notification.service] processEmailQueue running...')

  const result = await pool.query(
    `SELECT * FROM email_queue WHERE sent = false AND attempts < 3 LIMIT 50`
  )

  const emails = result.rows
  console.log('[notification.service] emails to send:', emails.length)

  for (const email of emails) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('[notification.service] DEV — email logged instead of sent:')
        console.log('  TO:', email.to_email)
        console.log('  SUBJECT:', email.subject)
      } else {
        await transporter.sendMail({
          from:    process.env.EMAIL_FROM || 'noreply@reclaim.com',
          to:      email.to_email,
          subject: email.subject,
          html:    email.html
        })
        console.log('[notification.service] email sent to:', email.to_email)
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

// ─── Get notifications for user ───────────────────────────────────────────────

const getNotificationsForUser = async (userId) => {
  console.log('[notification.service] getNotificationsForUser:', userId)

  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  )

  return result.rows
}

// ─── Mark read ────────────────────────────────────────────────────────────────

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

// ─── Notification handlers ────────────────────────────────────────────────────

/*
  Each handler:
  1. Creates in-app notification
  2. Gets user email
  3. Queues email
*/

const handleNewMatch = async ({ lostUserId, foundUserId, matchId, lostListingId, foundListingId, score }) => {
  console.log('[notification.service] handleNewMatch:', matchId)

  const scorePercent = Math.round(score * 100)

  // notify lost user
  await createInApp(lostUserId, 'new_match',
    '🎯 Match found!',
    `A ${scorePercent}% match was found for your lost listing.`,
    { matchId, listingId: lostListingId }
  )

  // notify found user
  await createInApp(foundUserId, 'new_match',
    '🎯 Match found!',
    `A ${scorePercent}% match was found for your found listing.`,
    { matchId, listingId: foundListingId }
  )

  // queue emails
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
  console.log('[notification.service] handleClaimReceived:', claimId)

  await createInApp(listingUserId, 'claim_received',
    '📬 New claim on your listing',
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
  console.log('[notification.service] handleClaimApproved:', claimId)

  await createInApp(claimantId, 'claim_approved',
    '✅ Your claim was approved!',
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
  console.log('[notification.service] handleClaimRejected:', claimId)

  await createInApp(claimantId, 'claim_rejected',
    '❌ Your claim was rejected',
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
  console.log('[notification.service] handleClaimExpired:', claimId)

  await createInApp(claimantId, 'claim_expired',
    '⏰ Claim expired',
    'The listing owner did not respond in time. Your claim has expired.',
    { claimId, listingId }
  )

  await createInApp(listingUserId, 'claim_missed',
    '⚠️ You missed a claim',
    'A claim expired because you did not respond. Please respond to claims within 72 hours.',
    { claimId, listingId }
  )
}

const handleClaimReminder1 = async ({ claimId, listingUserId, claimantId, listingId, expiresAt }) => {
  console.log('[notification.service] handleClaimReminder1:', claimId)

  await createInApp(listingUserId, 'claim_reminder',
    '⏰ Claim reminder — 48 hours left',
    'You have a pending claim. You have 48 hours to respond.',
    { claimId, listingId }
  )

  await createInApp(claimantId, 'claim_update',
    '⏳ Still waiting',
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
  console.log('[notification.service] handleClaimReminder2:', claimId)

  await createInApp(listingUserId, 'claim_final_warning',
    '🚨 Final warning — 24 hours left',
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
  console.log('[notification.service] handleNewMessage to:', recipientId)

  await createInApp(recipientId, 'new_message',
    '💬 New message',
    body.substring(0, 100),
    { conversationId, senderId }
  )
}

const handleClaimsRejectedBulk = async ({ claimIds, listingId }) => {
  console.log('[notification.service] handleClaimsRejectedBulk:', claimIds.length)
  // Individual notifications sent per rejected claim
  // Bulk handler just logs for now
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