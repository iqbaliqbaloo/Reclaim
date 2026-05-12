# Reclaim — Lost & Found Platform

A web platform where people who found something can post it,
and people who lost something can find it and claim it back safely.

## How it works

1. Found user posts a found item (photo, location, description)
2. Lost user posts a lost item (photo, location, description)
3. AI automatically matches lost posts with found posts
4. Lost user sees a matching found post and clicks Claim
5. Lost user writes a description proving the item is theirs
6. Found user reads the description and approves or rejects
7. If approved — private chat opens between both users
8. They arrange the return in real life
9. Both confirm the item was returned
10. Listing marked as resolved

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Axios, Leaflet.js, socket.io-client |
| Backend | Node.js, Express, PostgreSQL (raw pg), MongoDB (auth only) |
| Auth | JWT (access 15min + refresh 7days) + Google OAuth 2.0 |
| Real-time | WebSocket (ws library) |
| Images | S3/MinIO with PostgreSQL bytea fallback |
| Email | Nodemailer / SendGrid |
| Testing | Jest + Supertest (TDD — Red Green Refactor) |
| Dev infra | Docker Compose |

## Services

| Service | Port | Database |
|---|---|---|
| auth-service | 4001 | MongoDB |
| user-service | 4002 | PostgreSQL |
| listing-service | 4003 | PostgreSQL |
| media-service | 4004 | S3 + PostgreSQL |
| match-service | 4005 | PostgreSQL |
| claim-service | 4006 | PostgreSQL |
| chat-service | 4007 | PostgreSQL |
| notification-service | 4008 | PostgreSQL |
| search-service | 4009 | PostgreSQL |
| admin-service | 4010 | PostgreSQL |
| resolution-service | 4011 | PostgreSQL |

## User roles

| Role | What they can do |
|---|---|
| visitor | Browse listings only |
| user | Post lost/found, claim found items, chat, confirm return |
| admin | Remove listings, ban users, resolve disputes |

## Quick start

See [SETUP.md](./SETUP.md) for full instructions.

## Project structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full structure.

## License

MIT