

const axios      = require('axios')
const claimModel = require('../models/claim.model')


const callService = async (method, url, data = {}, token = null) => {
  try {
    console.log('[claim.service] calling:', method, url)
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await axios({ method, url, data, headers, timeout: 5000 })
    console.log('[claim.service] response status:', res.status)
    return res.data
  } catch (err) {
    console.error('[claim.service] call failed:', url, err.message)
    return null
  }
}


const submitClaim = async (claimantId, data, token) => {
  console.log('[claim.service] submitClaim called')
  console.log('[claim.service] claimantId:', claimantId)
  console.log('[claim.service] data received:', {
    listingId:        data.listingId,
    descriptionLength: data.claimDescription?.length
  })

  const { listingId, claimDescription } = data


  console.log('[claim.service] fetching listing from listing-service...')
  const listingRes = await callService(
    'get',
    `${process.env.LISTING_SERVICE_URL}/listings/${listingId}`,
    {},
    token
  )

  if (!listingRes || !listingRes.data) {
    const err = new Error('Listing not found')
    err.statusCode = 404
    throw err
  }

  const listing = listingRes.data
  console.log('[claim.service] listing received:', {
    id:     listing.id,
    type:   listing.type,
    status: listing.status,
    userId: listing.user_id
  })

  
  if (listing.type !== 'found') {
    const err = new Error('You can only claim found listings')
    err.statusCode = 400
    throw err
  }

  // listing must be active
  if (listing.status !== 'active') {
    const err = new Error('This listing is no longer active')
    err.statusCode = 400
    throw err
  }

  // cannot claim own listing
  if (listing.user_id === claimantId) {
    const err = new Error('You cannot claim your own listing')
    err.statusCode = 403
    throw err
  }

  // ── STEP 2: Check for existing claim ────────────────────────────────────────

  const existing = await claimModel.findExistingClaim(listingId, claimantId)
  if (existing) {
    const err = new Error('You already have an active claim on this listing')
    err.statusCode = 409
    throw err
  }

  // ── STEP 3: Check listing claim limit ───────────────────────────────────────

  const listingClaimCount = await claimModel.countActiveForListing(listingId)
  console.log('[claim.service] active claims on listing:', listingClaimCount)

  if (listingClaimCount >= 5) {
    const err = new Error('This listing has reached maximum claims. Try again later.')
    err.statusCode = 429
    throw err
  }

  // ── STEP 4: Check user claim limit ──────────────────────────────────────────

  const userClaimCount = await claimModel.countActiveForUser(claimantId)
  console.log('[claim.service] active claims by user:', userClaimCount)

  if (userClaimCount >= 3) {
    const err = new Error('You have reached maximum active claims. Wait for existing claims to resolve.')
    err.statusCode = 429
    throw err
  }

  // ── STEP 5: Create claim ────────────────────────────────────────────────────

  const claim = await claimModel.createClaim({
    listingId,
    listingUserId: listing.user_id,
    claimantId,
    claimDescription
  })

  console.log('[claim.service] claim created:', claim.id)


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
  console.log('[claim.service] approveClaim called')
  console.log('[claim.service] claimId:', claimId, 'listingUserId:', listingUserId)

  // verify claim exists
  const claim = await claimModel.findById(claimId)
  if (!claim) {
    const err = new Error('Claim not found')
    err.statusCode = 404
    throw err
  }

  console.log('[claim.service] claim found:', claim.id, 'status:', claim.status)

  // verify caller is listing owner
  if (claim.listing_user_id !== listingUserId) {
    const err = new Error('Only the listing owner can approve claims')
    err.statusCode = 403
    throw err
  }

  // verify claim is pending
  if (claim.status !== 'pending') {
    const err = new Error(`Claim is already ${claim.status}`)
    err.statusCode = 400
    throw err
  }

  // verify not expired
  if (new Date(claim.expires_at) < new Date()) {
    const err = new Error('This claim has expired')
    err.statusCode = 400
    throw err
  }

  // ── ATOMIC: approve + reject others ─────────────────────────────────────────

  const { approvedClaim, rejectedClaimIds } = await claimModel.approveClaim(
    claimId,
    claim.listing_id
  )

  console.log('[claim.service] claim approved:', approvedClaim.id)
  console.log('[claim.service] other claims rejected:', rejectedClaimIds.length)


  console.log('[claim.service] opening chat conversation...')
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

  console.log('[claim.service] chat conversation opened:', chatRes?.data?.id)

  // ── Notify claimant ──────────────────────────────────────────────────────────

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

  // ── Notify rejected claimants ────────────────────────────────────────────────

  if (rejectedClaimIds.length > 0) {
    callService(
      'post',
      `${process.env.NOTIFICATION_SERVICE_URL}/notifications/claims-rejected-bulk`,
      {
        claimIds:  rejectedClaimIds,
        listingId: claim.listing_id
      },
      token
    )
  }

  return {
    claim:          approvedClaim,
    conversationId: chatRes?.data?.id
  }
}

// ─── Reject claim ─────────────────────────────────────────────────────────────

/*
  rejectClaim(claimId, listingUserId, token)

  CALLED BY: found user rejecting a single claim
*/
const rejectClaim = async (claimId, listingUserId, token) => {
  console.log('[claim.service] rejectClaim called')
  console.log('[claim.service] claimId:', claimId)

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

  console.log('[claim.service] claim rejected:', rejected.id)

  // notify claimant
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

// ─── Get claims for listing ───────────────────────────────────────────────────

const getClaimsForListing = async (listingId, userId, token) => {
  console.log('[claim.service] getClaimsForListing:', listingId)

  // verify listing ownership
  const listingRes = await callService(
    'get',
    `${process.env.LISTING_SERVICE_URL}/listings/${listingId}`,
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

  const claims = await claimModel.getClaimsForListing(listingId)
  console.log('[claim.service] claims found:', claims.length)
  return claims
}


const getMyClaims = async (claimantId) => {
  console.log('[claim.service] getMyClaims for:', claimantId)
  const claims = await claimModel.getClaimsByUser(claimantId)
  console.log('[claim.service] my claims:', claims.length)
  return claims
}


const processExpiredClaims = async () => {
  console.log('[claim.service] processExpiredClaims running...')

  const expiredClaims = await claimModel.getExpiredClaims()
  console.log('[claim.service] expired claims to process:', expiredClaims.length)

  for (const claim of expiredClaims) {
    console.log('[claim.service] processing expired claim:', claim.id)

    // mark as expired
    await claimModel.markExpired(claim.id)

    // notify claimant
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

    // check if listing has 3+ missed claims
    const missedCount = await claimModel.countMissedClaims(claim.listing_id)
    console.log('[claim.service] missed claims for listing:', missedCount)

    if (missedCount >= 3) {
      console.log('[claim.service] 3 missed claims — calling listing-service to remove listing')
      callService(
        'delete',
        `${process.env.LISTING_SERVICE_URL}/listings/${claim.listing_id}/admin`
      )
    }
  }

  console.log('[claim.service] processExpiredClaims complete')
}


const sendClaimReminders = async () => {
  console.log('[claim.service] sendClaimReminders running...')

  // 24h reminders
  const reminder1Claims = await claimModel.getClaimsNeedingReminder1()
  for (const claim of reminder1Claims) {
    console.log('[claim.service] sending 24h reminder for claim:', claim.id)
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

  // 48h reminders
  const reminder2Claims = await claimModel.getClaimsNeedingReminder2()
  for (const claim of reminder2Claims) {
    console.log('[claim.service] sending 48h reminder for claim:', claim.id)
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

  console.log('[claim.service] reminders complete')
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