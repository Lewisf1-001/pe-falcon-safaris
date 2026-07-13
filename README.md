# PE Falcon Safaris

Tour website for PE Falcon Safaris — Kenya safari adventures.

## Tech stack

| Layer | Technology |
|-------|------------|
| Client (public site) | React, Next.js, Tailwind CSS |
| Admin site | React, Next.js *(coming soon)* |
| API | Node.js, Express.js |
| Database | PostgreSQL |

## Project structure

```
pe-falcon-safaris/
├── client/           # Public website (Next.js)
├── server/           # Express API
├── admin/            # Admin dashboard (planned)
└── docker-compose.yml
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) 16+ **or** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Database setup

### Option A — Docker (recommended)

```bash
docker compose up -d
```

### Option B — Local PostgreSQL

Create a database named `pe_falcon_safaris` and update `server/.env` with your connection string.

## Run migrations

```bash
cd server
npm install
npm run db:migrate
```

## Start / stop dev servers

Use the `.cmd` scripts from the project root (no PowerShell execution policy required):

```cmd
start-dev.cmd
stop-dev.cmd
```

Or double-click `start-dev.cmd` / `stop-dev.cmd` in File Explorer.

| Service | URL |
|---------|-----|
| Client | http://localhost:3000 |
| API | http://localhost:4000 |

`start-dev.cmd` and `./start-servers.sh` open the client in your existing Chrome window and bring it to the front.

**One-time setup** (enables refreshing an existing `localhost:3000` tab instead of opening a new one):

```cmd
scripts\setup-chrome-debug.cmd
```

Then close Chrome completely and reopen it from the Start menu.

PowerShell versions are also available in `scripts/` if your execution policy allows them, or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

Logs (PowerShell scripts only): `scripts/logs/server.log`, `scripts/logs/client.log`.

## Manual start (optional)

### Start the API

```bash
cd server
npm run dev
```

API runs at [http://localhost:4000](http://localhost:4000).

### Start the client

```bash
cd client
npm run dev
```

Client runs at [http://localhost:3000](http://localhost:3000).

## Email verification

After registration, users receive a verification email before they can sign in. Verification links expire after 24 hours.

### Development

Without SMTP configured, the verification link is printed in the **server console** when someone registers.

### Production

Add SMTP settings to `server/.env`:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASS=your-password
SMTP_FROM=PE Falcon Safaris <noreply@pefalconsafaris.com>
```

Then run migrations if you have not already:

```bash
cd server
npm run db:migrate
```

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create a new user account (sends verification email) |
| POST | `/api/auth/login` | Sign in with email and password |
| GET | `/api/auth/me` | Get the current signed-in user (Bearer token) |
| GET | `/api/auth/verify-email?token=...` | Verify a user's email address |

### Register request body

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "securepassword",
  "confirmPassword": "securepassword"
}
```

## Current scope

- Public homepage with featured destinations
- User registration page wired to Express + PostgreSQL
- Email verification after registration
- Client login with JWT session
