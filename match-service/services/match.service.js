const axios      = require('axios')
const matchModel = require('../models/match.model')

const callService = async (method, url, data = {}, token = null) => {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await axios({ method, url, data, headers, timeout: 5000 })
    return response.data
  } catch (err) {
    console.error('[match.service] service call failed:', url, err.message)
    return null
  }
}

const computeKeywordScore = (text1, text2) => {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'is', 'it', 'i', 'my', 'was',
    'near', 'around', 'found', 'lost', 'item', 'something', 'thing'
  ])
  const tokenize = (text) => text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  const words1 = tokenize(text1)
  const words2 = tokenize(text2)

  const buildTF = (words) => {
    const tf = {}
    words.forEach(w => { tf[w] = (tf[w] || 0) + 1 })
    return tf
  }

  const tf1 = buildTF(words1)
  const tf2 = buildTF(words2)

  const allWords = new Set([...Object.keys(tf1), ...Object.keys(tf2)])
  let dotproduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  allWords.forEach(word => {
    const v1 = tf1[word] || 0
    const v2 = tf2[word] || 0
    dotproduct += v1 * v2
    magnitude1 += v1 * v1
    magnitude2 += v2 * v2
  })

  if (magnitude1 === 0 || magnitude2 === 0) return 0
  return dotproduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2))
}

const computeCategoryScore = (category1, category2) => {
  return category1 === category2 ? 1.0 : 0.0
}

const computeLocationScore = (lat1, lon1, lat2, lon2) => {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c          = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = R * c
  return Math.max(0, 1 - distanceKm / 50)
}

const computeDateScore = (date1, date2) => {
  const d1       = new Date(date1)
  const d2       = new Date(date2)
  const diffMs   = Math.abs(d1 - d2)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.max(0, 1 - diffDays / 30)
}

const computeCompositionScore = (listing1, listing2) => {
  const text1 = `${listing1.title} ${listing1.description}`
  const text2 = `${listing2.title} ${listing2.description}`

  const keywordScore  = computeKeywordScore(text1, text2)
  const categoryScore = computeCategoryScore(listing1.category, listing2.category)
  const dateScore     = computeDateScore(listing1.date_occurred, listing2.date_occurred)

  const lat1 = parseFloat(listing1.latitude)
  const lon1 = parseFloat(listing1.longitude)
  const lat2 = parseFloat(listing2.latitude)
  const lon2 = parseFloat(listing2.longitude)
  const hasLocation = [lat1, lon1, lat2, lon2].every(n => !isNaN(n))

  let compositeScore
  let locationScore

  if (hasLocation) {
    locationScore  = computeLocationScore(lat1, lon1, lat2, lon2)
    compositeScore = (0.4 * keywordScore) + (0.3 * categoryScore) + (0.2 * locationScore) + (0.1 * dateScore)
  } else {
    locationScore  = null
    compositeScore = (0.5 * keywordScore) + (0.4 * categoryScore) + (0.1 * dateScore)
  }

  return {
    score: parseFloat(compositeScore.toFixed(4)),
    breakdown: {
      keyword:  parseFloat(keywordScore.toFixed(4)),
      category: parseFloat(categoryScore.toFixed(4)),
      location: locationScore !== null ? parseFloat(locationScore.toFixed(4)) : null,
      date:     parseFloat(dateScore.toFixed(4))
    }
  }
}

const scoreNewListing = async (newListingData, token) => {
  const {
    listingId,
    userId,
    type,
    title,
    description,
    category,
    latitude,
    longitude,
    date_occurred
  } = newListingData

  const oppositeType = type === 'lost' ? 'found' : 'lost'

  const listingResponse = await callService(
    'get',
    `${process.env.LISTING_SERVICE_URL}/api/listings/internal/opposite?type=${oppositeType}&limit=500`,
    {},
    token
  )

  if (!listingResponse || !listingResponse.data) return

  const oppositeListings = listingResponse.data
  if (oppositeListings.length === 0) return

  const newListing = {
    id:            listingId,
    user_id:       userId,
    title,
    description,
    category,
    latitude,
    longitude,
    date_occurred
  }

  const scores = []

  for (const oppListing of oppositeListings) {
    const { score, breakdown } = computeCompositionScore(newListing, oppListing)
    if (score >= 0.4) {
      scores.push({ oppListing, score, breakdown })
    }
  }

  scores.sort((a, b) => b.score - a.score)
  if (scores.length === 0) return

  let savedCount = 0

  for (const { oppListing, score } of scores) {
    const currentCount = await matchModel.countMatchesForListing(listingId, type)

    if (currentCount.count >= 10) {
      if (score <= currentCount.minScore) continue
      await matchModel.removeLowestMatch(listingId, type)
    }

    const lostListingId  = type === 'lost' ? listingId  : oppListing.id
    const foundListingId = type === 'found' ? listingId : oppListing.id
    const lostUserId     = type === 'lost' ? userId     : oppListing.user_id
    const foundUserId    = type === 'found' ? userId    : oppListing.user_id

    const savedMatch = await matchModel.saveMatchWithUsers({
      lostListingId,
      foundListingId,
      lostUserId,
      foundUserId,
      score
    })

    if (savedMatch) {
      savedCount++
      callService(
        'post',
        `${process.env.NOTIFICATION_SERVICE_URL}/notifications/match`,
        {
          type:           'new_match',
          matchId:        savedMatch.id,
          lostListingId,
          foundListingId,
          lostUserId,
          foundUserId,
          score
        },
        token
      )
      await matchModel.markNotified(savedMatch.id, 'lost')
      await matchModel.markNotified(savedMatch.id, 'found')
    }
  }
}

const getMatchesForListing = async (listingId, type, userId) => {
  return await matchModel.getMatchesForListing(listingId, type)
}

const getMatchesForUser = async (userId) => {
  return await matchModel.getMatchesForUser(userId)
}

const dismissMatch = async (matchId, userId) => {
  const match = await matchModel.findById(matchId)

  if (!match) {
    const err = new Error('Match not found')
    err.statusCode = 404
    throw err
  }

  if (match.lost_user_id !== userId && match.found_user_id !== userId) {
    const err = new Error('You can only dismiss your own matches')
    err.statusCode = 403
    throw err
  }

  const dismissed = await matchModel.dismissMatch(matchId, userId)

  if (!dismissed) {
    const err = new Error('Dismiss failed — match may already be dismissed')
    err.statusCode = 400
    throw err
  }

  return dismissed
}

module.exports = {
  scoreNewListing,
  getMatchesForListing,
  getMatchesForUser,
  dismissMatch
}
