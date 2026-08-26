# PE Falcon Safaris

Tour website for PE Falcon Safaris — Kenya safari adventures.

## Tech stack

| Layer | Technology |
|-------|------------|
| Client (public site) | React, Next.js, Tailwind CSS |
| Admin site | React, Next.js |
| Backend | Supabase (Auth, Database, Storage, Edge Functions) |

## Project structure

```
pe-falcon-safaris/
├── client/           # Public website (Next.js)
├── admin/            # Admin dashboard (Next.js)
├── supabase/         # Supabase Edge Functions and migrations
└── scripts/          # Development and deployment scripts
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)

## Database setup

The database is hosted on Supabase. Run migrations using the Supabase CLI:

```bash
cd supabase
supabase db push
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
| Admin | http://localhost:3001 |

PowerShell versions are also available in `scripts/` if your execution policy allows them, or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
```

Logs (PowerShell scripts only): `scripts/logs/client.log`, `scripts/logs/admin.log`.

## Manual start (optional)

### Start the client

```bash
cd client
npm run dev
```

Client runs at [http://localhost:3000](http://localhost:3000).

### Start the admin

```bash
cd admin
npm run dev
```

Admin runs at [http://localhost:3001](http://localhost:3001).

## Email verification

After registration, users receive a verification email before they can sign in. Verification links expire after 24 hours.

Emails are sent via the Supabase Edge Function `email` using the [Resend](https://resend.com) API.

### Development

Without Resend configured, emails are logged to the Edge Function console.

### Production

Set the Resend API key as a Supabase secret:

```bash
supabase secrets set RESEND_API_KEY=your-resend-api-key
```

## Edge Functions

Supabase Edge Functions handle:

| Function | Description |
|----------|-------------|
| `admin-users` | Admin user management (invite, resend-invite, accept-invite) |
| `email` | Send emails via Resend API |
| `mpesa` | M-Pesa Daraja API integration (STK push, callback, status) |
| `payments` | Payment processing |
| `bookings` | Booking management |
| `packages` | Package management |
| `admin` | Admin authentication |

Deploy Edge Functions:

```bash
cd scripts
powershell -ExecutionPolicy Bypass -File deploy-functions.ps1
```

## Environment variables

### Client (`client/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Admin (`admin/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase secrets (set via CLI)

```
RESEND_API_KEY=your-resend-api-key
MPESA_CONSUMER_KEY=your-mpesa-consumer-key
MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
MPESA_SHORTCODE=your-mpesa-shortcode
MPESA_PASSKEY=your-mpesa-passkey
MPESA_ENVIRONMENT=production|sandbox
```

## Current scope

- Public homepage with featured destinations
- User registration with email verification via Supabase Auth
- Client login with Supabase Auth sessions
- Package browsing and booking
- M-Pesa and card payment processing
- Admin dashboard for managing bookings, clients, and packages
