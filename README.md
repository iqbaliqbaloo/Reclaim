# Reclaim
# Reclaim — Lost & Found Platform

A web platform where people who lost something and people who 
found something can connect safely and return items to their owners.

## What it does
- Post a lost item or a found item
- AI automatically matches lost posts with found posts
- Claimant writes a description to prove ownership
- Owner approves the claim
- Private chat opens (max 30 messages each)
- Both confirm return — item resolved

## Tech stack
- Frontend: React, Tailwind CSS, Axios, Leaflet.js
- Backend: Node.js, Express, PostgreSQL (raw pg), MongoDB (auth only)
- Auth: JWT + Google OAuth
- Real-time: WebSocket
- Images: S3/MinIO with PostgreSQL fallback
- Testing: Jest + Supertest

## Services
| Service | Port | DB |
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

## Quick start
See SETUP.md for full instructions.

## License
MIT
