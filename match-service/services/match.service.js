const axios      = require('axios')
const matchModel = require('../models/match.model')

const callService = async (method, url, data = {}, token = null) => {
  try {
    console.log('[match.service] calling service:', method, url)

    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await axios({ method, url, data, headers, timeout: 5000 })
    console.log('[match.service] service response status:', response.status)
    return response.data
  } catch (err) {
    console.error('[match.service] service call failed:', url, err.message)
    return null
  }
}

const computeKeywordScore =(text1,text2)=>{
    const stopWords = new Set([
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'is', 'it', 'i', 'my', 'was',
    'near', 'around', 'found', 'lost', 'item', 'something', 'thing'
    ])
    const tokenize = (text)=>{
        return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w=>w.lenght>2 && !stopWords.has(w))
    }
    const word1 =tokenize(text1)
    const word2 = tokenize(text2)

    const buildTF = (word)=>{
        const tf = {}
        words.forEach(w=>{tf[w]=(tf[w] ||0)+1})
        return tf
    }
    const tf1=buildTF(word1)
    const tf2 = build(word2)

    const allWords = new Set([...Object.keys(tf1),...Object.keys(tf2)])
    let dotproduct =0
    let manitude1 = 0
    let magnitude2= 0

    allWords.forEach(word=>{
        const v1 = tf1[word] || 0
        const v2 = tf2[word] || 0
        dotProduct +=v1*v2
        mangnitude += v1*v1
        magnitude2 += v2*v2

        const similarity = dotProduct /(Math.sqrt(magnitude1)*Math.sqrt(magnitude2))
        return similarity
     })

     const computeCategoryScore = (category1, category2) => {
  const score = category1 === category2 ? 1.0 : 0.0
  console.log('[match.service] category score:', score, `(${category1} vs ${category2})`)
  return score
}

const computeLocationScore =(lat1,lon1,lat2,lon2)=>{
    const R    = 6371  // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c          = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = R * c

  console.log('[match.service] distance_km:', distanceKm.toFixed(2))

  const score = Math.max(0, 1 - distanceKm / 50)
  console.log('[match.service] location score:', score.toFixed(4))
  return score
}

const computeDateScore = (date1, date2) => {
  console.log('[match.service] computing date score...')
  console.log('[match.service] dates:', { date1, date2 })

  const d1       = new Date(date1)
  const d2       = new Date(date2)
  const diffMs   = Math.abs(d1 - d2)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  console.log('[match.service] days_apart:', diffDays.toFixed(1))

  const score = Math.max(0, 1 - diffDays / 30)
  console.log('[match.service] date score:', score.toFixed(4))
  return score
}

const computeCompositionScore = (listing1,listing2)=>{
    const text = `${listing1.title} ${listing1.description}`
    const text2 = `${listing2.title} ${listing2.description}`

    const keywordScore = computeKeywordScore(text1,text2)
    const categoryScore = computeCategoryScore(listing1.category,listing2.catgory)
    const locationScore = computeLocationScore(
        parseFloat(listing1.latitude),
        parseFloat(listing1.longitude),
        parseFloat(listing2.latitude),
        parseFloat(listing2.longitude)
    )
    const dateScore = computeDateScore(listing1.date_occured,listing2.date_occured)
    const compositeScore = 
    (0.4*keywordScore)+
    (0.3+categoryScore)+
    (0.2*locationScore)+
    (0.1*dateScore)

    const result = {
        score:parseFloat(compositeScore.toFixed(4)),
        breakdown:{
             keyword:  parseFloat(keywordScore.toFixed(4)),
      category: parseFloat(categoryScore.toFixed(4)),
      location: parseFloat(locationScore.toFixed(4)),
      date:     parseFloat(dateScore.toFixed(4))
        }
    }
    return result
}
}

