const axios      = require('axios')
const claimModel = require('../models/claim.model')

const callService = async (method, url, data = {}, token = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await axios({ method, url, data, headers, timeout: 5000 })
    return res.data
  } catch (err) {
    console.error('[claim.service] call failed:', url, err.message)
    return null
  }
}

const submitClaim = async (claimantId, data, token) => {
  const { listingId, claimDescription } = data

  const listingRes = await callService(
    'get',
    `${process.env.LISTING_SERVICE_URL}/api/listings/${listingId}`,
    {},
    token
  )

  if (!listingRes || !listingRes.data) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }

  const listing = listingRes.data

  if (listing.type !== 'found') {
    const err = new Error('You can only claim found listings')
    err.statusCode = 400
    throw err
  }

  if (listing.status !== 'active') {
    const err = new Error('This listing is no longer active')
    err.statusCode = 400
    throw err
  }

  if (listing.user_id === claimantId) {
    const err = new Error('You cannot claim your own listing')
    err.statusCode = 403
    throw err
  }

  const existing = await claimModel.findExistingClaim(listingId, claimantId)
  if (existing) {
    const err = new Error('You already have an active claim on this listing')
    err.statusCode = 409
    throw err
  }

  const listingClaimCount = await claimModel.countActiveForListing(listingId)
  if (listingClaimCount >= 5) {
    const err = new Error('This listing has reached maximum claims. Try again later.')
    err.statusCode = 429
    throw err
  }

  const userClaimCount = await claimModel.countActiveForUser(claimantId)
  if (userClaimCount >= 3) {
    const err = new Error('You have reached maximum active claims. Wait for existing claims to resolve.')
    err.statusCode = 429
    throw err
  }

  const claim = await claimModel.createClaim({
    listingId,
    listingUserId: listing.user_id,
    claimantId,
    claimDescription
  })

  callService(
    'post',
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claim-received`,
    {
      claimId:       claim.id,
      listingId,
      listingUserId: listing.user_id,
      claimantId,
      expiresAt:     claim.expires_at
    },
    token
  )

  return claim
}

const approveClaim = async (claimId, listingUserId, token) => {
  const claim = await claimModel.findById(claimId)
  if (!claim) {
    const err = new Error('Claim not found')
    err.statusCode = 404
    throw err
  }

  if (claim.listing_user_id !== listingUserId) {
    const err = new Error('Only the listing owner can approve claims')
    err.statusCode = 403
    throw err
  }

  if (claim.status !== 'pending') {
    const err = new Error(`Claim is already ${claim.status}`)
    err.statusCode = 400
    throw err
  }

  if (new Date(claim.expires_at) < new Date()) {
    const err = new Error('This claim has expired')
    err.statusCode = 400
    throw err
  }

  const { approvedClaim, rejectedClaimIds } = await claimModel.approveClaim(claimId, claim.listing_id)

  const chatRes = await callService(
    'post',
    `${process.env.CHAT_SERVICE_URL}/conversations`,
    {
      listingId:   claim.listing_id,
      lostUserId:  claim.claimant_id,
      foundUserId: claim.listing_user_id,
      claimId:     claimId
    },
    token
  )

  callService(
    'post',
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claim-approved`,
    {
      claimId:        approvedClaim.id,
      claimantId:     claim.claimant_id,
      listingId:      claim.listing_id,
      conversationId: chatRes?.data?.id
    },
    token
  )

  if (rejectedClaimIds.length > 0) {
    callService(
      'post',
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claims-rejected-bulk`,
      { claimIds: rejectedClaimIds, listingId: claim.listing_id },
      token
    )
  }

  return { claim: approvedClaim, conversationId: chatRes?.data?.id }
}

const rejectClaim = async (claimId, listingUserId, token) => {
  const claim = await claimModel.findById(claimId)
  if (!claim) {
    const err = new Error('Claim not found')
    err.statusCode = 404
    throw err
  }

  if (claim.listing_user_id !== listingUserId) {
    const err = new Error('Only the listing owner can reject claims')
    err.statusCode = 403
    throw err
  }

  if (claim.status !== 'pending') {
    const err = new Error(`Claim is already ${claim.status}`)
    err.statusCode = 400
    throw err
  }

  const rejected = await claimModel.rejectClaim(claimId, claim.listing_id, listingUserId)
  if (!rejected) {
    const err = new Error('Reject failed')
    err.statusCode = 500
    throw err
  }

  callService(
    'post',
    `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claim-rejected`,
    {
      claimId:    rejected.id,
      claimantId: claim.claimant_id,
      listingId:  claim.listing_id
    },
    token
  )

  return rejected
}

const getClaimsForListing = async (listingId, userId, token) => {
  const listingRes = await callService(
    'get',
    `${process.env.LISTING_SERVICE_URL}/api/listings/${listingId}`,
    {},
    token
  )

  if (!listingRes?.data) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }

  if (listingRes.data.user_id !== userId) {
    const err = new Error('Only the listing owner can view claims')
    err.statusCode = 403
    throw err
  }

  return await claimModel.getClaimsForListing(listingId)
}

const getMyClaims = async (claimantId) => {
  return await claimModel.getClaimsByUser(claimantId)
}

const processExpiredClaims = async () => {
  const expiredClaims = await claimModel.getExpiredClaims()

  for (const claim of expiredClaims) {
    await claimModel.markExpired(claim.id)

    callService(
      'post',
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claim-expired`,
      {
        claimId:       claim.id,
        claimantId:    claim.claimant_id,
        listingUserId: claim.listing_user_id,
        listingId:     claim.listing_id
      }
    )

    const missedCount = await claimModel.countMissedClaims(claim.listing_id)
    if (missedCount >= 3) {
      callService(
        'delete',
        `${process.env.LISTING_SERVICE_URL}/api/listings/${claim.listing_id}/admin`
      )
    }
  }
}

const sendClaimReminders = async () => {
  const reminder1Claims = await claimModel.getClaimsNeedingReminder1()
  for (const claim of reminder1Claims) {
    callService(
      'post',
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claim-reminder-1`,
      {
        claimId:       claim.id,
        listingUserId: claim.listing_user_id,
        claimantId:    claim.claimant_id,
        listingId:     claim.listing_id,
        expiresAt:     claim.expires_at
      }
    )
    await claimModel.markReminder1Sent(claim.id)
  }

  const reminder2Claims = await claimModel.getClaimsNeedingReminder2()
  for (const claim of reminder2Claims) {
    callService(
      'post',
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claim-reminder-2`,
      {
        claimId:       claim.id,
        listingUserId: claim.listing_user_id,
        claimantId:    claim.claimant_id,
        listingId:     claim.listing_id,
        expiresAt:     claim.expires_at
      }
    )
    await claimModel.markReminder2Sent(claim.id)
  }
}

module.exports = {
  submitClaim,
  approveClaim,
  rejectClaim,
  getClaimsForListing,
  getMyClaims,
  processExpiredClaims,
  sendClaimReminders
}
