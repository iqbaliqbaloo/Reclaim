# How to set up Reclaim locally

## What you need installed

- Node.js v20 or higher
- Docker and Docker Compose
- Git

## Step 1 — Clone the repo

git clone https://github.com/yourname/reclaim.git
cd reclaim

## Step 2 — Copy environment file

cp .env.example .env

Open .env and fill in your values.
See the ENV VARIABLES section below for what each one means.

## Step 3 — Start all services

docker-compose up --build

This starts PostgreSQL, MongoDB, MinIO, and all backend services.
Wait until you see all services say "listening on port".

## Step 4 — Run database migrations

Run this for each service that uses PostgreSQL:

cd services/user-service && npm run migrate
cd services/listing-service && npm run migrate
cd services/match-service && npm run migrate
cd services/claim-service && npm run migrate
cd services/chat-service && npm run migrate
cd services/notification-service && npm run migrate
cd services/search-service && npm run migrate
cd services/admin-service && npm run migrate
cd services/resolution-service && npm run migrate

## Step 5 — Create the first admin user

1. Register normally on the app
2. Connect to your PostgreSQL database
3. Run this query:

UPDATE users SET role = 'admin' WHERE email = 'your@email.com';

## Step 6 — Open the app

Frontend: http://localhost:3000
MinIO console: http://localhost:9001 (minioadmin / minioadmin)

## Run tests for a service

cd services/listing-service
npm test

## ENV variables explained

JWT_SECRET
  Secret key used to sign JWT access tokens.
  Make it long and random. Never share it.

JWT_REFRESH_SECRET
  Secret key used to sign JWT refresh tokens.
  Different from JWT_SECRET.

GOOGLE_CLIENT_ID
  From Google Cloud Console.
  Used for Google OAuth login.

GOOGLE_CLIENT_SECRET
  From Google Cloud Console.
  Used for Google OAuth login.

GOOGLE_CALLBACK_URL
  Where Google redirects after login.
  Local: http://localhost:4001/auth/google/callback

MONGODB_URI
  Connection string for MongoDB.
  Local: mongodb://localhost:27017/reclaim_auth

POSTGRES_HOST
  PostgreSQL host. Local: localhost

POSTGRES_PORT
  PostgreSQL port. Default: 5432

POSTGRES_USER
  PostgreSQL username. Default: postgres

POSTGRES_PASSWORD
  PostgreSQL password. Set this yourself.

POSTGRES_DB
  PostgreSQL database name. Use: reclaim

S3_ENDPOINT
  MinIO or S3 endpoint.
  Local MinIO: http://localhost:9000

S3_BUCKET
  Bucket name for storing images. Use: reclaim-images

S3_ACCESS_KEY
  MinIO or AWS access key.
  Local MinIO default: minioadmin

S3_SECRET_KEY
  MinIO or AWS secret key.
  Local MinIO default: minioadmin

S3_REGION
  AWS region. For local MinIO use: us-east-1

SENDGRID_API_KEY
  From SendGrid dashboard.
  Used for sending emails.

EMAIL_FROM
  The from address for all emails.
  Example: noreply@reclaim.com

FRONTEND_URL
  Where the frontend runs.
  Local: http://localhost:3000

NODE_ENV
  Use: development