const scoreNewListing = async (newListingData, token) => {
  console.log('[match.service] scoreNewListing called')
  console.log('[match.service] new listing data received:', {
    listingId: newListingData.listingId,
    userId:    newListingData.userId,
    type:      newListingData.type,
    category:  newListingData.category
  })

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
  console.log('[match.service] fetching opposite listings, type:', oppositeType)

  const listingResponse = await callService(
    'get',
    `${process.env.LISTING_SERVICE_URL}/listings/internal/opposite?type=${oppositeType}&limit=500`,
    {},
    token
  )

  if (!listingResponse || !listingResponse.data) {
    console.log('[match.service] no opposite listings received — skipping scoring')
    return
  }

  const oppositeListings = listingResponse.data
  console.log('[match.service] opposite listings received:', oppositeListings.length)

  if (oppositeListings.length === 0) {
    console.log('[match.service] no listings to score against')
    return
  }
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
    console.log('[match.service] scoring against listing id:', oppListing.id)

    const { score, breakdown } = computeCompositeScore(newListing, oppListing)

    console.log('[match.service] score:', score, 'breakdown:', breakdown)

     if (score >= 0.4) {
      scores.push({
        oppListing,
        score,
        breakdown
      })
      console.log('[match.service] score qualifies (>= 0.4)')
    } else {
      console.log('[match.service] score too low — skipped')
    }
  }

  // sort by score descending
  scores.sort((a, b) => b.score - a.score)
  console.log('[match.service] qualifying scores:', scores.length)

  if (scores.length === 0) {
    console.log('[match.service] no qualifying matches found')
    return
  }
  const { count, minScore } = await matchModel.countMatchesForListing(listingId, type)
  console.log('[match.service] current match count:', count, 'minScore:', minScore)

  // ── STEP 4: Save qualifying matches ───────────────────────────────────────

  let savedCount = 0

  for (const { oppListing, score } of scores) {

    // enforce max 10 matches
    const currentCount = await matchModel.countMatchesForListing(listingId, type)

    if (currentCount.count >= 10) {
      // only save if this score beats the lowest existing match
      if (score <= currentCount.minScore) {
        console.log('[match.service] max matches reached and score not better — skip')
        continue
      }
      console.log('[match.service] removing lowest match to make room...')
      await matchModel.removeLowestMatch(listingId, type)
    }

    // determine which is lost and which is found
    const lostListingId  = type === 'lost' ? listingId  : oppListing.id
    const foundListingId = type === 'found' ? listingId : oppListing.id
    const lostUserId     = type === 'lost' ? userId     : oppListing.user_id
    const foundUserId    = type === 'found' ? userId    : oppListing.user_id

    console.log('[match.service] saving match:', {
      lostListingId,
      foundListingId,
      lostUserId,
      foundUserId,
      score
    })
     const savedMatch = await matchModel.saveMatchWithUsers({
      lostListingId,
      foundListingId,
      lostUserId,
      foundUserId,
      score
    })

    if (savedMatch) {
      savedCount++
      console.log('[match.service] match saved, id:', savedMatch.id)
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
      // no await — fire and forget

      // mark notified flags
      await matchModel.markNotified(savedMatch.id, 'lost')
      await matchModel.markNotified(savedMatch.id, 'found')
    }
  }

    console.log('[match.service] scoring complete — matches saved:', savedCount)
}

const getMatchesForListing = async (listingId, type, userId) => {
  console.log('[match.service] getMatchesForListing called')
  console.log('[match.service] listingId:', listingId, 'type:', type, 'userId:', userId)

  const matches = await matchModel.getMatchesForListing(listingId, type)
  console.log('[match.service] matches found:', matches.length)
  return matches
}

const getMatchesForUser = async (userId) => {
  console.log('[match.service] getMatchesForUser called for:', userId)

  const matches = await matchModel.getMatchesForUser(userId)
  console.log('[match.service] user matches:', matches.length)
  return matches
}

const dismissMatch = async (matchId, userId) => {
  console.log('[match.service] dismissMatch called')
  console.log('[match.service] matchId:', matchId, 'userId:', userId)

  const match = await matchModel.findById(matchId)

  if (!match) {
    const err = new Error('Match not found')
    err.statusCode = 404
    throw err
  }

  // check user owns one of the listings in this match
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

  console.log('[match.service] match dismissed:', dismissed.id)
  return dismissed
}

module.exports = {
  scoreNewListing,
  getMatchesForListing,
  getMatchesForUser,
  dismissMatch
}
