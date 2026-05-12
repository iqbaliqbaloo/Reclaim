# Reclaim — Architecture

## Folder structure

reclaim/
├── services/
│   ├── auth-service/
│   ├── user-service/
│   ├── listing-service/
│   ├── media-service/
│   ├── match-service/
│   ├── claim-service/
│   ├── chat-service/
│   ├── notification-service/
│   ├── search-service/
│   ├── admin-service/
│   └── resolution-service/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── Dockerfile
│   └── package.json
├── shared/
│   └── serviceClient.js
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── SETUP.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
└── CHANGELOG.md

## Every service folder looks like this

service-name/
├── controllers/        request and response only, no business logic
├── routes/             express routes and middleware applied here
├── models/             raw SQL queries, no ORM
├── services/           all business logic lives here
├── middleware/
│   ├── auth.js         protect() and authorize() functions
│   └── rbac.js         resource, action, state permission checks
├── validators/         express-validator rules
├── __tests__/          jest + supertest tests
├── Dockerfile
├── package.json
└── index.js            entry point, starts express server

## How services talk to each other

All communication is HTTP via shared/serviceClient.js
Timeout: 5 seconds on every call
No Redis, no RabbitMQ, no message queue

Async calls (fire and forget — no waiting):
  listing-service  →  match-service        on every new listing created
  listing-service  →  search-service       on any listing status change

Sync calls (must succeed or transaction rolls back):
  claim-service    →  chat-service         on claim approved (opens conversation)
  claim-service    →  notification-service on claim status change
  match-service    →  notification-service on new match found

## Auth flow

1. User logs in via auth-service (email or Google)
2. auth-service returns JWT access token (15 min) + refresh token (7 days)
3. Refresh token stored in httpOnly cookie
4. Every request carries JWT access token in Authorization header
5. Each service verifies token locally using shared JWT_SECRET
6. No central auth call on every request

## Google OAuth (stateless — no sessions)

1. User clicks Google login
2. auth-service redirects to Google with a short-lived state token in URL
3. Google redirects back to callback URL
4. auth-service verifies state token
5. Issues normal JWT pair — same flow as email login
6. No express-session, no Redis needed

## Database design

auth-service       → MongoDB  (database: reclaim_auth)
all other services → PostgreSQL

In development:
  One PostgreSQL instance
  Each service uses its own schema
  Example: listing-service uses schema "listing"

In production:
  Each service gets its own PostgreSQL database

## Image storage

1. User uploads photo
2. media-service validates: image mimetype only, max 5MB, max 5 per listing
3. Resize to max 800px width
4. Try to upload to S3/MinIO
5. If S3 fails → store as bytea in PostgreSQL images table
6. Background job runs every hour
7. Finds all images stored in DB (storage_type = 'db')
8. Tries to move them to S3
9. On success → updates storage_type to 's3', clears bytea data
10. Frontend always receives a URL or base64 string

## RBAC — how permissions work

Every protected route runs two middleware functions:

protect()
  Checks JWT is valid
  Attaches user to req.user

authorize(resource, action)
  Checks req.user.role has permission for this resource + action
  Also checks state conditions (listing status, ownership, counts)
  Returns 403 if not allowed

Permission matrix is defined in middleware/rbac.js
Every service has its own copy following the same pattern

## Claim direction — important

ONLY lost users can claim a found listing.
Found users only post — they never claim.

Lost user writes a description proving the item is theirs.
Found user reads it and approves or rejects.