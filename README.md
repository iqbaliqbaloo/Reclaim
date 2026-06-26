# Reclaim — Lost & Found Platform

A full-stack lost-and-found web application built with a microservices architecture. Users can post lost or found item listings, get AI-powered match suggestions, file claims, and communicate via real-time chat.

---

## Tech Stack

### Frontend
| Technology | Version |
|---|---|
| Next.js | 16.x (App Router) |
| React | 19 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Axios | 1.x |

### Backend (per service)
| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server |
| MongoDB + Mongoose | auth-service user store |
| PostgreSQL (pg) | all other services |
| JSON Web Token | stateless auth (access + refresh) |
| Passport / Google OAuth 2.0 | social login |
| Nodemailer | email verification & notifications |
| Multer | file/image uploads |
| WebSocket (ws) | real-time chat |
| bcryptjs | password hashing |
| express-validator | input validation |
| express-rate-limit | rate limiting on auth routes |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Next.js Frontend                │
│         (React 19 · App Router · TS)         │
└────────────────────┬────────────────────────┘
                     │  HTTP / WebSocket
        ┌────────────▼────────────┐
        │  Microservices (REST)   │
        └────────────────────────-┘

Service             Port   DB          Notes
─────────────────── ────   ─────────── ─────────────────────────────────
auth-service        4001   MongoDB     JWT, Google OAuth, email verify
user-service        4002   PostgreSQL  user profiles
listing-service     4003   PostgreSQL  lost/found posts, image upload
media-service       4004   MongoDB     media asset management
match-service       4005   PostgreSQL  cosine-similarity AI matching
claim-service       4006   PostgreSQL  ownership claims
chat-service        4007   PostgreSQL  WebSocket real-time messaging
notification-service 4008  PostgreSQL  email notifications
admin-service       4010   PostgreSQL  admin panel (users, moderation)
resolution-service  4011   PostgreSQL  claim resolution workflow
search-service      —      PostgreSQL  full-text listing search
```

---

## Features

- **Auth** — register/login with email & password or Google OAuth; email verification; forgot/reset password; JWT access token (in-memory) + refresh token (httpOnly cookie)
- **Listings** — create lost or found item posts with images; browse, search, and filter all listings
- **AI Matching** — cosine-similarity engine automatically scores and surfaces likely matches between lost and found listings
- **Claims** — file a claim on a found item; resolution workflow for approving or rejecting claims
- **Real-time Chat** — WebSocket-powered messaging between claimants and finders
- **Notifications** — email alerts for claim updates and matches via Nodemailer
- **Admin Panel** — manage users, moderate listings, and view reports
- **Responsive UI** — mobile-first layout with hamburger nav; dark-mode-safe form inputs

---

## Project Structure

```
Reclaim/
├── frontend/               # Next.js 16 app
│   └── src/app/
│       ├── page.tsx                    # Home / landing
│       ├── login/                      # Login
│       ├── register/                   # Register
│       ├── forgot-password/            # Forgot password
│       ├── reset-password/             # Reset password
│       ├── auth/verify-email/          # Email verification
│       ├── auth/success/               # OAuth success redirect
│       ├── dashboard/                  # User dashboard
│       ├── listings/                   # Browse listings
│       ├── listings/create/            # Create listing
│       ├── listings/[id]/              # Listing detail
│       ├── listings/[id]/claim/        # File a claim
│       ├── claims/                     # My claims
│       ├── claims/listing/[id]/        # Claims on a listing
│       ├── chat/                       # Chat inbox
│       ├── chat/[id]/                  # Chat conversation
│       └── admin/                      # Admin dashboard, users, reports
├── auth-service/
├── user-service/
├── listing-service/
├── media-service/
├── match-service/
├── claim-service/
├── chat-service/
├── notification-service/
├── admin-service/
├── resolution-service/
├── search-service/
└── shared/
    └── serviceClient.js    # Shared inter-service HTTP client
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance
- PostgreSQL instance
- (Optional) Google OAuth credentials

### Environment Variables

Each service needs a `.env` file. Below are the common variables — refer to each service for service-specific ones.

**auth-service/.env**
```env
PORT=4001
MONGO_URI=mongodb://localhost:27017/reclaim-auth
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
CLIENT_URL=http://localhost:3000
```

**user-service/.env / listing-service/.env / ... (PostgreSQL services)**
```env
PORT=4002          # change per service
DATABASE_URL=postgres://user:password@localhost:5432/reclaim
JWT_SECRET=your_jwt_secret
```

**frontend/.env.local**
```env
NEXT_PUBLIC_AUTH_URL=http://localhost:4001
NEXT_PUBLIC_USER_URL=http://localhost:4002
NEXT_PUBLIC_LISTING_URL=http://localhost:4003
NEXT_PUBLIC_MATCH_URL=http://localhost:4005
NEXT_PUBLIC_CLAIM_URL=http://localhost:4006
NEXT_PUBLIC_CHAT_URL=http://localhost:4007
NEXT_PUBLIC_NOTIFICATION_URL=http://localhost:4008
NEXT_PUBLIC_ADMIN_URL=http://localhost:4010
NEXT_PUBLIC_RESOLUTION_URL=http://localhost:4011
NEXT_PUBLIC_SEARCH_URL=http://localhost:search_port
```

### Running Locally

Start each service in its own terminal:

```bash
# Auth service
cd auth-service && npm install && npm run dev

# User service
cd user-service && npm install && npm run dev

# Listing service
cd listing-service && npm install && npm run dev

# Media service
cd media-service && npm install && npm run dev

# Match service
cd match-service && npm install && npm run dev

# Claim service
cd claim-service && npm install && npm run dev

# Chat service
cd chat-service && npm install && npm run dev

# Notification service
cd notification-service && npm install && npm run dev

# Admin service
cd admin-service && npm install && npm run dev

# Resolution service
cd resolution-service && npm install && npm run dev

# Search service
cd search-service && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## API Overview

| Service | Base Path | Key Endpoints |
|---|---|---|
| auth | `/api/auth` | `POST /register`, `POST /login`, `POST /logout`, `POST /forget-password`, `POST /reset-password/:token`, `GET /google` |
| user | `/api/users` | `GET /:id`, `PUT /:id` |
| listing | `/api/listings` | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| match | `/api/matches` | `GET /:listingId` |
| claim | `/api/claims` | `POST /`, `GET /`, `PUT /:id` |
| chat | `/api/chat` | `GET /rooms`, `GET /rooms/:id/messages` + WebSocket |
| notification | `/api/notifications` | `GET /`, `PUT /:id/read` |
| admin | `/api/admin` | `GET /users`, `PUT /users/:id`, `GET /reports` |
| resolution | `/api/resolutions` | `POST /`, `PUT /:id` |
| search | `/api/search` | `GET /?q=keyword` |

---

## Authentication Flow

1. User registers → email verification sent via Nodemailer
2. User verifies email → account activated
3. Login returns: **access token** (stored in memory) + **refresh token** (httpOnly cookie)
4. All protected API calls include `Authorization: Bearer <access_token>`
5. On expiry, frontend silently refreshes using the cookie

Google OAuth: `/api/auth/google` → callback → redirect to `/auth/success` → tokens issued

