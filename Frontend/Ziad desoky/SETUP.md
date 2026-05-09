# GeoAttend Frontend — Setup Guide

## Quick Start

```bash
cd GeoAttend-fixed-connected
npm install
cp .env.example .env    # set VITE_API_URL
npm run dev
```

## .env

```env
VITE_API_URL=http://localhost:5000/api
```

Change the IP to your backend server if running on a different machine.

## How login works

1. Tries the real backend first (`VITE_API_URL/auth/login`)
2. Falls back to mock users if backend is unreachable

## Role mapping

| Frontend | Backend (Firestore) |
|---|---|
| DOCTOR | PROFESSOR |
| STUDENT | STUDENT |
| ADMIN | ADMIN |

The API layer handles the mapping automatically.
